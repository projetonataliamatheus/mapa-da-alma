import type { MetadataRoute } from 'next'
import { siteUrl } from '@/lib/site'

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl()
  const br = String(process.env.MAPA_HOST_BR || '').trim()
  const extra: MetadataRoute.Sitemap = br && base.includes(br) ? [{ url: `${base}/`, lastModified: new Date('2026-11-05'), changeFrequency: 'weekly', priority: 1 }] : []
  if (extra.length) return extra
  return [{ url: `${base}/mapa-astral`, lastModified: new Date('2026-11-04'), changeFrequency: 'weekly', priority: 1 }]
}
