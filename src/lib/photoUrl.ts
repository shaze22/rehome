import { z } from 'zod'

// Only accept photos that live in KASSIM's own storage bucket. Used everywhere a
// user-supplied photo URL is stored or server-fetched — blocks arbitrary external
// URLs (SSRF / off-platform image hosting / tracking pixels).
export const trustedPhotoUrl = z.string().url().refine((url) => {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL
  return base ? url.startsWith(`${base}/storage/v1/object/public/rehome-photos/`) : true
}, { message: 'Photos must be uploaded to KASSIM.' })
