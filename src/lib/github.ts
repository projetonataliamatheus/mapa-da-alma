/**
 * GitHub: a pasta "Modelos" com os modelos premium de site.
 * Painel → GitHub: enviar .zip, renomear, substituir e excluir viram commits.
 * GitHub → painel: o robô lê a pasta a cada 5 minutos (e no botão "Sincronizar agora").
 */
const API = 'https://api.github.com';

export function ghConfig() {
  return {
    token: process.env.GITHUB_TOKEN || '',
    repo: process.env.GITHUB_MODELS_REPO || 'contatofenixads/CRM-Vendas-Automatizado',
    branch: process.env.GITHUB_MODELS_BRANCH || 'main',
    dir: (process.env.GITHUB_MODELS_DIR || 'Modelos').replace(/^\/|\/$/g, ''),
  };
}

export function ghConfigured() {
  return !!ghConfig().token;
}

/** Até quando o GitHub está bloqueando por limite (não adianta insistir antes). */
export let rateLimitedUntil = 0;

export function ghLimited() {
  return Date.now() < rateLimitedUntil;
}

async function gh(path: string, init: RequestInit = {}, raw = false) {
  const c = ghConfig();
  if (ghLimited()) {
    const when = new Date(rateLimitedUntil).toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' });
    throw new Error(`Limite de pedidos do GitHub atingido. Libera às ${when}; depois clique em "Reenviar os que deram erro".`);
  }
  if (!c.token) throw new Error('Falta GITHUB_TOKEN no Easypanel (Ambiente) para ligar a pasta Modelos do GitHub.');
  const r = await fetch(API + path, {
    ...init,
    headers: {
      Authorization: `Bearer ${c.token}`,
      Accept: raw ? 'application/vnd.github.raw' : 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'radar-de-vendas',
      ...(init.headers || {}),
    },
    signal: AbortSignal.timeout(90_000),
  });
  if (r.status === 404) return null;
  if (!r.ok) {
    const t = await r.text().catch(() => '');
    // limite do GitHub (5.000 pedidos por hora por conta): avisa quando libera
    if ((r.status === 403 || r.status === 429) && (/rate limit/i.test(t) || r.headers.get('x-ratelimit-remaining') === '0')) {
      const reset = Number(r.headers.get('x-ratelimit-reset') || 0) * 1000;
      const when = reset ? new Date(reset).toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' }) : null;
      rateLimitedUntil = reset || Date.now() + 15 * 60_000;
      throw new Error(`Limite de pedidos do GitHub atingido (5.000 por hora).${when ? ` Libera às ${when}.` : ' Libera em até 1 hora.'} Depois disso, clique em "Reenviar os que deram erro".`);
    }
    if (r.status === 401) throw new Error('O GitHub recusou o GITHUB_TOKEN. Crie um token novo (Contents: leitura e escrita) e cole no Easypanel.');
    if (r.status === 403 && /permission|Resource not accessible/i.test(t)) throw new Error('O GITHUB_TOKEN não tem permissão de escrita no repositório (Contents: Read and write).');
    throw new Error(`GitHub ${r.status}: ${t.slice(0, 200)}`);
  }
  return r;
}

const enc = (p: string) => p.split('/').map(encodeURIComponent).join('/');

/** Pastas de modelos (Modelos/<nome>). */
export async function listModelDirs(): Promise<string[]> {
  const c = ghConfig();
  const r = await gh(`/repos/${c.repo}/contents/${enc(c.dir)}?ref=${c.branch}`);
  if (!r) return [];
  const j: any[] = await r.json();
  return (Array.isArray(j) ? j : []).filter((x) => x.type === 'dir' && !x.name.startsWith('.') && !x.name.startsWith('_')).map((x) => x.name);
}

/** Arquivo do repositório (texto ou binário). */
export async function readFile(path: string): Promise<Buffer | null> {
  const c = ghConfig();
  const r = await gh(`/repos/${c.repo}/contents/${enc(path)}?ref=${c.branch}`, {}, true);
  if (!r) return null;
  return Buffer.from(await r.arrayBuffer());
}

async function headCommit() {
  const c = ghConfig();
  const ref: any = await (await gh(`/repos/${c.repo}/git/ref/heads/${c.branch}`))!.json();
  const commit: any = await (await gh(`/repos/${c.repo}/git/commits/${ref.object.sha}`))!.json();
  return { sha: ref.object.sha as string, tree: commit.tree.sha as string };
}

/** Todos os arquivos do repositório numa chamada só (caminho → sha). Base da sincronização barata. */
export async function repoTree(): Promise<{ path: string; sha: string; mode: string; type: string }[]> {
  const c = ghConfig();
  const head = await headCommit();
  const t: any = await (await gh(`/repos/${c.repo}/git/trees/${head.tree}?recursive=1`))!.json();
  return t.tree || [];
}

/** Conteúdo de um arquivo pelo sha (1 pedido). */
export async function readBlob(sha: string): Promise<Buffer | null> {
  const c = ghConfig();
  const r = await gh(`/repos/${c.repo}/git/blobs/${sha}`, {}, true);
  if (!r) return null;
  return Buffer.from(await r.arrayBuffer());
}

/** Todos os arquivos dentro de uma pasta (caminho completo + sha). */
export async function listTree(prefix: string): Promise<{ path: string; sha: string; mode: string }[]> {
  const c = ghConfig();
  const head = await headCommit();
  const t: any = await (await gh(`/repos/${c.repo}/git/trees/${head.tree}?recursive=1`))!.json();
  const p = prefix.replace(/\/$/, '') + '/';
  return (t.tree || []).filter((x: any) => x.type === 'blob' && x.path.startsWith(p)).map((x: any) => ({ path: x.path, sha: x.sha, mode: x.mode }));
}

/**
 * Um commit com várias mudanças:
 *  add: arquivos novos/alterados (conteúdo) · copy: arquivos que reaproveitam um blob existente · remove: caminhos a apagar
 */
const TEXT_EXT = /\.(tsx?|jsx?|mjs|cjs|json|css|scss|html?|md|txt|svg|ya?ml|toml|lock|gitignore|npmrc|env\.example|editorconfig|prettierrc|eslintrc|xml|map)$/i;
function isText(path: string, data: Buffer) {
  if (!TEXT_EXT.test(path) && !/(^|\/)\.[\w.-]+$/.test(path)) return false;
  if (data.length > 2 * 1024 * 1024) return false;
  // sem bytes nulos e UTF-8 válido
  if (data.includes(0)) return false;
  return Buffer.from(data.toString('utf8'), 'utf8').equals(data);
}

export async function commit(message: string, ch: { add?: { path: string; data: Buffer }[]; copy?: { path: string; sha: string; mode?: string }[]; remove?: string[] }) {
  const c = ghConfig();
  const tree: any[] = [];
  // os arquivos sobem uma vez só; se o GitHub mudar no meio (a compilação automática também grava), refaz só o commit
  for (const f of ch.add || []) {
    // arquivo de texto vai dentro da própria árvore (1 pedido para tudo); só imagem/fonte sobe separado
    if (isText(f.path, f.data)) {
      tree.push({ path: f.path, mode: '100644', type: 'blob', content: f.data.toString('utf8') });
      continue;
    }
    const blob: any = await (
      await gh(`/repos/${c.repo}/git/blobs`, { method: 'POST', body: JSON.stringify({ content: f.data.toString('base64'), encoding: 'base64' }) })
    )!.json();
    tree.push({ path: f.path, mode: '100644', type: 'blob', sha: blob.sha });
  }
  for (const f of ch.copy || []) tree.push({ path: f.path, mode: f.mode || '100644', type: 'blob', sha: f.sha });
  for (const p of ch.remove || []) tree.push({ path: p, mode: '100644', type: 'blob', sha: null });
  if (!tree.length) return null;
  let last: any = null;
  for (let tentativa = 0; tentativa < 6; tentativa++) {
    try {
      const head = await headCommit();
      const nt: any = await (await gh(`/repos/${c.repo}/git/trees`, { method: 'POST', body: JSON.stringify({ base_tree: head.tree, tree }) }))!.json();
      const cm: any = await (await gh(`/repos/${c.repo}/git/commits`, { method: 'POST', body: JSON.stringify({ message, tree: nt.sha, parents: [head.sha] }) }))!.json();
      await gh(`/repos/${c.repo}/git/refs/heads/${c.branch}`, { method: 'PATCH', body: JSON.stringify({ sha: cm.sha }) });
      return cm.sha as string;
    } catch (e: any) {
      last = e;
      // "Update is not a fast forward": outro envio entrou antes; espera um pouco e tenta em cima do novo
      if (!/422|fast forward|409/i.test(String(e?.message || e))) throw e;
      await new Promise((r) => setTimeout(r, 800 + Math.random() * 1500 * (tentativa + 1)));
    }
  }
  throw new Error('O GitHub estava ocupado (outro envio ao mesmo tempo). Clique em "Reenviar os que deram erro".' + (last ? '' : ''));
}

export function repoUrl(path = '') {
  const c = ghConfig();
  return `https://github.com/${c.repo}/tree/${c.branch}/${path ? enc(path) : enc(c.dir)}`;
}

/** Último resultado da compilação automática (GitHub Actions). */
export async function lastBuildRun() {
  const c = ghConfig();
  const r = await gh(`/repos/${c.repo}/actions/workflows/modelos.yml/runs?per_page=1&branch=${c.branch}`).catch(() => null);
  if (!r) return null;
  const j: any = await r.json();
  const run = j.workflow_runs?.[0];
  return run ? { status: run.status, conclusion: run.conclusion, url: run.html_url, at: run.updated_at } : null;
}
