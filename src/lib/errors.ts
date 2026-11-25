const NETWORK = /failed to fetch|networkerror|network request failed|load failed|timeout|fetch/i
const SPANISH = /[áéíóúñ¿¡]|^(Falta|Ya |No |Esa |El |La |Ponle )/

function messageOf(error: unknown) {
  if (error instanceof Error) return error.message
  if (typeof error === 'object' && error && 'message' in error) {
    return String((error as { message: unknown }).message)
  }
  return ''
}

/**
 * Short Spanish copy for a toast. Network failures say so; the app's own
 * Spanish messages pass through; raw English library errors become `fallback`.
 */
export function friendlyError(error: unknown, fallback: string) {
  const message = messageOf(error)
  if (navigator.onLine === false || NETWORK.test(message)) return `${fallback}: sin conexión`
  if (SPANISH.test(message)) return message
  return fallback
}
