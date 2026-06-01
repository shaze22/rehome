import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const title = searchParams.get('title') ?? 'Platform Lelongan & Tukar Barang Malaysia'
  const subtitle = searchParams.get('subtitle') ?? 'Barangan terpakai · Escrow selamat · AI pricing'
  const price = searchParams.get('price')
  const mode = searchParams.get('mode') ?? 'flash'

  const accentColor = mode === 'swap' ? '#16a34a' : '#14b8a6'

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#0a0a0f',
          padding: '60px',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Top accent bar */}
        <div style={{ width: '80px', height: '6px', backgroundColor: accentColor, borderRadius: '3px', marginBottom: '40px' }} />

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
          <div style={{ fontSize: '28px', fontWeight: 700, color: accentColor }}>⚡ BALLOUT</div>
          {mode === 'swap' && (
            <div style={{ fontSize: '14px', padding: '4px 12px', backgroundColor: 'rgba(22,163,74,0.2)', color: '#16a34a', borderRadius: '20px', border: '1px solid rgba(22,163,74,0.4)' }}>
              Tukar Barang
            </div>
          )}
        </div>

        {/* Title */}
        <div style={{ fontSize: '52px', fontWeight: 800, color: '#e2e8f0', lineHeight: 1.15, marginBottom: '20px', maxWidth: '900px' }}>
          {title.length > 60 ? title.slice(0, 57) + '...' : title}
        </div>

        {/* Price */}
        {price && (
          <div style={{ fontSize: '40px', fontWeight: 700, color: accentColor, marginBottom: '20px', fontFamily: 'monospace' }}>
            {price}
          </div>
        )}

        {/* Subtitle */}
        <div style={{ fontSize: '22px', color: '#64748b', marginTop: 'auto' }}>
          {subtitle}
        </div>

        {/* Bottom bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '32px', paddingTop: '24px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ fontSize: '18px', color: '#475569' }}>rehome-eta.vercel.app</div>
          <div style={{ fontSize: '18px', color: '#475569' }}>Ekonomi Pekeliling Malaysia 🌱</div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  )
}
