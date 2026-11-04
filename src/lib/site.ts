/** Endereço público do site (para canonical, sitemap e robots). Defina SITE_URL no Easypanel quando tiver domínio próprio. */
export const siteUrl = () => String(process.env.SITE_URL || process.env.APP_URL || 'http://localhost:3000').replace(/\/+$/, '')
