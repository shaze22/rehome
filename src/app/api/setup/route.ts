import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// One-time setup route — creates Supabase storage bucket
// Call: GET /api/setup?secret=your-cron-secret
export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get('secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const results: Record<string, string> = {}

  // Create storage bucket
  const { error: bucketError } = await supabase.storage.createBucket('rehome-photos', {
    public: true,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'],
    fileSizeLimit: 5 * 1024 * 1024, // 5MB
  })
  results.bucket = bucketError?.message === 'The resource already exists'
    ? 'already exists'
    : bucketError
    ? `error: ${bucketError.message}`
    : 'created'

  return NextResponse.json({ success: true, results })
}
