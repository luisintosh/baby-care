const PATTERNS = {
  tap: 12,
  success: [18, 40, 18],
  error: [60, 40, 60],
} as const

/** A short buzz where the browser supports it (Android). iOS Safari has no vibrate. */
export function haptic(kind: keyof typeof PATTERNS) {
  try {
    navigator.vibrate?.(PATTERNS[kind] as number | number[])
  } catch {
    // Some browsers throw when vibration is blocked; feedback is optional.
  }
}
