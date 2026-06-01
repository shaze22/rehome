import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Daftar Akaun',
  description: 'Cipta akaun BALLOUT percuma dan mula jual, beli, dan tukar barangan terpakai di Malaysia.',
}

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
