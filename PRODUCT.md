# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Luis and Clau are the only users. They are the two caregivers of one baby. Each uses Baby on a phone, including at night and during handoffs. A session starts by choosing their name and the shared date. That session stays on the phone until they tap the name.

## Product Purpose

Baby is the shared care log for that one baby. It lets either caregiver record a feed, a diaper, sleep, or medicine, and lets the other see the same timeline without asking. It also says when the next feed is due and can nudge with the phone locked.

Success means two things at once: neither person has to ask what just happened, and a feed is not missed because the interval lived only in someone’s head.

## Positioning

One shared log, two fixed caregivers, one shared date that opens either account, plus a next-feed time from a shared day and night interval both caregivers can change. A personal journal or a multi-child family product could not truthfully make that claim.

## Operating Context

The real surface is a phone, portrait, installable from the browser. The interface is Spanish (Mexico). Clocks and the day/night split use America/Mexico_City. Day is 07:00–22:00; everything else is night.

A session starts by choosing Luis or Clau and the date. That name is how each event and each completed aviso is signed. The session stays on the phone until the name is tapped.

Logging happens on Registrar. Four actions: Comida, Popó, Sueño, Medicina. Comida and Popó log in one tap. Medicina asks for a note. Sueño opens an interval and closes it later; only one sleep can be open. The clock can be moved off “now” to backdate a log. A fresh log can be undone. The timeline is the handoff: the other person’s events are already there.

Métricas shows the current state (last feed, last diaper, sleep, last medicine), today’s counts, and a 7-day trend once there is enough history.

Avisos are dated reminders with a start and end, separate from feed nudges. Either caregiver can mark one done.

The next feed is the last logged feed plus the configured interval for that period: one schedule for day and one for night (from 22:00). The default is 4 hours by day and 5 hours by night; either caregiver can change both from Registrar. A push says the feed is due, and a follow-up arrives 30 minutes later if that feed is still unlogged. On iPhone, push requires the app on the Home Screen.

## Capabilities and Constraints

Confirmed:

- Caregivers stay Luis and Clau. One baby. No extra people, no second child.
- Two accounts share one date passphrase. A session is required to read or write the log.
- Spanish (Mexico), Mexico City clock, phone-first installable web app.
- Do not invent a baby name, age, weight, or medical advice.
- Event kinds are feed, poop, sleep, and medicine. Sleep is the only kind with an end time.
- The shared log and the next-feed nudge are both the product. Dated avisos support care; they are not a substitute for the feed nudge.

## Brand Commitments

The product name is Baby. The interface speaks informal Spanish, in the tú form, in short sentences. PWA icons and `public/logo.svg` already exist. No separate personality, palette, or type direction was set here.

## Evidence on Hand

The app, its Spanish copy, and the Supabase schema are the record. There is no baby name, age, weight, photo, testimonial, or medical guidance in the project. Do not fabricate any of them.

## Product Principles

1. One log, two people. Either caregiver can write, and both read the same events.
2. The handoff is the job. The other person should not have to be asked what happened.
3. The next feed comes from the shared day and night schedule, and the nudge still arrives with the phone locked.
4. The signed-in name is the identity. Two accounts, no extra caregivers, no second baby.
5. Record care. Do not name the baby, estimate growth, or give medical advice.
