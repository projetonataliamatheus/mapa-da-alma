'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { SitesTabs } from '@/components/SitesTabs';
import { PageHead } from '@/components/PageHead';
import { Icon, Ib } from '@/components/Icon';
import { api, toast, timeLabel, useLive, copyText } from '@/components/ui';
import { useCan } from '@/components/Shell';
import { ARENA_PROMPT } from '@/lib/arena-prompt';

/** "Fisioterapeuta_Premium (1).zip" → "Fisioterapeuta Premium" */
function nameFromFile(f: string) {
  return f
    .replace(/\.zip$/i, '')
    .replace(/\(\d+\)$/, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

type Item = { file: File; name: string; state: 'fila' | 'enviando' | 'ok' | 'erro' | 'dup'; msg?: string };

const keyOf = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');

function Upload({ onDone, replace, existing = [] }: { onDone: () => void; replace?: { slug: string; name: string } | null; existing?: { slug: string; name: string }[] }) {
  const [items, setItems] = useState<Item[]>([]);
  const [busy, setBusy] = useState(false);
  function pick(list: FileList | null) {
    const fs = Array.from(list || []).filter((f) => /\.zip$/i.test(f.name));
    if (list && fs.length < list.length) toast('Só arquivos .zip são aceitos (os outros foram ignorados)');
    if (replace) return setItems(fs.slice(0, 1).map((f) => ({ file: f, name: nameFromFile(f.name), state: 'fila' as const })));
    // sem duplicados: o mesmo arquivo/nome na lista ou um modelo que já existe não entra
    const have = new Set(existing.flatMap((t) => [keyOf(t.name), keyOf(t.slug)]));
    let skipped = 0;
    setItems((old) => {
      const seen = new Set(old.map((x) => keyOf(x.name)));
      const add: Item[] = [];
      for (const f of fs) {
        const name = nameFromFile(f.name);
        const k = keyOf(name);
        if (seen.has(k)) {
          skipped++;
          continue;
        }
        seen.add(k);
        add.push(have.has(k) ? { file: f, name, state: 'dup', msg: 'Já existe um modelo com este nome: não vai ser enviado de novo (use Substituir no modelo para trocar).' } : { file: f, name, state: 'fila' });
      }
      return [...old, ...add];
    });
    setTimeout(() => skipped && toast(`${skipped} arquivo(s) repetido(s) na seleção foram ignorados`), 0);
  }
  async function sendOne(it: Item) {
    const fd = new FormData();
    fd.append('file', it.file);
    fd.append('name', it.name);
    fd.append('niche', it.name);
    if (replace) fd.append('replace', replace.slug);
    // GitHub ocupado (outro envio/compilação ao mesmo tempo): tenta de novo sozinho
    for (let t = 0; ; t++) {
      try {
        return await api('/api/premium', 'POST', fd);
      } catch (e: any) {
        if (t < 2 && /ocupado|422|fast forward|409|Failed to fetch|timeout/i.test(String(e.message))) {
          await new Promise((r) => setTimeout(r, 2500 * (t + 1)));
          continue;
        }
        throw e;
      }
    }
  }
  async function send(onlyErrors = false) {
    setBusy(true);
    let ok = 0;
    // um por vez: cada um vira um commit na pasta Modelos do GitHub
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (it.state === 'ok' || it.state === 'dup') continue;
      if (onlyErrors && it.state !== 'erro') continue;
      setItems((old) => old.map((x, k) => (k === i ? { ...x, state: 'enviando', msg: undefined } : x)));
      try {
        const r = await sendOne(it);
        ok++;
        setItems((old) => old.map((x, k) => (k === i ? { ...x, state: 'ok', msg: `pasta ${r.slug}` } : x)));
      } catch (e: any) {
        const dup = /já existe/i.test(String(e.message));
        setItems((old) => old.map((x, k) => (k === i ? { ...x, state: dup ? 'dup' : 'erro', msg: e.message } : x)));
        // limite do GitHub: para aqui (os próximos dariam o mesmo erro); continua depois com "Enviar"
        if (/Limite de pedidos do GitHub/i.test(String(e.message))) {
          toast(String(e.message));
          break;
        }
      }
    }
    setBusy(false);
    if (ok) {
      toast(`${ok} modelo(s) enviado(s). Compilando no GitHub (1 a 2 min)… Nome e nicho dá para mudar depois em Renomear.`);
      onDone();
    }
  }
  const pending = items.filter((x) => x.state === 'fila' || x.state === 'erro').length;
  const errors = items.filter((x) => x.state === 'erro').length;
  return (
    <div className="grid" style={{ gap: 8 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <label className="btn btn-sm" style={{ cursor: 'pointer' }}>
          <Icon name="upload" /> {replace ? 'Escolher o .zip novo' : 'Escolher um ou vários .zip'}
          <input type="file" accept=".zip,application/zip" multiple={!replace} hidden onChange={(e) => (pick(e.target.files), (e.target.value = ''))} />
        </label>
        <button className="btn btn-sm btn-p" onClick={() => send()} disabled={busy || !pending}>
          {busy ? <span className="spin" /> : <Icon name="check" />}
          {busy ? 'Enviando para o GitHub…' : replace ? `Substituir "${replace.name}"` : `Enviar ${pending || ''} modelo(s)`}
        </button>
        {errors > 0 && !busy && (
          <button className="btn btn-sm" style={{ borderColor: 'var(--warn)' }} onClick={() => send(true)}>
            <Icon name="refresh" /> Reenviar os que deram erro ({errors})
          </button>
        )}
        {items.length > 0 && !busy && (
          <button className="btn btn-sm btn-g" onClick={() => setItems([])}>
            Limpar lista
          </button>
        )}
      </div>
      {items.length > 0 && (
        <div className="grid" style={{ gap: 6 }}>
          {items.map((it, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13 }}>
              <span style={{ width: 18 }}>{it.state === 'ok' ? '✅' : it.state === 'erro' ? '⚠️' : it.state === 'dup' ? '⛔' : it.state === 'enviando' ? <span className="spin" /> : '•'}</span>
              {replace ? (
                <b style={{ flex: 1 }}>{it.file.name}</b>
              ) : (
                <input
                  className="input"
                  style={{ flex: 1, height: 32 }}
                  value={it.name}
                  disabled={it.state !== 'fila' && it.state !== 'erro'}
                  onChange={(e) => setItems((old) => old.map((x, k) => (k === i ? { ...x, name: e.target.value } : x)))}
                  aria-label={`Nome do modelo ${it.file.name}`}
                  title="Nome e nicho do modelo (dá para mudar depois em Renomear)"
                />
              )}
              <small className="muted" style={{ whiteSpace: 'nowrap' }}>{Math.round(it.file.size / 1024)} KB</small>
              {it.msg && <small className={it.state === 'erro' ? 'err' : 'muted'} style={{ maxWidth: 260 }}>{it.msg}</small>}
              {it.state === 'fila' && !busy && (
                <button className="linkbtn" aria-label="Tirar da lista" onClick={() => setItems((old) => old.filter((_, k) => k !== i))}>
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const PUB: Record<string, [string, string]> = { masculino: ['♂ Masculino', '#2563eb'], feminino: ['♀ Feminino', '#db2777'] };

/** Duplicar o modelo para fazer a versão do outro público (homens/mulheres). */
function Duplicate({ t, onDone, onCancel }: { t: any; onDone: (slug: string) => void; onCancel: () => void }) {
  const [aud, setAud] = useState<string>(t.audience === 'feminino' ? 'masculino' : 'feminino');
  const [orig, setOrig] = useState<string>(t.audience || (t.audience === 'feminino' ? 'feminino' : 'masculino'));
  const [busy, setBusy] = useState(false);
  async function go() {
    setBusy(true);
    try {
      const r = await api('/api/premium', 'PATCH', { action: 'duplicate', slug: t.slug, audience: aud || null, original_audience: t.audience ? null : orig || null });
      toast(`Cópia "${r.name}" criada. Agora troque as fotos no Editor visual.`);
      onDone(r.slug);
    } catch (e: any) {
      toast(e.message);
    }
    setBusy(false);
  }
  return (
    <div className="grid" style={{ gap: 6, padding: 10, border: '1px dashed var(--line)', borderRadius: 10 }}>
      <label style={{ fontSize: 12.5 }}>
        A cópia é para:{' '}
        <select className="input" style={{ height: 30, display: 'inline-block', width: 'auto' }} value={aud} onChange={(e) => setAud(e.target.value)}>
          <option value="feminino">Mulheres</option>
          <option value="masculino">Homens</option>
          <option value="">Todos</option>
        </select>
      </label>
      {!t.audience && aud && (
        <label style={{ fontSize: 12.5 }}>
          E este original fica para:{' '}
          <select className="input" style={{ height: 30, display: 'inline-block', width: 'auto' }} value={orig} onChange={(e) => setOrig(e.target.value)}>
            <option value="masculino">Homens</option>
            <option value="feminino">Mulheres</option>
            <option value="">Todos</option>
          </select>
        </label>
      )}
      <div style={{ display: 'flex', gap: 6 }}>
        <button className="btn btn-sm btn-p" onClick={go} disabled={busy}>
          {busy ? <span className="spin" /> : <Icon name="copy" />} Duplicar
        </button>
        <button className="btn btn-sm btn-g" onClick={onCancel}>
          Cancelar
        </button>
      </div>
    </div>
  );
}

export default function ModelosPremium() {
  async function sampleLink(slug: string) {
    try {
      const r = await api('/api/modelos/amostra', 'POST', { slug, minutes: 10 });
      await copyText(r.url);
      toast(`Link copiado! Vale até ${new Date(r.expires).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} (10 min). Depois disso mostra "link expirado".`);
    } catch (e: any) {
      toast(e.message);
    }
  }

  const can = useCan();
  const edit = can('modelos.editar');
  const [d, setD] = useState<any>(null);
  const [syncing, setSyncing] = useState(false);
  const [del, setDel] = useState<string | null>(null);
  const [dup, setDup] = useState<string | null>(null);
  const [ren, setRen] = useState<{ slug: string; name: string; niche: string } | null>(null);
  const [rep, setRep] = useState<{ slug: string; name: string } | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [q, setQ] = useState('');
  const [fNiche, setFNiche] = useState('');
  const [fState, setFState] = useState('');
  async function load() {
    try {
      setD(await api('/api/premium', 'GET'));
    } catch (e: any) {
      toast(e.message);
    }
  }
  useLive(['premium_templates'], load);
  // modelo compilando: confere o GitHub a cada 15 s e mostra assim que ficar pronto
  const compiling = (d?.templates || []).some((t: any) => t.status === 'compilando');
  useEffect(() => {
    const t = setInterval(
      () => (compiling ? api('/api/premium', 'PATCH', { action: 'sync' }).catch(() => {}).then(load) : load()),
      compiling ? 15000 : 30000,
    );
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [compiling]);
  async function act(body: any, msg: string) {
    try {
      await api('/api/premium', 'PATCH', body);
      toast(msg);
      load();
    } catch (e: any) {
      toast(e.message);
    }
  }
  async function sync() {
    setSyncing(true);
    try {
      const r = await api('/api/premium', 'PATCH', { action: 'sync' });
      toast(r.ok ? `Sincronizado: ${r.total} modelo(s) no GitHub${r.changed ? `, ${r.changed} atualizado(s)` : ''}` : r.reason);
      load();
    } catch (e: any) {
      toast(e.message);
    }
    setSyncing(false);
  }
  const list: any[] = d?.templates || [];
  // busca por nome, nicho, estilo e descrição (sem acento, várias palavras)
  const nq = (t: string) => String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const words = nq(q).split(/\s+/).filter(Boolean);
  const nicheList = Array.from(new Set(list.map((t) => String(t.niche || '').trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  const shownT = list.filter((t) => {
    if (fNiche && String(t.niche || '').trim() !== fNiche) return false;
    if (fState === 'prontos' && !(t.build_ok && t.active !== false)) return false;
    if (fState === 'pausados' && t.active !== false) return false;
    if (fState === 'erro' && t.status !== 'erro') return false;
    if (fState === 'masculino' && t.audience !== 'masculino') return false;
    if (fState === 'feminino' && t.audience !== 'feminino') return false;
    if (!words.length) return true;
    const hay = nq([t.name, t.slug, t.niche, t.style, t.description, t.tags, t.keywords, t.search_text].flat().filter(Boolean).join(' '));
    return words.every((w) => hay.includes(w));
  });
  return (
    <>
      <PageHead title="Sites" sub="Sites prontos (Arena) na pasta Modelos do GitHub. A IA escolhe o do nicho do cliente e só troca nome, cores e textos" icon="globe" tone="ai" help="modelos">
        {d?.url && (
          <a className="btn" href={d.url} target="_blank" rel="noreferrer">
            <Icon name="ext" /> Pasta no GitHub
          </a>
        )}
        <button className="btn btn-p" onClick={sync} disabled={syncing || !d?.configured}>
          {syncing ? <span className="spin" /> : <Icon name="refresh" />}
          {syncing ? 'Sincronizando…' : 'Sincronizar agora'}
        </button>
      </PageHead>
      <SitesTabs />

      {d && !d.configured && (
        <div className="alert" style={{ marginBottom: 12, borderColor: 'var(--warn)' }}>
          <Icon name="alert" className="status-warn" />
          <div style={{ fontSize: 13 }}>
            Falta ligar o GitHub: crie um token (GitHub › Settings › Developer settings › Fine-grained tokens) só para o repositório <b>{d.repo}</b> com <b>Contents: Read and write</b> e <b>Actions: Read</b>, e cole como <b className="mono">GITHUB_TOKEN</b> no Easypanel (Ambiente) › Implantar.
          </div>
        </div>
      )}
      {d?.missingTable && (
        <div className="alert" style={{ marginBottom: 12, borderColor: 'var(--bad)' }}>
          <Icon name="alert" className="status-bad" />
          <div style={{ fontSize: 13 }}>Rode a migração <b>017_modelos_premium.sql</b> no Supabase.</div>
        </div>
      )}

      {d && (
        <div className="tpl-count" aria-label="Contagem de modelos premium">
          {(
            [
              ['Modelos premium', list.length, 'var(--ai)', 'no total'],
              ['Prontos', list.filter((t) => t.build_ok && t.active !== false).length, 'var(--ok)', 'em uso pela IA'],
              ['Compilando', list.filter((t) => t.status === 'compilando').length, 'var(--warn)', 'no GitHub agora'],
              ['Com erro', list.filter((t) => t.status === 'erro').length, 'var(--bad)', 'reenviar ou substituir'],
              ['♂ Masculinos', list.filter((t) => t.audience === 'masculino').length, '#2563eb', 'público homens'],
              ['♀ Femininos', list.filter((t) => t.audience === 'feminino').length, '#db2777', 'público mulheres'],
              ['Pausados', list.filter((t) => t.active === false).length, 'var(--muted)', 'não são sugeridos'],
            ] as [string, number, string, string][]
          ).map(([l, v, c, h], i) => (
            <div key={l} className={`card kpi${i === 0 ? ' tpl-total' : ''}`} style={{ ['--c' as any]: c }} title={h}>
              <span className="l">{l}</span>
              <span className="v num" style={{ color: c }}>
                {v}
              </span>
              <small className="muted" style={{ fontSize: 11.5 }}>
                {h}
              </small>
            </div>
          ))}
        </div>
      )}

      <div className="grid g-2" style={{ marginBottom: 14 }}>
        {edit && (
          <div className="card">
            <div className="card-h">
              <Ib name="upload" tone="gg" size="sm" />
              <h2>Enviar modelo novo</h2>
            </div>
            <p className="muted" style={{ fontSize: 12.5, marginBottom: 8 }}>
              Selecione um ou vários .zip da Arena de uma vez: o nome do arquivo vira o nome e o nicho (dá para mudar antes de enviar ou depois em Renomear). Cada um vai para <b>{d?.dir || 'Modelos'}/nome-do-nicho</b> no GitHub, compila sozinho (2 a 4 min) e aparece aqui com a miniatura. Também dá para subir direto no GitHub: em até 5 minutos aparece aqui.
            </p>
            <Upload onDone={load} existing={list} />
          </div>
        )}
        <div className="card">
          <div className="card-h" style={{ flexWrap: 'wrap' }}>
            <Ib name="spark" tone="ai" size="sm" />
            <h2 style={{ flex: 1 }}>Prompt para gerar na Arena</h2>
            <button className="btn btn-sm" onClick={() => copyText(ARENA_PROMPT)}>
              <Icon name="copy" /> Copiar
            </button>
            <button className="btn btn-sm btn-g" onClick={() => setShowPrompt(!showPrompt)}>
              {showPrompt ? 'Esconder' : 'Ver'}
            </button>
          </div>
          <p className="muted" style={{ fontSize: 12.5 }}>
            Na Arena: <b>Create a landing page</b> → apague o texto → cole este prompt → troque só os 3 campos entre colchetes → envie → baixe o .zip.
          </p>
          {showPrompt && <pre className="aisum pre" style={{ fontSize: 12, marginTop: 8, maxHeight: 280, overflow: 'auto', whiteSpace: 'pre-wrap' }}>{ARENA_PROMPT}</pre>}
          {d?.run && (
            <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>
              Última compilação no GitHub:{' '}
              <a className="linkbtn" href={d.run.url} target="_blank" rel="noreferrer">
                {d.run.status === 'completed' ? (d.run.conclusion === 'success' ? '✓ concluída' : '✗ ' + d.run.conclusion) : '⏳ rodando'}
              </a>{' '}
              · {timeLabel(d.run.at)}
            </p>
          )}
        </div>
      </div>

      {rep && (
        <div className="card" style={{ marginBottom: 14 }}>
          <div className="card-h">
            <h2 style={{ flex: 1 }}>Substituir o modelo "{rep.name}"</h2>
            <button className="btn btn-sm btn-g" onClick={() => setRep(null)}>
              Cancelar
            </button>
          </div>
          <Upload replace={rep} onDone={() => (setRep(null), load())} />
        </div>
      )}

      {list.length > 0 && (
        <div className="tpl-search">
          <div className="tpl-search-in">
            <Icon name="search" />
            <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar modelo por nicho, nome ou estilo (ex.: advocacia, pizzaria, elegante)" aria-label="Buscar modelos" />
            {q && (
              <button type="button" className="iconbtn" onClick={() => setQ('')} aria-label="Limpar busca">
                <Icon name="x" />
              </button>
            )}
          </div>
          <select className="input" value={fNiche} onChange={(e) => setFNiche(e.target.value)} aria-label="Filtrar por nicho">
            <option value="">Todos os nichos ({nicheList.length})</option>
            {nicheList.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          <select className="input" value={fState} onChange={(e) => setFState(e.target.value)} aria-label="Filtrar por situação">
            <option value="">Todos</option>
            <option value="prontos">Prontos</option>
            <option value="masculino">♂ Masculinos</option>
            <option value="feminino">♀ Femininos</option>
            <option value="pausados">Pausados</option>
            <option value="erro">Com erro</option>
          </select>
          <span className="muted" style={{ fontSize: 12.5, whiteSpace: 'nowrap' }}>
            {shownT.length} de {list.length}
          </span>
        </div>
      )}
      {list.length > 0 && shownT.length === 0 && (
        <div className="card">
          <p className="muted">Nenhum modelo com essa busca. Tente outra palavra (ex.: o ramo do cliente).</p>
        </div>
      )}
      {list.length === 0 ? (
        <div className="card">
          <p className="muted">Nenhum modelo ainda. Envie o primeiro .zip acima ou coloque na pasta Modelos do GitHub e clique em Sincronizar agora.</p>
        </div>
      ) : (
        <div className="grid g-3">
          {shownT.map((t) => (
            <div key={t.slug} className="card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', opacity: t.active === false ? 0.55 : 1 }}>
              <div style={{ aspectRatio: '16/10', background: 'var(--surface-2)', display: 'grid', placeItems: 'center', overflow: 'hidden' }}>
                {t.thumb_url ? (
                  <img src={t.thumb_url} alt={`Miniatura do modelo ${t.name}`} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} loading="lazy" />
                ) : (
                  <span className="muted" style={{ fontSize: 13 }}>{t.status === 'compilando' ? '⏳ Compilando no GitHub…' : t.status === 'erro' ? '✗ Erro na compilação' : 'Sem miniatura'}</span>
                )}
              </div>
              <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
                {ren?.slug === t.slug ? (
                  <div className="grid" style={{ gap: 6 }}>
                    <input className="input" value={ren.name} onChange={(e) => setRen({ ...ren, name: e.target.value })} aria-label="Nome" />
                    <input className="input" value={ren.niche} onChange={(e) => setRen({ ...ren, niche: e.target.value })} placeholder="Nicho" aria-label="Nicho" />
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-sm btn-p" onClick={() => (act({ action: 'rename', slug: t.slug, name: ren.name, niche: ren.niche }, 'Nome atualizado (no GitHub também)'), setRen(null))}>
                        Salvar
                      </button>
                      <button className="btn btn-sm btn-g" onClick={() => setRen(null)}>
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <b style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                    {t.name}
                    {t.audience && PUB[t.audience] && (
                      <span className="chiptag" style={{ ['--c' as any]: PUB[t.audience][1] }}>
                        {PUB[t.audience][0]}
                      </span>
                    )}
                    {t.edited_at && (
                      <span className="chip" style={{ fontSize: 10.5, ['--t' as any]: 'var(--ok)' }} title="Com acabamento feito no editor visual">
                        ✓ acabamento
                      </span>
                    )}
                  </b>
                )}
                <small className="muted">
                  {t.slug} · {t.uses || 0} prévia(s){t.style ? ` · ${t.style}` : ''}
                </small>
                {t.description && <p style={{ fontSize: 12.5, color: 'var(--ink-2)' }}>{t.description}</p>}
                {(t.niches || []).length > 0 && (
                  <div className="chips">
                    {(t.niches || []).slice(0, 8).map((n: string) => (
                      <span key={n} className="chip" style={{ fontSize: 11 }}>
                        {n}
                      </span>
                    ))}
                  </div>
                )}
                {t.build_error && <p className="err" style={{ fontSize: 12 }}>{t.build_error}</p>}
                {edit && (
                  <label style={{ fontSize: 12.5, display: 'flex', gap: 6, alignItems: 'center' }}>
                    Público:
                    <select
                      className="input"
                      style={{ height: 30, width: 'auto' }}
                      value={t.audience || ''}
                      onChange={(e) => act({ action: 'audience', slug: t.slug, audience: e.target.value || null }, 'Público salvo (no GitHub também)')}
                      aria-label={`Público do modelo ${t.name}`}
                    >
                      <option value="">Todos</option>
                      <option value="masculino">Homens</option>
                      <option value="feminino">Mulheres</option>
                    </select>
                  </label>
                )}
                {dup === t.slug && <Duplicate t={t} onCancel={() => setDup(null)} onDone={() => (setDup(null), load())} />}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 'auto' }}>
                  {t.build_ok && (
                    <a className="btn btn-sm" href={`/modelo/${t.slug}`} target="_blank" rel="noreferrer">
                      <Icon name="eye" /> Ver modelo
                    </a>
                  )}
                  {t.build_ok && (
                    <button className="btn btn-sm btn-g" title="Link público que expira em 10 minutos: para mostrar este modelo a um cliente e ver se ele gosta" onClick={() => sampleLink(t.slug)}>
                      <Icon name="clock" /> Link 10 min
                    </button>
                  )}
                  {edit && t.build_ok && (
                    <Link className="btn btn-sm btn-p" href={`/modelos-premium/editar/${t.slug}`}>
                      <Icon name="sliders" /> Editor visual
                    </Link>
                  )}
                  {edit && (
                    <>
                      <button className="btn btn-sm btn-g" onClick={() => setDup(t.slug)}>
                        <Icon name="copy" /> Duplicar
                      </button>
                      <button className="btn btn-sm btn-g" onClick={() => setRen({ slug: t.slug, name: t.name, niche: t.niche || '' })}>
                        Renomear
                      </button>
                      <button className="btn btn-sm btn-g" onClick={() => (setRep({ slug: t.slug, name: t.name }), window.scrollTo({ top: 0, behavior: 'smooth' }))}>
                        Substituir
                      </button>
                      <button className="btn btn-sm btn-g" onClick={() => act({ action: 'active', slug: t.slug, active: t.active === false }, t.active === false ? 'Modelo ativado' : 'Modelo pausado (não é sugerido)')}>
                        {t.active === false ? 'Ativar' : 'Pausar'}
                      </button>
                      {del === t.slug ? (
                        <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                          <small>Apagar do GitHub?</small>
                          <button className="btn btn-sm" style={{ color: 'var(--bad)' }} onClick={() => (act({ action: 'delete', slug: t.slug }, 'Modelo apagado (e removido do GitHub)'), setDel(null))}>
                            Apagar
                          </button>
                          <button className="btn btn-sm btn-g" onClick={() => setDel(null)}>
                            Não
                          </button>
                        </span>
                      ) : (
                        <button className="iconbtn" aria-label={`Apagar ${t.name}`} onClick={() => setDel(t.slug)}>
                          <Icon name="trash" />
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
