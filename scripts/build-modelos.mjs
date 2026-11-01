/**
 * Compila os modelos premium da pasta Modelos/ (roda no GitHub Actions).
 *
 * Para cada Modelos/<nome>/ (projeto React + Vite gerado na Arena):
 *  1. confere se mudou (hash dos arquivos); se não mudou, pula
 *  2. prepara o src/content.ts para aceitar o conteúdo de cada cliente (window.__SITE_CONTENT__)
 *  3. instala e compila → um único index.html (tudo embutido)
 *  4. gera content.json (o conteúdo padrão) e thumb.jpg (foto da página)
 *  5. grava tudo em Modelos/<nome>/_build/ (o painel lê daí)
 *  content.override.json (acabamento feito no editor visual do painel) vale por cima do src/content.ts
 */
import { readdirSync, statSync, readFileSync, writeFileSync, mkdirSync, cpSync, existsSync, rmSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { createHash } from 'node:crypto';
import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';

const ROOT = process.cwd();
const DIR = join(ROOT, process.env.MODELS_DIR || 'Modelos');
const TMP = '/tmp/modelos-build';
const SKIP = new Set(['node_modules', '_build', 'dist', '.git', '.DS_Store']);
const only = process.env.ONLY ? new Set(process.env.ONLY.split(',')) : null;

function files(dir, base = dir) {
  const out = [];
  for (const f of readdirSync(dir)) {
    if (SKIP.has(f)) continue;
    const p = join(dir, f);
    const st = statSync(p);
    if (st.isDirectory()) out.push(...files(p, base));
    else out.push(relative(base, p));
  }
  return out.sort();
}

/** zip com uma pasta a mais por dentro: usa a pasta que tem o package.json */
function projectRoot(dir) {
  if (existsSync(join(dir, 'package.json'))) return dir;
  const subs = readdirSync(dir).filter((f) => !SKIP.has(f) && statSync(join(dir, f)).isDirectory());
  for (const s of subs) if (existsSync(join(dir, s, 'package.json'))) return join(dir, s);
  return null;
}

/** Junta o conteúdo do modelo com o acabamento do editor visual (listas são trocadas inteiras). */
function merge(a, b) {
  if (b === undefined || b === null) return a;
  if (Array.isArray(b)) return b;
  if (typeof b === 'object' && a && typeof a === 'object' && !Array.isArray(a)) {
    const o = { ...a };
    for (const k of Object.keys(b)) o[k] = merge(a[k], b[k]);
    return o;
  }
  return b;
}

const SHIM = `
/* ---- Radar de Vendas: conteúdo do cliente injetado na prévia (não apague) ---- */
const __radarOverride: any = typeof window !== "undefined" ? (window as any).__SITE_CONTENT__ : null;
function __radarMerge(a: any, b: any): any {
  if (b === undefined || b === null) return a;
  if (Array.isArray(b)) return b;
  if (typeof b === "object" && a && typeof a === "object" && !Array.isArray(a)) {
    const o: any = { ...a };
    for (const k of Object.keys(b)) o[k] = __radarMerge(a[k], b[k]);
    return o;
  }
  return b;
}
const __radarBase: any = __radarMerge(content, __RADAR_EDITS__);
const __radarContent = (__radarOverride ? __radarMerge(__radarBase, __radarOverride) : __radarBase) as typeof content;
export default __radarContent;
`;

/** Se o Vite gerou arquivos separados, embute tudo no index.html. */
function inline(dist) {
  let html = readFileSync(join(dist, 'index.html'), 'utf8');
  html = html.replace(/<script([^>]*?)\ssrc="\/?([^"]+)"([^>]*)><\/script>/g, (m, a, src, b) => {
    const p = join(dist, src);
    return existsSync(p) ? `<script${a}${b}>${readFileSync(p, 'utf8').replace(/<\/script/g, '<\\/script')}</script>` : m;
  });
  html = html.replace(/<link([^>]*?)rel="stylesheet"([^>]*?)href="\/?([^"]+)"([^>]*)>/g, (m, a, b, href) => {
    const p = join(dist, href);
    return existsSync(p) && !href.startsWith('http') ? `<style>${readFileSync(p, 'utf8')}</style>` : m;
  });
  return html;
}

let browser = null;
async function shot(htmlPath, out) {
  try {
    if (!browser) {
      const req = createRequire(join(TMP, '_pw', 'x.js'));
      const { chromium } = req('playwright');
      // o GitHub já tem o Chrome instalado: usa ele (não precisa baixar navegador)
      browser = await chromium.launch({ channel: 'chrome' }).catch(() => chromium.launch());
    }
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto('file://' + htmlPath, { waitUntil: 'load', timeout: 45000 }).catch(() => {});
    await page.waitForTimeout(3500);
    // força as animações de entrada a aparecerem
    await page.addStyleTag({ content: '*{animation-delay:0s!important;transition:none!important}[class*="reveal"],[data-reveal]{opacity:1!important;transform:none!important}' }).catch(() => {});
    await page.waitForTimeout(800);
    await page.screenshot({ path: out, type: 'jpeg', quality: 72 });
    await page.close();
  } catch (e) {
    console.log('  (sem miniatura)', String(e?.message || e).slice(0, 200));
  }
}

async function main() {
  if (!existsSync(DIR)) return console.log('Sem pasta', DIR);
  mkdirSync(TMP, { recursive: true });
  // playwright para as miniaturas
  try {
    mkdirSync(join(TMP, '_pw'), { recursive: true });
    execSync('npm init -y >/dev/null && npm i playwright@1.49.1 --no-audit --no-fund --prefer-offline >/dev/null', { cwd: join(TMP, '_pw'), stdio: 'inherit', shell: '/bin/bash' });
  } catch {
    console.log('playwright indisponível: os modelos saem sem miniatura');
  }

  const names = readdirSync(DIR).filter((n) => !n.startsWith('.') && !n.startsWith('_') && statSync(join(DIR, n)).isDirectory());
  for (const name of names) {
    if (only && !only.has(name)) continue;
    const folder = join(DIR, name);
    const out = join(folder, '_build');
    // pasta que sobrou só com a compilação (o modelo foi apagado): remove
    if (!files(folder).length) {
      rmSync(folder, { recursive: true, force: true });
      console.log(`- ${name} (modelo apagado: removida a compilação que sobrou)`);
      continue;
    }
    const list = files(folder);
    const hash = createHash('sha1');
    for (const f of list) hash.update(f).update(readFileSync(join(folder, f)));
    const h = hash.digest('hex');
    let prev = {};
    try {
      prev = JSON.parse(readFileSync(join(out, 'meta.json'), 'utf8'));
    } catch {}
    if (prev.hash === h && prev.ok && !process.env.FORCE) {
      console.log(`= ${name} (sem mudanças)`);
      continue;
    }
    console.log(`> ${name}`);
    const meta = { hash: h, ok: false, built_at: new Date().toISOString(), error: null, name: null };
    mkdirSync(out, { recursive: true });
    try {
      const root = projectRoot(folder);
      if (!root) throw new Error('Não achei o package.json. Envie o .zip do projeto inteiro (pasta src, index.html, package.json…).');
      const work = join(TMP, name);
      rmSync(work, { recursive: true, force: true });
      cpSync(root, work, { recursive: true, filter: (s) => !/\/(node_modules|_build|dist|\.git)(\/|$)/.test(s) });
      const cpath = join(work, 'src', 'content.ts');
      if (!existsSync(cpath)) throw new Error('Falta o arquivo src/content.ts (todo o conteúdo do site num arquivo só). Gere o modelo com o prompt do painel.');
      const src = readFileSync(cpath, 'utf8');
      // aceita "export default content;" ou outro nome (export default siteContent;)
      const ident = (src.match(/export\s+default\s+(\w+)\s*;?\s*$/m) || [])[1];
      if (!ident) throw new Error('O src/content.ts precisa terminar com "export default content;".');
      // conteúdo padrão em JSON (para a IA personalizar)
      execSync('npm install --no-audit --no-fund --prefer-offline --loglevel=error', { cwd: work, stdio: 'inherit' });
      let json = execSync(`npx -y tsx -e "import c from './src/content.ts'; process.stdout.write(JSON.stringify(c))"`, { cwd: work, maxBuffer: 20 * 1024 * 1024 }).toString();
      // acabamento do editor visual (se houver) vira o conteúdo padrão do modelo
      let edits = null;
      const ov = join(folder, 'content.override.json');
      if (existsSync(ov)) {
        try {
          edits = JSON.parse(readFileSync(ov, 'utf8'));
          json = JSON.stringify(merge(JSON.parse(json), edits));
          console.log('  com acabamento do editor visual');
        } catch (e) {
          console.log('  content.override.json inválido, ignorado:', String(e?.message || e).slice(0, 120));
          edits = null;
        }
      }
      JSON.parse(json);
      writeFileSync(join(out, 'content.json'), json);
      writeFileSync(cpath, src.replace(/export\s+default\s+\w+\s*;?\s*$/m, () => SHIM.replace(/\bcontent\b/g, ident).replace('__RADAR_EDITS__', () => (edits ? JSON.stringify(edits) : 'null'))));
      execSync('npx vite build', { cwd: work, stdio: 'inherit' });
      const html = inline(join(work, 'dist'));
      writeFileSync(join(out, 'index.html'), html);
      await shot(join(out, 'index.html'), join(out, 'thumb.jpg'));
      meta.ok = true;
      try {
        meta.name = JSON.parse(json)?.brand?.name || null;
      } catch {}
      console.log(`  ok (${Math.round(html.length / 1024)} KB)`);
    } catch (e) {
      meta.error = String(e?.message || e).slice(0, 500);
      console.log('  ERRO', meta.error);
    }
    writeFileSync(join(out, 'meta.json'), JSON.stringify(meta, null, 2));
  }
  if (browser) await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
