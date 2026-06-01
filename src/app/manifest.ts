import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'BALLOUT',
    short_name: 'BALLOUT',
    description: 'Platform Lelongan & Tukar Barang #1 Malaysia',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    theme_color: '#14b8a6',
    background_color: '#0a0a0f',
    categories: ['shopping', 'lifestyle'],
    icons: [
      { src: '/api/pwa-icon?size=192', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/api/pwa-icon?size=192', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/api/pwa-icon?size=512', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/api/pwa-icon?size=512', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'Lelong Pantas', short_name: 'Flash', url: '/listings?mode=flash', description: 'Semak lelongan aktif' },
      { name: 'Jual Sekarang', short_name: 'Jual', url: '/sell', description: 'Letak listing baru' },
    ],
  }
}
