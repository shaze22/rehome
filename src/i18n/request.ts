import { getRequestConfig } from 'next-intl/server'
import { cookies } from 'next/headers'
import { locales, defaultLocale } from './routing'

export default getRequestConfig(async () => {
  const cookieStore = await cookies()
  const raw = cookieStore.get('kassim_locale')?.value ?? defaultLocale
  const locale = (locales as readonly string[]).includes(raw) ? raw : defaultLocale

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  }
})
