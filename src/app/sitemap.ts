import type { MetadataRoute } from 'next'
import { prisma } from '@/lib/prisma'

const BASE = process.env.NEXT_PUBLIC_APP_URL ?? 'https://kassim.app'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const activeListings = await prisma.listing.findMany({
    where: { status: 'ACTIVE' },
    select: { id: true, updatedAt: true },
    orderBy: { updatedAt: 'desc' },
    take: 500,
  }).catch(() => [])

  const listingUrls: MetadataRoute.Sitemap = activeListings.map(l => ({
    url: `${BASE}/listings/${l.id}`,
    lastModified: l.updatedAt,
    changeFrequency: 'hourly',
    priority: 0.8,
  }))

  return [
    { url: BASE, lastModified: new Date(), changeFrequency: 'hourly', priority: 1 },
    { url: `${BASE}/listings`, lastModified: new Date(), changeFrequency: 'hourly', priority: 0.9 },
    { url: `${BASE}/listings?mode=swap`, lastModified: new Date(), changeFrequency: 'hourly', priority: 0.9 },
    { url: `${BASE}/impact`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.5 },
    ...listingUrls,
  ]
}
