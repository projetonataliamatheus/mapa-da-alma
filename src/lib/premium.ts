/**
 * Modelos premium (pasta "Modelos" do GitHub, gerados na Arena).
 *
 *  GitHub → sistema: syncTemplates() lê Modelos/<nome>/_build (compilado pelo GitHub Actions),
 *     guarda o HTML e a miniatura no Supabase e a IA classifica o nicho (uma vez por versão).
 *  Sistema → GitHub: importZip / renameTemplate / deleteTemplate viram commits na pasta Modelos.
 *  Na conversa: rankTemplates() sugere os modelos que servem para o nicho do cliente.
 *  Prévia: personalize() troca só o conteúdo (nome, cidade, contato, cores, textos) — o design fica igual.
 */
import { nicheKey } from './bio-icons';
import JSZip from 'jszip';
import { posix } from 'node:path';
import { admin } from './supabase/admin';
import { structured } from './ai';
import { embed, embedQuery } from './embed';
import { norm } from './util';
import { formatPhone } from './phone';
import { colorFrom, colorsFrom } from './preview';
import { ghConfig, ghConfigured, readFile, listTree, commit, repoTree, readBlob } from './github';

const db = () => admin();
const BUCKET = 'publico';

export function slugify(s: string) {
  return norm(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'modelo';
}

/* ---------------- GitHub → sistema ---------------- */

const CLASSIFY = {
  type: 'object',
  properties: {
    nicho: { type: 'string', description: 'Nicho principal em português, curto (ex.: "fisioterapia").' },
    nichos_compativeis: { type: 'array', items: { type: 'string' }, maxItems: 25, description: 'De 8 a 25 outros nichos e profissões que podem usar este mesmo modelo só trocando textos e fotos, inclusive sinônimos e variações do dia a dia (ex.: para fisioterapia: quiropraxia, pilates, osteopatia, RPG, clínica de reabilitação, massoterapia, acupuntura, terapeuta corporal).' },
    palavras_chave: { type: 'array', items: { type: 'string' }, maxItems: 30, description: 'Palavras que um cliente desse ramo usaria para descrever o que faz: serviços, produtos, público, termos populares e gírias do ramo.' },
    estilo: { type: 'string', description: 'Estilo visual em poucas palavras (ex.: "clean, verde-água, acolhedor").' },
    descricao: { type: 'string', description: '1 frase sobre o modelo para a equipe.' },
  },
  required: ['nicho', 'nichos_compativeis', 'palavras_chave', 'estilo', 'descricao'],
};

function summaryOf(c: any) {
  const pick = (o: any) => (o && typeof o === 'object' ? o : {});
  const parts = [
    pick(c.meta).title,
    pick(c.meta).description,
    pick(c.brand).name,
    pick(c.brand).tagline,
    pick(c.hero).title,
    ...(pick(c.services).items || []).map((s: any) => s?.title),
    ...(pick(c.audiences).items || []).map((s: any) => s?.title),
  ];
  return parts.filter(Boolean).join(' · ').slice(0, 3000);
}

/** Texto que representa o modelo na busca (nome, nichos, palavras, descrição e o conteúdo do site). */
function searchTextOf(t: any) {
  return [t.name, t.niche, ...(t.niches || []), ...(t.keywords || []), t.style, t.description, summaryOf(t.content || {})].filter(Boolean).join(' · ').slice(0, 4000);
}
const STOP = new Set(['para', 'com', 'que', 'uma', 'sobre', 'meu', 'minha', 'mais', 'como', 'quero', 'site', 'sites', 'voce', 'você', 'trabalho', 'empresa', 'negocio', 'negócio', 'tenho', 'faço', 'faco', 'pra', 'dos', 'das', 'nos', 'nas', 'tudo', 'bem', 'olá', 'ola', 'bom', 'dia', 'boa', 'tarde', 'noite', 'oi', 'informações', 'informacoes', 'isso', 'posso', 'ter', 'clientes', 'google', 'atrair', 'criar', 'apenas']);
const tokens = (t: string) => Array.from(new Set(norm(t).split(/[^a-z0-9]+/).filter((w) => w.length > 3 && !STOP.has(w))));

/**
 * Atualiza a "ficha de busca" dos modelos antigos (uma vez por modelo): classificação mais rica
 * (mais nichos parecidos e palavras do ramo) e o vetor de significado com o conteúdo do site.
 */
let reembedding: Promise<number> | null = null;
export function refreshTemplateSearch() {
  if (reembedding) return reembedding;
  reembedding = (async () => {
    const { data } = await db().from('premium_templates').select('slug,name,niche,niches,keywords,style,description,content,embed_v').eq('active', true).or('embed_v.is.null,embed_v.lt.2').limit(60);
    let n = 0;
    for (const t of data || []) {
      try {
        const cls = await classify(t.name, { nicho: t.niche }, t.content || {});
        const niches = Array.from(new Set([t.niche, cls.nicho, ...(t.niches || []), ...(cls.nichos_compativeis || [])].filter(Boolean).map((x: string) => String(x).toLowerCase().trim()))).slice(0, 30);
        const keywords = Array.from(new Set([...(t.keywords || []), ...(cls.palavras_chave || [])].map((x: string) => String(x).toLowerCase().trim()))).slice(0, 40);
        const row = { ...t, niches, keywords, style: t.style || cls.estilo, description: t.description || cls.descricao };
        const text = searchTextOf(row);
        const embedding = (await embed([text], 'passage'))[0];
        await db().from('premium_templates').update({ niches, keywords, style: row.style, description: row.description, embedding, search_text: text.slice(0, 4000), embed_v: 2 }).eq('slug', t.slug);
        n++;
      } catch {
        await db().from('premium_templates').update({ embed_v: 2 }).eq('slug', t.slug).then(() => {}, () => {});
      }
    }
    return n;
  })().finally(() => setTimeout(() => (reembedding = null), 60_000));
  return reembedding;
}

async function classify(name: string, hint: any, content: any) {
  try {
    return await structured<any>(
      'Você classifica modelos de site para pequenos negócios no Brasil. Responda em português.',
      `Modelo "${name}"${hint?.nicho ? ` (nicho informado: ${hint.nicho})` : ''}.\nResumo do conteúdo: ${summaryOf(content)}`,
      'classificar_modelo',
      CLASSIFY,
      600,
      { task: 'modelos' },
    );
  } catch {
    return { nicho: hint?.nicho || name, nichos_compativeis: [], palavras_chave: [], estilo: '', descricao: '' };
  }
}

async function upload(path: string, data: Buffer, type: string) {
  const { error } = await db().storage.from(BUCKET).upload(path, data, { contentType: type, upsert: true });
  if (error) throw new Error('Não consegui guardar o modelo: ' + error.message);
  return db().storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

/** Lê a pasta Modelos do GitHub e atualiza o painel (só baixa o que mudou). */
/** Assinatura do que mudou no GitHub para cada modelo (só relê o modelo quando ela muda). */
const ghSeen = new Map<string, string>();
let lastSync = 0;
let syncing: Promise<any> | null = null;

/**
 * GitHub → painel, gastando o mínimo do limite do GitHub (5.000 pedidos/hora):
 * 3 pedidos para ver a árvore inteira; só baixa arquivos dos modelos que mudaram.
 * Várias chamadas juntas (robô + telas abertas) viram uma só, e no máximo 1 a cada 20 s.
 */
export async function syncTemplates(force = false) {
  if (!ghConfigured()) return { ok: false, reason: 'sem GITHUB_TOKEN', changed: 0 };
  if (syncing) return syncing;
  if (!force && Date.now() - lastSync < 20_000) return { ok: true, changed: 0, skipped: true };
  syncing = doSync().finally(() => {
    lastSync = Date.now();
    syncing = null;
  });
  return syncing;
}

async function doSync() {
  const c = ghConfig();
  const tree = await repoTree();
  const pre = `${c.dir}/`;
  const files = new Map<string, string>();
  const dirSet = new Set<string>();
  for (const x of tree) {
    if (!x.path.startsWith(pre)) continue;
    const rest = x.path.slice(pre.length);
    const dir = rest.split('/')[0];
    if (!dir || dir.startsWith('.') || dir.startsWith('_')) continue;
    if (x.type === 'tree' && !rest.includes('/')) dirSet.add(dir);
    if (x.type === 'blob') {
      dirSet.add(dir);
      files.set(x.path, x.sha);
    }
  }
  const dirs = [...dirSet];
  const { data: rows } = await db().from('premium_templates').select('slug,hash,status,name,audience,family');
  const have = new Map((rows || []).map((r: any) => [r.slug, r]));
  let changed = 0;
  for (const dir of dirs) {
    const slug = dir;
    const base = `${c.dir}/${dir}`;
    const metaSha = files.get(`${base}/_build/meta.json`);
    const hintSha = files.get(`${base}/modelo.json`);
    const sig = `${metaSha || '-'}|${hintSha || '-'}`;
    const cur: any = have.get(slug);
    // nada mudou neste modelo desde a última vez: não gasta pedido nenhum
    if (cur && ghSeen.get(slug) === sig && cur.status !== 'compilando') continue;
    const hint = hintSha ? await readBlob(hintSha).then((b) => (b ? JSON.parse(b.toString('utf8')) : null)).catch(() => null) : null;
    if (!metaSha) {
      // ainda compilando (acabou de chegar)
      if (!cur) {
        await db().from('premium_templates').upsert({ slug, name: hint?.nome || dir, niche: hint?.nicho || null, status: 'compilando', build_ok: false, updated_at: new Date().toISOString() });
        changed++;
      }
      ghSeen.set(slug, sig);
      continue;
    }
    const metaBuf = await readBlob(metaSha);
    if (!metaBuf) continue;
    const meta = JSON.parse(metaBuf.toString('utf8'));
    const audience = audienceOf(hint?.publico);
    const family = hint?.base || null;
    if (cur && cur.hash === meta.hash && cur.status !== 'compilando' && cur.name === (hint?.nome || cur.name)) {
      if ((cur.audience || null) !== audience || (cur.family || null) !== family) {
        await db().from('premium_templates').update({ audience, family }).eq('slug', slug);
        changed++;
      }
      ghSeen.set(slug, sig);
      continue;
    }
    if (!meta.ok) {
      await db().from('premium_templates').upsert({ slug, name: hint?.nome || cur?.name || dir, hash: meta.hash, build_ok: false, build_error: meta.error, status: 'erro', updated_at: new Date().toISOString() });
      ghSeen.set(slug, sig);
      changed++;
      continue;
    }
    const sh = (f: string) => files.get(`${base}/_build/${f}`);
    const [html, thumb, json] = await Promise.all([sh('index.html') ? readBlob(sh('index.html')!) : null, sh('thumb.jpg') ? readBlob(sh('thumb.jpg')!) : null, sh('content.json') ? readBlob(sh('content.json')!) : null]);
    if (!html || !json) continue;
    const content = JSON.parse(json.toString('utf8'));
    const v = String(meta.hash).slice(0, 10);
    const htmlPath = `modelos/${slug}/${v}/index.html`;
    await upload(htmlPath, html, 'text/html; charset=utf-8');
    const thumbUrl = thumb ? await upload(`modelos/${slug}/${v}/thumb.jpg`, thumb, 'image/jpeg') : null;
    const name = hint?.nome || cur?.name || meta.name || dir;
    const cls = await classify(name, hint, content);
    const niches = Array.from(new Set([cls.nicho, ...(cls.nichos_compativeis || []), hint?.nicho].filter(Boolean).map((x: string) => String(x).toLowerCase().trim())));
    let embedding: number[] | null = null;
    try {
      embedding = (await embed([searchTextOf({ name, niche: cls.nicho, niches, keywords: cls.palavras_chave, style: cls.estilo, description: cls.descricao, content })], 'passage'))[0];
    } catch {}
    await db()
      .from('premium_templates')
      .upsert({
        slug,
        name,
        niche: cls.nicho || hint?.nicho || null,
        niches,
        keywords: (cls.palavras_chave || []).map((x: string) => String(x).toLowerCase()),
        style: cls.estilo || null,
        description: cls.descricao || null,
        hash: meta.hash,
        build_ok: true,
        build_error: null,
        thumb_url: thumbUrl,
        html_path: htmlPath,
        content,
        embedding,
        embed_v: 2,
        search_text: searchTextOf({ name, niche: cls.nicho, niches, keywords: cls.palavras_chave, style: cls.estilo, description: cls.descricao, content }).slice(0, 4000),
        audience,
        family,
        status: 'pronto',
        updated_at: new Date().toISOString(),
      });
    ghSeen.set(slug, sig);
    changed++;
  }
  // pastas apagadas no GitHub saem do painel
  const gone = (rows || []).map((r: any) => r.slug).filter((s: string) => !dirs.includes(s));
  if (gone.length) {
    await db().from('premium_templates').delete().in('slug', gone);
    changed += gone.length;
  }
  return { ok: true, changed, total: dirs.length };
}

/* ---------------- sistema → GitHub ---------------- */

const IGNORE = /(^|\/)(node_modules|dist|\.git|__MACOSX|_build|\.DS_Store|\.vscode|\.idea)(\/|$)/;

/** Lê o .zip da Arena e devolve os arquivos do projeto (sem a pasta extra de fora). */
export async function readZip(buf: Buffer) {
  const zip = await JSZip.loadAsync(buf);
  const entries = Object.values(zip.files).filter((f) => !f.dir && !IGNORE.test(f.name));
  if (!entries.length) throw new Error('O .zip está vazio.');
  // tira a pasta de fora, se tudo estiver dentro de uma só
  const tops = new Set(entries.map((f) => f.name.split('/')[0]));
  const strip = tops.size === 1 && entries.every((f) => f.name.includes('/')) ? [...tops][0] + '/' : '';
  const files: { path: string; data: Buffer }[] = [];
  let total = 0;
  for (const f of entries) {
    const data = Buffer.from(await f.async('uint8array'));
    total += data.length;
    if (total > 40 * 1024 * 1024) throw new Error('O .zip passou de 40 MB. Envie sem a pasta node_modules.');
    files.push({ path: f.name.slice(strip.length), data });
  }
  if (files.length > 600) throw new Error('Arquivos demais no .zip (mais de 600). Envie sem node_modules.');
  if (!files.some((f) => f.path === 'package.json')) throw new Error('Não achei o package.json. Envie o .zip do projeto inteiro baixado da Arena.');
  if (!files.some((f) => f.path === 'src/content.ts')) {
    // a Arena às vezes põe o conteúdo em outro lugar (src/data/content.ts, src/siteContent.ts…): o sistema ajeita sozinho
    const fixed = relocateContent(files);
    if (!fixed)
      throw new Error('Este modelo não tem um arquivo de conteúdo (src/content.ts, com todos os textos e imagens). Gere de novo na Arena com o prompt do painel.');
  }
  return files;
}

/**
 * Acha o arquivo de conteúdo fora do lugar e cria o src/content.ts com ele.
 * O arquivo antigo passa a reexportar o novo (os componentes continuam importando de onde importavam).
 */
export function relocateContent(files: { path: string; data: Buffer }[]) {
  const cands = files
    .filter((f) => /^src\/(.+\/)?(content|siteContent|site-content|siteData|site-data|data|config|siteConfig)\.ts$/i.test(f.path))
    .map((f) => ({ f, txt: f.data.toString('utf8') }))
    .filter((x) => /export\s+default\s+\w+\s*;?\s*$/m.test(x.txt) || /export\s+const\s+\w+\s*(:[^=]+)?=\s*\{/.test(x.txt))
    .sort((a, b) => b.txt.length - a.txt.length);
  const hit = cands[0];
  if (!hit) return false;
  let txt = hit.txt;
  if (!/export\s+default\s+\w+\s*;?\s*$/m.test(txt)) {
    const name = (txt.match(/export\s+const\s+(\w+)\s*(:[^=]+)?=\s*\{/) || [])[1];
    if (!name) return false;
    txt = txt.trimEnd() + `\n\nexport default ${name};\n`;
  }
  const from = hit.f.path.replace(/\.ts$/, '');
  const depth = from.split('/').length - 2; // src/a/b/content → ../..
  const rel = depth <= 0 ? './content' : `${'../'.repeat(depth)}content`;
  // imports relativos do arquivo original continuam valendo a partir de src/
  if (depth > 0) {
    const dir = posix.dirname(hit.f.path);
    txt = txt.replace(/(from\s+|import\s*\(\s*|import\s+)(['"])(\.{1,2}\/[^'"]+)\2/g, (_m, kw, q, spec) => {
      let r = posix.relative('src', posix.normalize(posix.join(dir, spec)));
      if (!r.startsWith('.')) r = './' + r;
      return `${kw}${q}${r}${q}`;
    });
  }
  files.push({ path: 'src/content.ts', data: Buffer.from(txt) });
  hit.f.data = Buffer.from(`// conteúdo movido para src/content.ts (Radar de Vendas)\nexport * from '${rel}';\nexport { default } from '${rel}';\n`);
  return true;
}

/** Envia (ou substitui) um modelo na pasta Modelos do GitHub. */
export async function importZip(buf: Buffer, name: string, niche?: string | null, replaceSlug?: string | null) {
  const c = ghConfig();
  const files = await readZip(buf);
  const slug = replaceSlug || slugify(niche ? `${niche}` : name);
  const base = `${c.dir}/${slug}`;
  const old = await listTree(base);
  // sem duplicados: mesmo nome (ou mesma pasta) não entra de novo; para trocar, use "Substituir"
  if (!replaceSlug) {
    if (old.length) throw new Error(`Já existe o modelo "${name}" (pasta ${slug}). Não enviei de novo para não duplicar. Para trocar, use "Substituir" nele.`);
    const { data: same } = await db().from('premium_templates').select('slug,name');
    const dup = (same || []).find((t: any) => norm(t.name) === norm(name) || slugify(t.name) === slug);
    if (dup) throw new Error(`Já existe o modelo "${dup.name}" (pasta ${dup.slug}). Não enviei de novo para não duplicar.`);
  }
  const add = files.map((f) => ({ path: `${base}/${f.path}`, data: f.data }));
  add.push({ path: `${base}/modelo.json`, data: Buffer.from(JSON.stringify({ nome: name, nicho: niche || null, enviado_em: new Date().toISOString() }, null, 2)) });
  const keep = new Set(add.map((f) => f.path));
  const remove = old.map((o) => o.path).filter((p) => !keep.has(p) && !p.includes('/_build/'));
  await commit(`Modelos: ${replaceSlug ? 'substitui' : 'novo modelo'} "${name}" (pelo painel)`, { add, remove });
  await db().from('premium_templates').upsert({ slug, name, niche: niche || null, status: 'compilando', build_ok: false, build_error: null, updated_at: new Date().toISOString() });
  return { slug };
}

export async function renameTemplate(slug: string, name: string, niche?: string | null) {
  const c = ghConfig();
  const base = `${c.dir}/${slug}`;
  const cur = await readFile(`${base}/modelo.json`).then((b) => (b ? JSON.parse(b.toString('utf8')) : {})).catch(() => ({}));
  await commit(`Modelos: renomeia "${slug}" para "${name}" (pelo painel)`, { add: [{ path: `${base}/modelo.json`, data: Buffer.from(JSON.stringify({ ...cur, nome: name, nicho: niche ?? cur.nicho ?? null }, null, 2)) }] });
  await db().from('premium_templates').update({ name, ...(niche !== undefined ? { niche } : {}), updated_at: new Date().toISOString() }).eq('slug', slug);
}

/** 'masculino' | 'feminino' | null (serve para todos). */
export function audienceOf(v: any): 'masculino' | 'feminino' | null {
  const t = norm(String(v || ''));
  if (/^(m|masc|masculino|homem|homens|male)$/.test(t)) return 'masculino';
  if (/^(f|fem|feminino|mulher|mulheres|female)$/.test(t)) return 'feminino';
  return null;
}

async function modelJson(slug: string) {
  const c = ghConfig();
  return readFile(`${c.dir}/${slug}/modelo.json`).then((b) => (b ? JSON.parse(b.toString('utf8')) : {})).catch(() => ({}));
}

/** Público do modelo (homens, mulheres ou todos): grava no modelo.json do GitHub e no painel. */
export async function setAudience(slug: string, audience: any) {
  const c = ghConfig();
  const a = audienceOf(audience);
  const cur = await modelJson(slug);
  await commit(`Modelos: "${slug}" agora é para ${a === 'masculino' ? 'homens' : a === 'feminino' ? 'mulheres' : 'todos'} (pelo painel)`, {
    add: [{ path: `${c.dir}/${slug}/modelo.json`, data: Buffer.from(JSON.stringify({ ...cur, publico: a }, null, 2)) }],
  });
  await db().from('premium_templates').update({ audience: a, updated_at: new Date().toISOString() }).eq('slug', slug);
  return a;
}

/**
 * Duplica o modelo no GitHub (mesmos arquivos, sem baixar nada) para fazer a versão masculina/feminina.
 * A cópia já nasce pronta (leva junto a compilação) e recompila sozinha em seguida.
 */
export async function duplicateTemplate(slug: string, opts: { audience?: any; name?: string | null; originalAudience?: any } = {}) {
  const c = ghConfig();
  const files = await listTree(`${c.dir}/${slug}`);
  if (!files.length) throw new Error('Modelo não encontrado no GitHub.');
  const cur = await modelJson(slug);
  const { data: row } = await db().from('premium_templates').select('*').eq('slug', slug).maybeSingle();
  const a = audienceOf(opts.audience);
  const suffix = a === 'feminino' ? 'feminino' : a === 'masculino' ? 'masculino' : 'copia';
  const root = slugify(`${row?.family || cur.base || slug}-${suffix}`);
  let ns = root;
  for (let i = 2; i < 50 && (await listTree(`${c.dir}/${ns}`)).length; i++) ns = `${root}-${i}`;
  const baseName = String(row?.name || cur.nome || slug).replace(/\s*[·-]\s*(masculino|feminino|homens|mulheres|c[oó]pia)\s*$/i, '');
  const name = opts.name || `${baseName} · ${a === 'feminino' ? 'Feminino' : a === 'masculino' ? 'Masculino' : 'Cópia'}`;
  const family = row?.family || cur.base || slug;
  const prefix = `${c.dir}/${slug}/`;
  const copy = files.filter((f) => !/\/modelo\.json$/.test(f.path)).map((f) => ({ path: `${c.dir}/${ns}/${f.path.slice(prefix.length)}`, sha: f.sha, mode: f.mode }));
  const add = [{ path: `${c.dir}/${ns}/modelo.json`, data: Buffer.from(JSON.stringify({ ...cur, nome: name, publico: a, base: family, copiado_de: slug, enviado_em: new Date().toISOString() }, null, 2)) }];
  // o original vira o par do outro público (ex.: duplicou para mulheres → o original é o de homens)
  const oa = audienceOf(opts.originalAudience);
  if (oa && oa !== audienceOf(cur.publico)) add.push({ path: `${c.dir}/${slug}/modelo.json`, data: Buffer.from(JSON.stringify({ ...cur, publico: oa, base: cur.base || null }, null, 2)) });
  await commit(`Modelos: duplica "${slug}" → "${ns}"${a ? ` (${a})` : ''} (pelo painel)`, { copy, add });
  // já aparece no painel com a mesma compilação do original (a nova compilação chega em 1 a 2 min)
  if (row) {
    const { slug: _s, uses: _u, embedding, ...rest } = row as any;
    await db().from('premium_templates').upsert({ ...rest, embedding, slug: ns, name, audience: a, family, uses: 0, status: row.build_ok ? 'pronto' : 'compilando', updated_at: new Date().toISOString() });
    if (oa) await db().from('premium_templates').update({ audience: oa }).eq('slug', slug);
  }
  return { slug: ns, name };
}

/**
 * Acabamento feito no editor visual: salva o conteúdo inteiro (textos, imagens, botões) no GitHub
 * como content.override.json do modelo. A compilação junta com o src/content.ts e isso vira o padrão do modelo.
 * Já vale na hora para as prévias novas (o conteúdo do painel é atualizado junto).
 */
export async function saveEdits(slug: string, content: any, by?: string | null) {
  if (!content || typeof content !== 'object') throw new Error('Conteúdo inválido.');
  const c = ghConfig();
  await commit(`Modelos: acabamento no editor visual em "${slug}"${by ? ` por ${by}` : ''}`, {
    add: [{ path: `${c.dir}/${slug}/content.override.json`, data: Buffer.from(JSON.stringify(content, null, 2)) }],
  });
  await db().from('premium_templates').update({ content, edited_at: new Date().toISOString(), status: 'compilando', updated_at: new Date().toISOString() }).eq('slug', slug);
}

/** Imagem enviada no editor visual → link público (fica guardada no armazenamento do sistema). */
export async function uploadAsset(slug: string, file: File) {
  if (!/^image\//.test(file.type)) throw new Error('Envie uma imagem (JPG, PNG ou WEBP).');
  if (file.size > 8 * 1024 * 1024) throw new Error('Imagem muito grande (máximo 8 MB).');
  const ext = file.type.includes('png') ? 'png' : file.type.includes('webp') ? 'webp' : file.type.includes('gif') ? 'gif' : file.type.includes('svg') ? 'svg' : 'jpg';
  return upload(`modelos-assets/${slugify(slug)}/${Date.now().toString(36)}.${ext}`, Buffer.from(await file.arrayBuffer()), file.type);
}

export async function deleteTemplate(slug: string) {
  const c = ghConfig();
  const files = await listTree(`${c.dir}/${slug}`);
  if (files.length) await commit(`Modelos: remove "${slug}" (pelo painel)`, { remove: files.map((f) => f.path) });
  await db().from('premium_templates').delete().eq('slug', slug);
}

/* ---------------- escolha do modelo para o cliente ---------------- */

/** Gênero do cliente (detectado pelo nome ou pela conversa; a IA nunca pergunta). */
export function genderOfLead(lead: any): 'masculino' | 'feminino' | null {
  const g = lead?.gender || lead?.memory?.genero_cliente;
  return g === 'masculino' || g === 'feminino' ? g : null;
}

function cos(a: number[], b: number[]) {
  let s = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) s += a[i] * b[i];
  return s;
}

/**
 * Modelos que fazem sentido para o cliente. Busca completa e grátis (sem IA):
 * significado (vetor local) + nicho + palavras do ramo + conteúdo do site, comparados com
 * o nicho, o que o cliente contou na conversa (memória, resumo e as últimas mensagens) e o nome do negócio.
 * relevant = vale mostrar/usar; os outros só aparecem em "ver todos".
 */
export async function rankTemplates(lead: any, limit = 12) {
  let r: any = await db().from('premium_templates').select('slug,name,niche,niches,keywords,style,description,thumb_url,build_ok,status,embedding,uses,audience,family,search_text,embed_v').eq('active', true);
  if (r.error) r = await db().from('premium_templates').select('slug,name,niche,niches,keywords,style,description,thumb_url,build_ok,status,embedding,uses,audience,family').eq('active', true);
  const data: any[] = r.data || [];
  if (data.some((t) => t.embed_v == null || t.embed_v < 2)) refreshTemplateSearch().catch(() => 0);
  const gender = genderOfLead(lead);
  const list = data.filter((t: any) => t.build_ok);
  if (!list.length) return [];
  const mem = lead?.memory || {};
  let said = '';
  if (lead?.id) {
    const { data: msgs } = await db().from('messages').select('body,transcript').eq('lead_id', lead.id).eq('direction', 'in').order('created_at', { ascending: false }).limit(8);
    said = (msgs || []).map((m: any) => m.transcript || m.body || '').filter((x: string) => !/^\[|^🎤 Áudio$/.test(x)).join(' · ').slice(0, 800);
  }
  const core = [lead?.niche, mem.negocio, mem.servicos_principais, mem.produtos, mem.servicos, mem.publico, mem.objetivo].filter(Boolean).join(' · ');
  const text = [core, lead?.name, lead?.summary, said].filter(Boolean).join(' · ');
  const q = text ? await embedQuery(text.slice(0, 1500)).catch(() => null) : null;
  const n = norm(lead?.niche || mem.negocio || '');
  const qTok = tokens(text);
  const leadGroup = nicheKey(`${lead?.niche || ''} ${mem.negocio || ''} ${mem.servicos_principais || ''}`);
  const coreTok = tokens(`${core} ${lead?.name || ''}`);
  const ranked = list
    .map((t: any) => {
      const tags = [t.niche, ...(t.niches || []), ...(t.keywords || [])].map((x: string) => norm(x || '')).filter(Boolean);
      const tagTok = new Set(tags.flatMap((x) => x.split(/[^a-z0-9]+/)).filter((w) => w.length > 3));
      const bodyTok = new Set(tokens(t.search_text || ''));
      let score = q && Array.isArray(t.embedding) ? cos(q, t.embedding) : 0.5;
      const exact = !!n && tags.some((x) => x === n || (n.length > 4 && (n.includes(x) || x.includes(n))));
      if (exact) score += 0.4;
      // mesmo grupo de ramo (ex.: consultor imobiliário ↔ imobiliária/corretor; dentista ↔ odontologia)
      const sameGroup = !exact && leadGroup !== 'geral' && [t.niche, ...(t.niches || [])].some((x: string) => nicheKey(x) === leadGroup);
      if (sameGroup) score += 0.25;
      // palavras do ramo que o cliente usou e o modelo tem (no nicho/palavras valem mais que no texto do site)
      const hitTag = coreTok.filter((w) => tagTok.has(w)).length + qTok.filter((w) => tagTok.has(w)).length * 0.5;
      const hitBody = qTok.filter((w) => bodyTok.has(w)).length;
      score += Math.min(0.3, hitTag * 0.08) + Math.min(0.15, hitBody * 0.03);
      // modelo masculino/feminino: o do mesmo público do cliente sobe, o do outro público quase some
      if (gender && t.audience) score += t.audience === gender ? 0.15 : -0.6;
      else if (!gender && t.audience) score -= 0.02;
      return { ...t, embedding: undefined, search_text: undefined, score: Math.round(score * 100) / 100, exact, sameGroup, hits: hitTag + hitBody + (sameGroup ? 1 : 0) };
    })
    .sort((a: any, b: any) => b.score - a.score);
  const top = ranked[0]?.score || 0;
  const known = !!(core || said);
  return ranked.slice(0, limit).map((t: any, i: number) => {
    // com o ramo conhecido, só entra o que tem a ver de verdade (nada de mostrar modelo de outro ramo só para encher)
    const relevant = known ? t.exact || t.sameGroup || (t.score >= Math.max(0.82, top - 0.1) && t.hits >= 1) : i < 4;
    return { ...t, relevant, match: t.exact ? 'mesmo nicho' : t.sameGroup ? 'mesmo ramo' : t.score >= 0.86 || t.hits >= 2 ? 'combina' : 'pode adaptar' };
  });
}

/** Modelo para a prévia do cliente: o escolhido pela equipe, senão o que mais combina. */
export async function templateForLead(lead: any, slug?: string | null, strict = false) {
  const want = slug || lead.premium_template;
  if (want) {
    const { data } = await db().from('premium_templates').select('*').eq('slug', want).maybeSingle();
    // modelo escolhido é do outro público (ex.: masculino para uma cliente): usa a versão certa do mesmo modelo
    const gender = genderOfLead(lead);
    if (data && !slug && gender && data.audience && data.audience !== gender) {
      const fam = data.family || data.slug;
      const { data: twins } = await db().from('premium_templates').select('*').eq('active', true).eq('build_ok', true).eq('audience', gender).or(`family.eq.${fam},slug.eq.${fam}`);
      if (twins?.[0]) return twins[0];
    }
    if (data?.build_ok) return data;
  }
  const best = (await rankTemplates(lead, 1))[0];
  if (!best) return null;
  // a IA sozinha só usa modelo do mesmo nicho ou bem parecido (senão a equipe escolhe na conversa)
  if (strict && best.match === 'pode adaptar') return null;
  const { data } = await db().from('premium_templates').select('*').eq('slug', best.slug).maybeSingle();
  return data?.build_ok ? data : null;
}

/* ---------------- personalização ---------------- */

function hexMix(hex: string, other: string, t: number) {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const a = p(hex);
  const b = p(other);
  return '#' + a.map((v, i) => Math.round(v + (b[i] - v) * t).toString(16).padStart(2, '0')).join('');
}

function lum(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
/** Texto que fica legível em cima da cor (branco ou quase preto). */
const onColor = (hex: string) => (lum(hex) > 0.45 ? '#111827' : '#ffffff');

/**
 * Cores do cliente: principal (botões, títulos, destaques) e secundária (detalhes, selos, ícones).
 * Todo modelo premium usa --primary e --accent (regra do prompt da Arena).
 */
export function themeFor(color?: string | null) {
  const cs = colorsFrom(color);
  const c = cs[0] || colorFrom(color);
  if (!c) return null;
  const a = cs[1] || hexMix(c, '#000000', 0.35);
  return {
    '--primary': c,
    '--primary-foreground': onColor(c),
    '--ring': c,
    '--primary-light': hexMix(c, '#ffffff', 0.25),
    '--primary-dark': hexMix(c, '#000000', 0.25),
    '--primary-soft': hexMix(c, '#ffffff', 0.88),
    '--accent': a,
    '--accent-foreground': onColor(a),
    '--accent-light': hexMix(a, '#ffffff', 0.25),
    '--accent-dark': hexMix(a, '#000000', 0.25),
    '--accent-soft': hexMix(a, '#ffffff', 0.88),
  };
}

/**
 * Troca as cores do modelo pelas do cliente direto no arquivo de cores (CSS compilado):
 * lê as variáveis originais (--primary, --accent…) e substitui cada valor em TODO o HTML,
 * inclusive onde o modelo usou a cor fixa (ex.: bg-[#944D48]) ou com transparência (#944d4859).
 */
export function recolor(html: string, theme: Record<string, string> | null | undefined) {
  if (!theme) return html;
  const root = html.match(/:root\s*\{[^}]*--primary\s*:[^}]*\}/i)?.[0] || '';
  const map = new Map<string, string>();
  for (const [k, v] of Object.entries(theme)) {
    // cor do texto (branco/preto) só muda pela variável: trocar todo #ffffff do site deixaria os fundos escuros
    if (/foreground/.test(k)) continue;
    const m = root.match(new RegExp(`${k.replace(/[-]/g, '\\-')}\\s*:\\s*(#[0-9a-f]{6})\\b`, 'i'));
    if (m && m[1].toLowerCase() !== String(v).toLowerCase() && /^#[0-9a-f]{6}$/i.test(String(v)) && lum(m[1]) < 0.85 && lum(m[1]) > 0.01) map.set(m[1].toLowerCase(), String(v));
  }
  if (!map.size) return html;
  const re = new RegExp(`(${[...map.keys()].join('|')})([0-9a-f]{2})?(?![0-9a-f])`, 'gi');
  return html.replace(re, (_m, hex: string, alpha?: string) => (map.get(hex.toLowerCase()) || hex) + (alpha || ''));
}

/* ---------------- campos sem informação ---------------- */

/** "<UNKNOWN>", "N/A", "[preço]", "a definir"… = campo que a IA não preencheu. */
export function isPlaceholder(v: any) {
  if (typeof v !== 'string') return v === null || v === undefined;
  const t = v.trim();
  if (!t) return true;
  return /<\s*unknown\s*>|\bunknown\b|^n\/?a$|^null$|^undefined$|^-+$|^—$|^\[[^\]]*\]$|^\{[^}]*\}$|^<[^>]*>$|^x{2,}$|a definir|n[aã]o informad|sem informa[cç][aã]o|^tbd$|^lorem/i.test(t);
}

const FAKE: [RegExp, (city: string) => string][] = [
  [/original.?price|pre[cç]o.?(de|antigo|cheio)|old.?price|was/i, () => 'R$ 197'],
  [/install|parcel/i, () => 'ou 3x sem juros no cartão'],
  [/price|pre[cç]o|valor/i, () => 'R$ 149'],
  [/rating|nota|stars|estrelas/i, () => '4,9'],
  [/reviews?|avalia[cç]/i, () => '120+ avaliações no Google'],
  [/hour|hor[aá]rio|schedule|funcionamento/i, () => 'Seg a Sex, 9h às 19h · Sáb, 9h às 14h'],
  [/address|endere[cç]o|rua/i, (c) => `Centro${c ? ', ' + c : ''}`],
  [/area|regi[aã]o|raio|cobertura|atendimento/i, (c) => (c ? `${c} e região` : 'Atendemos toda a região')],
  [/city|cidade/i, (c) => c || 'sua cidade'],
  [/email|e-mail/i, () => 'contato@seusite.com.br'],
  [/year|anos|since|desde/i, () => '10'],
];

/**
 * Nenhum campo fica vazio ou com "UNKNOWN": usa o valor do modelo; se o modelo também não tiver,
 * um exemplo realista (é uma prévia, o site final usa os dados reais).
 */
export function fillPlaceholders(site: any, tplDefault: any, city?: string | null, key = ''): any {
  if (Array.isArray(site)) return site.map((x, i) => fillPlaceholders(x, Array.isArray(tplDefault) ? tplDefault[i] ?? tplDefault[0] : undefined, city, key));
  if (site && typeof site === 'object') {
    const o: any = {};
    for (const k of Object.keys(site)) o[k] = fillPlaceholders(site[k], tplDefault?.[k], city, k);
    return o;
  }
  if (typeof site === 'string' && /<\s*unknown\s*>/i.test(site) && site.replace(/<\s*unknown\s*>/gi, '').trim().length > 3) {
    // frase com um pedaço faltando: tira só o pedaço
    return site.replace(/\s*<\s*unknown\s*>\s*/gi, ' ').replace(/\s{2,}/g, ' ').trim();
  }
  if (!isPlaceholder(site)) return site;
  if (tplDefault !== undefined && !isPlaceholder(tplDefault) && typeof tplDefault === typeof (site ?? tplDefault)) return tplDefault;
  if (site === null || site === undefined) return site;
  const f = FAKE.find(([re]) => re.test(key));
  return f ? f[1](city || '') : typeof tplDefault === 'string' && !isPlaceholder(tplDefault) ? tplDefault : site.trim() ? '' : site;
}

const PERSONALIZE = {
  type: 'object',
  properties: {
    content_json: { type: 'string', description: 'O JSON completo do conteúdo, com a MESMA estrutura e as MESMAS chaves do modelo, já adaptado ao cliente.' },
    aplicados: { type: 'array', items: { type: 'string' }, description: 'Para cada pedido de ajuste: o que foi feito e onde.' },
    nao_aplicados: { type: 'array', items: { type: 'string' }, description: 'Pedidos que não deu para aplicar no conteúdo (vazio se todos entraram).' },
  },
  required: ['content_json', 'aplicados', 'nao_aplicados'],
};

function deepFill(base: any, next: any): any {
  if (next === undefined || next === null) return base;
  if (Array.isArray(base)) return Array.isArray(next) && next.length ? next.map((x, i) => deepFill(base[i] ?? base[0], x)) : base;
  if (base && typeof base === 'object') {
    const o: any = { ...base };
    for (const k of Object.keys(base)) o[k] = deepFill(base[k], next?.[k]);
    return o;
  }
  return typeof next === typeof base ? next : base;
}

/** Dados certos do cliente por cima do que a IA escreveu (nome, WhatsApp, endereço, Instagram). */
function applyFacts(c: any, lead: any, name: string) {
  const o = JSON.parse(JSON.stringify(c));
  const wa = String(lead.whatsapp || lead.phone || '').replace(/\D/g, '');
  if (o.brand && typeof o.brand === 'object') {
    o.brand.name = name;
    if ('shortName' in o.brand) o.brand.shortName = name.split(' ').slice(0, 2).join(' ');
    if ('initials' in o.brand) o.brand.initials = name.split(/\s+/).filter((w: string) => w.length > 2).slice(0, 2).map((w: string) => w[0]).join('').toUpperCase() || name.slice(0, 2).toUpperCase();
  }
  if (o.contact && typeof o.contact === 'object' && wa) {
    if ('whatsapp' in o.contact) o.contact.whatsapp = wa.startsWith('55') ? wa : '55' + wa;
    if ('whatsappDisplay' in o.contact) o.contact.whatsappDisplay = formatPhone(wa);
  }
  if (o.contact && lead.address && 'address' in o.contact) o.contact.address = lead.address;
  if (o.contact && lead.maps_url && 'addressUrl' in o.contact) o.contact.addressUrl = lead.maps_url;
  // sem Instagram do cliente: um @ de exemplo com o nome dele (nunca o @ do modelo, de outra cidade/negócio)
  if (o.contact && !lead.instagram && typeof o.contact.instagram === 'string' && o.contact.instagram) {
    const ig = norm(name).replace(/[^a-z0-9]+/g, '').slice(0, 28) || 'seunegocio';
    o.contact.instagram = '@' + ig;
    if ('instagramUrl' in o.contact) o.contact.instagramUrl = `https://www.instagram.com/${ig}/`;
  }
  if (o.contact && lead.instagram && 'instagram' in o.contact) {
    const ig = String(lead.instagram).replace(/^https?:\/\/(www\.)?instagram\.com\//, '').replace(/\/$/, '');
    o.contact.instagram = '@' + ig.replace(/^@/, '');
    if ('instagramUrl' in o.contact) o.contact.instagramUrl = `https://www.instagram.com/${ig.replace(/^@/, '')}/`;
  }
  return o;
}

/**
 * Adapta o conteúdo do modelo ao cliente (IA barata, ~US$ 0,005). Mantém todas as seções e itens.
 * base: o conteúdo de partida (o do modelo, ou o da prévia anterior quando é um ajuste).
 */
/** Cidade escrita no conteúdo (ex.: "…, Limeira/SP" → Limeira). */
export function cityOf(c: any): string | null {
  const addr = String(c?.contact?.address || c?.contact?.addressShort || '');
  const m = addr.match(/([A-Za-zÀ-ÿ' .-]{3,})\s*[\/-]\s*[A-Z]{2}\b/g);
  if (!m) return null;
  const last = m[m.length - 1].replace(/\s*[\/-]\s*[A-Z]{2}\b/, '').split(',').pop()!.trim();
  return last.length >= 3 ? last : null;
}

/**
 * Cores pedidas pelo cliente, do jeito mais completo: o pedido de cor mais novo
 * + "clarinho"/"mais escuro" que ele tenha dito depois, ou a cor preferida da memória quando ela é a mesma com mais detalhe.
 */
export function latestColor(mem: any): string | null {
  const pedidos: string[] = Array.isArray(mem?.pedidos_previa) ? mem.pedidos_previa.map(String) : [];
  const pref = mem?.cor_preferida ? String(mem.cor_preferida) : '';
  let at = -1;
  for (let i = pedidos.length - 1; i >= 0; i--)
    if (colorFrom(pedidos[i])) {
      at = i;
      break;
    }
  if (at < 0) return pref || null;
  let txt = pedidos[at];
  const later = pedidos.slice(at + 1).filter((x) => /clar|escur|suave|forte|pastel|fechad/i.test(x)).join(' ');
  if (later) txt += ' ' + later;
  // a memória diz a mesma cor com mais detalhe ("verde e azul (clarinho)")
  const base = (x: string) => colorsFrom(x.replace(/clar\w*|escur\w*|suave|forte|pastel|fechad\w*|beb[eê]/gi, '')).join(',');
  if (pref && base(pref) && base(pref) === base(txt) && pref.length > 0) return `${pref} ${later}`.trim();
  return txt;
}

/** Fotos que o cliente mandou no WhatsApp, com link público para entrar na prévia. */
export async function clientPhotos(lead: any, max = 8): Promise<string[]> {
  const { data: msgs } = await db().from('messages').select('id,meta,wa_message_id,number_id,created_at').eq('lead_id', lead.id).eq('direction', 'in').eq('kind', 'image').order('created_at', { ascending: false }).limit(max);
  const out: string[] = [];
  for (const m of msgs || []) {
    if (m.meta?.public_url) {
      out.push(m.meta.public_url);
      continue;
    }
    try {
      const { data: num } = await db().from('whatsapp_numbers').select('instance_name').eq('id', m.number_id || lead.number_id).maybeSingle();
      if (!num || !m.wa_message_id) continue;
      const { evo } = await import('./evolution');
      const r: any = await evo.media(num.instance_name, m.wa_message_id);
      const b64 = String(r?.base64 || r?.data?.base64 || '').replace(/^data:[^,]+,/, '');
      if (!b64) continue;
      const mime = String(r?.mimetype || m.meta?.mime || 'image/jpeg').split(';')[0];
      const ext = mime.includes('png') ? 'png' : mime.includes('webp') ? 'webp' : 'jpg';
      const url = await upload(`clientes/${lead.id}/${m.id}.${ext}`, Buffer.from(b64, 'base64'), mime);
      await db().from('messages').update({ meta: { ...(m.meta || {}), public_url: url } }).eq('id', m.id);
      out.push(url);
    } catch {}
  }
  return out.reverse();
}

/**
 * Adapta o conteúdo do modelo ao cliente (IA barata, ~US$ 0,005). Mantém todas as seções e itens.
 * base: o conteúdo de partida (o do modelo, ou o da prévia anterior quando é um ajuste).
 * Confere se TODOS os pedidos do cliente entraram; se faltar algum, refaz uma vez.
 */
export async function personalize(tpl: any, lead: any, base?: any) {
  const mem: any = lead.memory || {};
  const name = String(mem.nome_no_site || mem.nome_negocio || lead.name).slice(0, 80);
  const start = base || tpl.content;
  const pedidos: string[] = Array.isArray(mem.pedidos_previa) ? mem.pedidos_previa : [];
  const city = lead.city || mem.cidade || null;
  const photos = await clientPhotos(lead).catch(() => [] as string[]);
  const facts = `DADOS DO CLIENTE (use exatamente estes)
Nome no site: ${name}
Ramo: ${lead.niche || mem.negocio || 'não informado'} · Cidade: ${city || 'não informada'}
Endereço: ${mem.endereco || lead.address || '—'} · Horários: ${mem.horarios || '—'}
WhatsApp: ${lead.whatsapp || '—'} · Instagram: ${lead.instagram || '—'}
Nota no Google: ${lead.rating ? `${lead.rating} (${lead.reviews} avaliações)` : '—'}
Serviços principais: ${mem.servicos_principais || '—'}
Cores pedidas: ${latestColor(mem) || '—'} (o sistema troca as cores do site sozinho: considere qualquer pedido de cor como APLICADO e não o coloque em nao_aplicados)
Objetivo: ${mem.objetivo || '—'} · Observações: ${mem.observacoes || '—'}
${photos.length ? `FOTOS REAIS DO CLIENTE (troque as imagens ilustrativas por estas, começando pela imagem principal do topo, depois estrutura/galeria/sobre; mantenha as demais):\n${photos.map((u) => '- ' + u).join('\n')}` : ''}
${pedidos.length ? `PEDIDOS DE AJUSTE DO CLIENTE (OBRIGATÓRIO aplicar todos, na ordem; o mais novo vale mais):\n${pedidos.map((p, i) => `${i + 1}. ${p}`).join('\n')}` : ''}`;
  const SYSTEM = `Você adapta o conteúdo de um site premium (modelo pronto) para um cliente real, em português do Brasil.
REGRAS:
- Devolva o JSON COMPLETO com exatamente as mesmas chaves e a mesma estrutura. Mantenha TODAS as seções e a mesma quantidade de itens em cada lista (não esconda nada nesta prévia), a não ser que um pedido do cliente diga para tirar.
- Troque nome da marca, cidade, bairro, endereço, horários e contexto pelos do cliente em TODOS os textos (títulos, descrições, perguntas, rodapé, SEO).
- Se o ramo do cliente for diferente do modelo, adapte serviços, textos, perguntas e depoimentos ao ramo dele.
- Mantenha os links de imagens, a não ser que haja FOTOS REAIS DO CLIENTE ou que a imagem não tenha nada a ver com o ramo dele.
- Mantenha o estilo das frases, os destaques com *asteriscos* e o tamanho parecido dos textos.
- NUNCA deixe campo vazio nem escreva UNKNOWN, N/A, "a definir", colchetes ou qualquer marcador. O que o cliente não informou (preços, parcelas, horários, endereço, raio de atendimento, nota, número de clientes) você completa com um exemplo realista e coerente com o ramo e a cidade dele (ex.: preços de mercado da região, "Centro, Campinas", "Campinas e região", "Seg a Sex, 9h às 19h"). É uma prévia: o site final usa os dados reais.
- Aplique TODOS os pedidos de ajuste. Em "aplicados" diga, para cada pedido, onde ele foi aplicado; em "nao_aplicados" liste o que não deu para fazer no conteúdo (ex.: algo que depende do design).`;
  const call = (extra = '') =>
    structured<{ content_json: string; aplicados?: string[]; nao_aplicados?: string[] }>(
      SYSTEM,
      `${facts}\n\nCONTEÚDO ATUAL (JSON)\n${JSON.stringify(start)}${extra}`,
      'conteudo_do_site',
      PERSONALIZE,
      16000,
      { task: 'previa_premium', leadId: lead.id },
    );
  let out = start;
  let missing: string[] = [];
  try {
    let r = await call();
    let parsed = JSON.parse(String(r.content_json || '').replace(/^```(json)?|```$/g, '').trim());
    // conferência: algum pedido ficou de fora? refaz uma vez, só com o foco no que faltou
    const notDone = (r.nao_aplicados || []).filter(Boolean);
    if (pedidos.length && ((r.aplicados || []).length < pedidos.length || notDone.length)) {
      try {
        const r2 = await call(`\n\nATENÇÃO: na tentativa anterior estes pedidos ficaram de fora ou incompletos: ${(notDone.length ? notDone : pedidos).join(' | ')}. Aplique TODOS agora.`);
        const p2 = JSON.parse(String(r2.content_json || '').replace(/^```(json)?|```$/g, '').trim());
        parsed = p2;
        r = r2;
      } catch {}
    }
    // cor é aplicada pelo sistema (variáveis do modelo): nunca conta como "não aplicado"
    missing = (r.nao_aplicados || []).filter((x) => x && !/\bcor(es)?\b|colou?r|paleta|tonalidade/i.test(x));
    out = deepFill(tpl.content, parsed);
  } catch {
    // IA indisponível ou resposta cortada: troca pelo menos os dados do cliente
    out = start;
  }
  out = fillPlaceholders(out, tpl.content, city);
  let s = JSON.stringify(applyFacts(out, { ...lead, address: mem.endereco || lead.address }, name));
  // nome e cidade antigos que tenham sobrado em algum texto
  for (const old of [tpl.content?.brand?.name, base?.brand?.name]) if (old && old !== name && old.length > 3) s = s.split(old).join(name);
  // @ do Instagram do modelo que tenha sobrado em algum texto
  const newIg = JSON.parse(s)?.contact?.instagram;
  const oldIg = tpl.content?.contact?.instagram;
  if (newIg && oldIg && oldIg !== newIg && String(oldIg).length > 3) s = s.split(String(oldIg).replace(/^@/, '')).join(String(newIg).replace(/^@/, ''));
  if (city) for (const old of [cityOf(tpl.content), cityOf(base)]) if (old && norm(old) !== norm(city)) s = s.replace(new RegExp(`(?<![\\p{L}\\p{N}])${old.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\p{L}\\p{N}])`, 'gu'), city);
  return { site: JSON.parse(s), colors: latestColor(mem), theme: themeFor(latestColor(mem)), title: `${name}${city ? ' · ' + city : ''}`, missing, photos: photos.length };
}

/* ---------------- página ---------------- */

const htmlCache = new Map<string, string>();

export async function templateHtml(tpl: any) {
  if (!tpl?.html_path) throw new Error('Modelo ainda não compilado');
  if (htmlCache.has(tpl.html_path)) return htmlCache.get(tpl.html_path)!;
  const { data, error } = await db().storage.from(BUCKET).download(tpl.html_path);
  if (error || !data) throw new Error('Modelo não encontrado no armazenamento');
  const html = await data.text();
  htmlCache.set(tpl.html_path, html);
  return html;
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

/** Coloca o conteúdo do cliente e as cores dele no HTML do modelo. */
export function renderPremium(html: string, opts: { site?: any; theme?: Record<string, string> | null; title?: string; ribbon?: string | null }) {
  let h = html.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/gi, '');
  const data = opts.site ? `<script>window.__SITE_CONTENT__=${JSON.stringify(opts.site).replace(/</g, '\\u003c')};</script>` : '';
  // trocas com função: um "$" no texto do cliente (ex.: R$) não pode virar padrão de substituição
  h = recolor(h, opts.theme);
  h = h.replace(/<head([^>]*)>/i, (_m, a) => `<head${a}>${data}<meta name="robots" content="noindex,nofollow">`);
  if (opts.title) h = h.replace(/<title>[\s\S]*?<\/title>/i, () => `<title>${esc(opts.title!)}</title>`);
  if (opts.site?.meta?.description) h = h.replace(/(<meta\s+name="description"\s+content=")[^"]*(")/i, (_m, a, b) => `${a}${esc(String(opts.site.meta.description))}${b}`);
  const vars = opts.theme ? Object.entries(opts.theme).map(([k, v]) => `${k}:${v}`).join(';') : '';
  const ribbon = opts.ribbon
    ? `<div style="position:fixed;left:12px;bottom:12px;z-index:2147483647;background:rgba(15,23,42,.88);color:#fff;font:600 12px/1.2 system-ui,sans-serif;padding:8px 12px;border-radius:999px;box-shadow:0 6px 20px rgba(0,0,0,.25)">${esc(opts.ribbon)}</div>`
    : '';
  h = h.replace(/<\/head>/i, () => `${vars ? `<style>:root,:host{${vars}}</style>` : ''}</head>`);
  if (ribbon) h = h.replace(/<\/body>/i, () => `${ribbon}</body>`);
  return h;
}
