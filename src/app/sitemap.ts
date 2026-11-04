import type { MetadataRoute } from 'next'
import { siteUrl } from '@/lib/site'

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl()
  return [{ url: `${base}/mapa-astral`, lastModified: new Date('2026-11-04'), changeFrequency: 'weekly', priority: 1 }]
}
