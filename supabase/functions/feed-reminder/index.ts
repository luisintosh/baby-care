import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2'
import * as webpush from 'jsr:@negrel/webpush@0.5.0'
import {
  DEFAULT_FEED_INTERVALS,
  dueFeedAlert,
  nextFeed,
  type FeedAlert,
  type FeedAlertState,
  type FeedIntervals,
  type FeedPoint,
} from '../../../src/lib/feed-schedule.ts'

type SubscriptionRow = {
  endpoint: string
  p256dh: string
  auth: string
}

function serviceRoleKey() {
  const raw = Deno.env.get('SUPABASE_SECRET_KEYS')
  if (raw) {
    const parsed = JSON.parse(raw) as Record<string, string>
    if (parsed.default) return parsed.default
    const first = Object.values(parsed).find((value) => value.length > 0)
    if (first) return first
  }
  const legacy = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (legacy) return legacy
  throw new Error('Missing service role key')
}

function secretsMatch(leftValue: string, rightValue: string) {
  const encoder = new TextEncoder()
  const left = encoder.encode(leftValue)
  const right = encoder.encode(rightValue)
  const length = Math.max(left.length, right.length)
  let diff = left.length ^ right.length
  for (let index = 0; index < length; index += 1) {
    diff |= (left[index] ?? 0) ^ (right[index] ?? 0)
  }
  return diff === 0
}

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')
}

function base64UrlToBytes(value: string) {
  const padded = value.replaceAll('-', '+').replaceAll('_', '/') + '='.repeat((4 - (value.length % 4)) % 4)
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
  return bytes
}

async function applicationServer() {
  const publicKey = Deno.env.get('VAPID_PUBLIC_KEY')
  const privateKey = Deno.env.get('VAPID_PRIVATE_KEY')
  const subject = Deno.env.get('VAPID_SUBJECT')
  if (!publicKey || !privateKey || !subject) throw new Error('Missing VAPID secrets')

  const rawPublic = base64UrlToBytes(publicKey)
  if (rawPublic.length !== 65 || rawPublic[0] !== 4) {
    throw new Error('VAPID_PUBLIC_KEY must be the uncompressed P-256 key')
  }
  const x = bytesToBase64Url(rawPublic.slice(1, 33))
  const y = bytesToBase64Url(rawPublic.slice(33, 65))
  const d = bytesToBase64Url(base64UrlToBytes(privateKey))
  const vapidKeys = await webpush.importVapidKeys({
    publicKey: { kty: 'EC', crv: 'P-256', x, y },
    privateKey: { kty: 'EC', crv: 'P-256', x, y, d },
  })
  return webpush.ApplicationServer.new({
    contactInformation: subject,
    vapidKeys,
  })
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

async function claim(supabase: SupabaseClient, alert: FeedAlert) {
  const filter =
    alert.kind === 'due'
      ? supabase
          .from('feed_alert_state')
          .update({ notified_feed_id: alert.feedId })
          .eq('id', 1)
          .or(`notified_feed_id.is.null,notified_feed_id.neq.${alert.feedId}`)
      : supabase
          .from('feed_alert_state')
          .update({ followup_feed_id: alert.feedId })
          .eq('id', 1)
          .eq('notified_feed_id', alert.feedId)
          .or(`followup_feed_id.is.null,followup_feed_id.neq.${alert.feedId}`)

  const { data, error } = await filter.select('id')
  if (error) throw error
  return (data?.length ?? 0) > 0
}

async function release(supabase: SupabaseClient, alert: FeedAlert) {
  const patch =
    alert.kind === 'due' ? { notified_feed_id: null } : { followup_feed_id: null }
  const column = alert.kind === 'due' ? 'notified_feed_id' : 'followup_feed_id'
  const { error } = await supabase
    .from('feed_alert_state')
    .update(patch)
    .eq('id', 1)
    .eq(column, alert.feedId)
  if (error) throw error
}

function pushStatus(error: unknown) {
  if (error instanceof webpush.PushMessageError) return error.response.status
  return null
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const cronSecret = Deno.env.get('CRON_SECRET')
  const provided = req.headers.get('x-cron-secret') ?? ''
  if (!cronSecret || !secretsMatch(provided, cronSecret)) return json({ error: 'Unauthorized' }, 401)

  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', serviceRoleKey(), {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const { data: subscriptions, error: subscriptionError } = await supabase
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
    if (subscriptionError) throw subscriptionError
    const targets = (subscriptions ?? []) as SubscriptionRow[]
    if (targets.length === 0) return json({ sent: false, reason: 'no-subscriptions' })

    const now = new Date()
    const [latestResult, scheduleResult, stateResult] = await Promise.all([
      supabase
        .from('events')
        .select('id, occurred_at')
        .eq('kind', 'feed')
        .lte('occurred_at', now.toISOString())
        .order('occurred_at', { ascending: false })
        .limit(1),
      supabase
        .from('feed_schedule')
        .select('day_minutes, night_minutes')
        .eq('id', 1)
        .maybeSingle(),
      supabase
        .from('feed_alert_state')
        .select('notified_feed_id, followup_feed_id')
        .eq('id', 1)
        .maybeSingle(),
    ])
    if (latestResult.error) throw latestResult.error
    if (scheduleResult.error) throw scheduleResult.error
    if (stateResult.error) throw stateResult.error

    const latest = latestResult.data?.[0]
    const points: FeedPoint[] = latest
      ? [{ id: latest.id, occurredAt: new Date(latest.occurred_at) }]
      : []
    const intervals: FeedIntervals = scheduleResult.data
      ? {
          dayMinutes: scheduleResult.data.day_minutes,
          nightMinutes: scheduleResult.data.night_minutes,
        }
      : DEFAULT_FEED_INTERVALS
    const state: FeedAlertState = {
      notifiedFeedId: stateResult.data?.notified_feed_id ?? null,
      followupFeedId: stateResult.data?.followup_feed_id ?? null,
    }
    const alert = dueFeedAlert(nextFeed(points, intervals, now), state, now)
    if (!alert) return json({ sent: false, reason: 'not-due' })

    const server = await applicationServer()
    const claimed = await claim(supabase, alert)
    if (!claimed) return json({ sent: false, reason: 'already-claimed' })

    const payload = JSON.stringify({ title: alert.title, body: alert.body, tag: alert.tag })
    let delivered = 0
    const gone: string[] = []

    for (const target of targets) {
      try {
        await server
          .subscribe({
            endpoint: target.endpoint,
            keys: { p256dh: target.p256dh, auth: target.auth },
          })
          .pushTextMessage(payload, {
            urgency: webpush.Urgency.High,
            topic: alert.tag,
          })
        delivered += 1
      } catch (error) {
        const status = pushStatus(error)
        if (status === 404 || status === 410) gone.push(target.endpoint)
        else console.error('push failed', status, error)
      }
    }

    if (gone.length > 0) {
      const { error: deleteError } = await supabase
        .from('push_subscriptions')
        .delete()
        .in('endpoint', gone)
      if (deleteError) console.error('failed to drop subscriptions', deleteError.message)
    }

    if (delivered === 0) {
      await release(supabase, alert)
      return json({ sent: false, reason: 'all-failed', removed: gone.length })
    }

    return json({ sent: true, delivered, removed: gone.length, kind: alert.kind })
  } catch (error) {
    console.error(error)
    return json({ error: error instanceof Error ? error.message : 'Feed reminder failed' }, 500)
  }
})
