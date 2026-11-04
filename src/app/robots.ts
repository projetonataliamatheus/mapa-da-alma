import type { MetadataRoute } from 'next'
import { siteUrl } from '@/lib/site'

export default function robots(): MetadataRoute.Robots {
  const base = siteUrl()
  return {
    rules: [{ userAgent: '*', allow: ['/mapa-astral'], disallow: ['/api/', '/mapa/', '/taro/', '/pagar', '/previa', '/amostra/', '/login', '/cliente', '/contrato/', '/orcamento/', '/relatorio/', '/c/', '/l/', '/p/', '/site/'] }],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  }
}
