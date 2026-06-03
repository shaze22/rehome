import * as Sentry from '@sentry/nextjs'

export function setSentryUser(id: string, email: string, name?: string | null) {
  Sentry.setUser({ id, email, username: name ?? undefined })
}

export function clearSentryUser() {
  Sentry.setUser(null)
}
