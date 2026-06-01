import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Log Masuk',
  description: 'Log masuk ke akaun BALLOUT anda untuk mula membida dan menjual barangan terpakai.',
}

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
