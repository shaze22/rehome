import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

export async function GET(request: NextRequest) {
  const size = parseInt(request.nextUrl.searchParams.get('size') ?? '192')
  const validSize = [192, 512].includes(size) ? size : 192

  const fontSize = Math.round(validSize * 0.45)
  const borderRadius = Math.round(validSize * 0.22)

  return new ImageResponse(
    (
      <div
        style={{
          width: validSize,
          height: validSize,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0a0a0f 0%, #0f1a1a 100%)',
          borderRadius,
        }}
      >
        {/* Teal glow circle */}
        <div
          style={{
            position: 'absolute',
            width: validSize * 0.7,
            height: validSize * 0.7,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(20,184,166,0.25) 0%, transparent 70%)',
            display: 'flex',
          }}
        />
        {/* Lightning bolt ⚡ as text */}
        <div
          style={{
            fontSize,
            fontWeight: 900,
            color: '#14b8a6',
            lineHeight: 1,
            display: 'flex',
          }}
        >
          ⚡
        </div>
      </div>
    ),
    { width: validSize, height: validSize }
  )
}
