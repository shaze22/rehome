export const locales = ['en', 'ms', 'id', 'zh', 'ar'] as const
export type Locale = (typeof locales)[number]
export const defaultLocale: Locale = 'en'
