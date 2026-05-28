import Link from 'next/link'
import { Recycle, Leaf, Shield, Zap } from 'lucide-react'

export function Footer() {
  return (
    <footer style={{ backgroundColor: 'var(--bg-card)', borderTop: '1px solid var(--border)' }} className="mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center gradient-teal">
                <Recycle className="w-4 h-4 text-white" />
              </div>
              <span className="text-xl font-bold" style={{ color: 'var(--teal)' }}>REHOME</span>
            </div>
            <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
              Platform ekonomi pekeliling Malaysia. Beri barangan anda kehidupan baharu melalui lelongan progresif yang selamat dan telus.
            </p>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--green)' }}>
                <Leaf className="w-3.5 h-3.5" />
                Eco-friendly
              </div>
              <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--teal)' }}>
                <Shield className="w-3.5 h-3.5" />
                Selamat & Terjamin
              </div>
              <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--blue)' }}>
                <Zap className="w-3.5 h-3.5" />
                Masa Nyata
              </div>
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Platform</h4>
            <ul className="space-y-2">
              {[
                { href: '/listings', label: 'Semak Imbas' },
                { href: '/sell', label: 'Jual Barangan' },
                { href: '/dashboard', label: 'Dashboard' },
              ].map(link => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm transition-colors hover:text-teal" style={{ color: 'var(--text-secondary)' }}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Akaun</h4>
            <ul className="space-y-2">
              {[
                { href: '/auth/login', label: 'Log Masuk' },
                { href: '/auth/register', label: 'Daftar' },
              ].map(link => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm transition-colors hover:text-teal" style={{ color: 'var(--text-secondary)' }}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4" style={{ borderTop: '1px solid var(--border)' }}>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            © 2026 REHOME. Hak cipta terpelihara. Dibina untuk Malaysia yang lebih hijau.
          </p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            15% fi platform · Escrow selamat · IC disahkan
          </p>
        </div>
      </div>
    </footer>
  )
}
