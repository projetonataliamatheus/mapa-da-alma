// Impressão digital das variáveis NEXT_PUBLIC_* (elas ficam gravadas dentro do build do Next).
const c = require('crypto');
const e = Object.keys(process.env).filter((k) => k.startsWith('NEXT_PUBLIC_')).sort().map((k) => `${k}=${process.env[k]}`).join('\n');
process.stdout.write(c.createHash('sha1').update(e).digest('hex'));
