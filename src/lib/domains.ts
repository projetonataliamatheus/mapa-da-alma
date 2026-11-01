/**
 * Domínios próprios: o painel, o checkout e as prévias podem ter endereço próprio
 * (ex.: painel.suaempresa.com.br, pagar.suaempresa.com.br, sites.suaempresa.com.br).
 * O sistema mostra os registros DNS, confere se o DNS já aponta para a VPS e se o HTTPS responde.
 */
import { promises as dns } from 'dns';
import { admin } from './supabase/admin';
import { appBase } from './util';
import { getSettings } from './settings';

const db = () => admin();
/** [chave, nome, para que serve, ícone] — um produto por linha no mapa de endereços. */
export const ROLES: [string, string, string, string?][] = [
  ['painel', 'Painel da equipe', 'Login e todo o sistema da equipe', 'radar'],
  ['checkout', 'Checkout', 'Links de pagamento (/pagar/…)', 'money'],
  ['previa', 'Prévias de site', 'Prévias de site enviadas aos clientes (/previa/…)', 'globe'],
  ['bio', 'Link na bio', 'Páginas dos clientes (olinks.com.br/empresa)', 'link'],
  ['packs', 'Packs Canva', 'Galerias de prévia dos packs (packs.suaagencia.com.br/nicho)', 'spark'],
  ['catalogo', 'Catálogo digital', 'Cardápios e catálogos com QR Code (dominio.com/loja)', 'book'],
  ['orcamento', 'Orçamentos', 'Orçamentos por link (orcamento.suaagencia.com.br/cliente)', 'file'],
  ['relatorio', 'Relatórios de tráfego', 'Relatórios para os clientes (relatorio.suaagencia.com.br/cliente)', 'trend'],
];

/** Subdomínio "dono" de cada função: quando existe, ele tem prioridade (ex.: pagamento. para o checkout). */
const PREF: Record<string, string> = { checkout: 'pagamento', previa: 'previa', catalogo: 'catalogo', orcamento: 'orcamento', relatorio: 'relatorio', packs: 'packs' };

export function cleanHost(raw: string) {
  return String(raw || '')
    .trim()
    .toLowerCase()
    // espaço digitado sem querer ("sistema. agencia.com.br") e acento/caractere invisível
    .replace(/\s+/g, '')
    .replace(/[\u200b-\u200d\ufeff]/g, '')
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
    .replace(/:\d+$/, '')
    .replace(/\.$/, '');
}

export function validHost(h: string) {
  return /^(?=.{4,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/.test(h);
}

/** Domínio raiz (ex.: suaempresa.com.br) ou subdomínio (painel.suaempresa.com.br)? */
export function splitHost(h: string) {
  const parts = h.split('.');
  const twoLevel = /\.(com|net|org|gov|edu|art|blog|eco|eng|ind|inf|med|adv|arq|tur|app|dev)\.br$/.test(h) || /\.(co|com)\.(uk|pt|ar|mx)$/.test(h);
  const rootLen = twoLevel ? 3 : 2;
  const root = parts.slice(-rootLen).join('.');
  const sub = parts.slice(0, -rootLen).join('.');
  return { root, sub, isRoot: !sub };
}

/** Endereço atual do sistema (o do Easypanel) e o IP da VPS. */
export async function target() {
  const base = appBase();
  const baseHost = base ? new URL(base).host : '';
  let ip = process.env.SERVER_IP || '';
  if (!ip && baseHost) ip = (await dns.resolve4(baseHost).catch(() => []))[0] || '';
  return { baseHost, ip };
}

/** Registros que você cria no site onde comprou o domínio (Registro.br, Hostinger, GoDaddy, Cloudflare…). */
export async function dnsRecords(host: string) {
  const { baseHost, ip } = await target();
  const { sub, isRoot, root } = splitHost(host);
  const recs: { tipo: string; nome: string; valor: string; obs?: string }[] = [];
  if (isRoot) {
    recs.push({ tipo: 'A', nome: '@', valor: ip || 'IP da VPS', obs: 'Domínio principal' });
    recs.push({ tipo: 'CNAME', nome: 'www', valor: host, obs: 'Opcional: para o www também abrir' });
  } else {
    recs.push({ tipo: 'A', nome: sub, valor: ip || 'IP da VPS', obs: `Recomendado (em ${root})` });
    if (baseHost) recs.push({ tipo: 'CNAME', nome: sub, valor: baseHost, obs: 'Alternativa ao A (use só um dos dois)' });
  }
  return recs;
}

/** Confere DNS e HTTPS do domínio. */
export async function checkDomain(host: string) {
  const { baseHost, ip } = await target();
  let found: string[] = [];
  let dnsOk = false;
  try {
    const a = await dns.resolve4(host).catch(() => [] as string[]);
    found = a;
    if (ip && a.includes(ip)) dnsOk = true;
    if (!dnsOk) {
      const c = await dns.resolveCname(host).catch(() => [] as string[]);
      if (c.length) found = [...found, ...c.map((x) => 'CNAME ' + x)];
      if (baseHost && c.some((x) => x.replace(/\.$/, '') === baseHost)) dnsOk = true;
    }
  } catch {}
  let httpsOk = false;
  let error: string | null = null;
  if (dnsOk) {
    try {
      const r = await fetch(`https://${host}/api/domain-check`, { signal: AbortSignal.timeout(10000), cache: 'no-store' });
      const j: any = await r.json().catch(() => null);
      httpsOk = !!j?.radar;
      if (!httpsOk) error = 'O DNS já aponta para a VPS, mas o domínio ainda não foi adicionado no Easypanel (Domínios).';
    } catch (e: any) {
      error = /certificate|SSL|TLS|CERT/i.test(String(e?.cause?.code || e?.message))
        ? 'O DNS está certo; o certificado HTTPS ainda está sendo emitido (até 10 minutos depois de adicionar no Easypanel).'
        : `O DNS já aponta para a VPS, mas o domínio ainda não responde. Adicione no Easypanel › radar › painel › Domínios. (${String(e?.cause?.code || e?.name || '').slice(0, 40)})`;
    }
  } else {
    error = found.length ? `O DNS aponta para ${found.join(', ')} (deveria ser ${ip || baseHost}). Corrija no site do domínio.` : 'O DNS ainda não foi encontrado. Depois de criar o registro, pode levar de 5 minutos a algumas horas.';
  }
  const row = { host, dns_ok: dnsOk, https_ok: httpsOk, dns_found: found.join(', ') || null, last_check: new Date().toISOString(), error: httpsOk ? null : error };
  await db().from('domains').update(row).eq('host', host);
  return row;
}

/** Aplica os domínios ativos nas configurações (checkout e prévias passam a usar o domínio próprio). */
export async function applyDomains() {
  const { data } = await db().from('domains').select('*');
  const ok = (data || []).filter((d: any) => d.https_ok);
  const pick = (role: string) => {
    const list = ok.filter((d: any) => (d.roles || []).includes(role));
    return (list.find((d: any) => PREF[role] && String(d.host).startsWith(PREF[role] + '.')) || list[0])?.host || null;
  };
  const s: any = await getSettings(db());
  const domains = Object.fromEntries(ROLES.map(([k]) => [k, pick(k)]));
  const { data: row } = await db().from('settings').select('data').eq('id', 1).maybeSingle();
  const cur = (row as any)?.data || {};
  await db().from('settings').upsert({ id: 1, data: { ...cur, domains } });
  return { ...domains, before: s.domains || null };
}
