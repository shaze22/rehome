import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'KASSIM',
    short_name: 'KASSIM',
    description: 'Pre-loved marketplace for Malaysia: Flash Bid and Swap Bid',
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
      { name: 'Flash Bid', short_name: 'Flash', url: '/listings?mode=flash', description: 'Browse active auctions' },
      { name: 'Sell Now', short_name: 'Sell', url: '/sell', description: 'Create a new listing' },
    ],
  }
}
