'use client';
import { useEffect, useMemo, useState } from 'react';
import { PageHead } from '@/components/PageHead';
import { Icon, Ib } from '@/components/Icon';
import { api, toast, timeLabel, useLive } from '@/components/ui';
import { sb } from '@/lib/supabase/browser';
import { KINDS } from '@/lib/knowledge-kinds';
import { norm } from '@/lib/util';
import { useCan } from '@/components/Shell';

type Up = { name: string; pct: number; state: 'enviando' | 'lendo' | 'ok' | 'erro'; msg?: string };

function uploadFile(file: File, onPct: (p: number) => void): Promise<any> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/knowledge');
    xhr.upload.onprogress = (e) => e.lengthComputable && onPct(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => {
      let j: any = {};
      try {
        j = JSON.parse(xhr.responseText);
      } catch {}
      xhr.status < 300 ? resolve(j) : reject(new Error(j.error || 'Falha no envio (' + xhr.status + ')'));
    };
    xhr.onerror = () => reject(new Error('Falha de conexão no envio'));
    const fd = new FormData();
    fd.append('file', file);
    xhr.send(fd);
  });
}

function statusChip(d: any) {
  if (d.status === 'aprendendo') {
    const pct = d.sections ? Math.round((d.sections_done / d.sections) * 100) : 0;
    return (
      <div style={{ minWidth: 160 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
          <span style={{ color: d.error ? 'var(--warn)' : 'var(--ai)', fontWeight: 600 }}>{d.error ? 'Parado' : 'IA lendo…'}</span>
          <b className="num">{pct}%</b>
        </div>
        <div className="progress">
          <i style={{ width: `${pct}%`, background: d.error ? 'var(--warn)' : 'var(--ai)' }} />
        </div>
        {d.error && (
          <p style={{ fontSize: 12, color: 'var(--warn)', marginTop: 6, maxWidth: 280, lineHeight: 1.35 }}>
            {d.error}
          </p>
        )}
      </div>
    );
  }
  const map: Record<string, [string, string]> = { excluindo: ['Excluindo…', 'bad'], processado: ['Aprendido', 'ok'], processando: ['Preparando', 'warn'], erro: ['Erro', 'bad'], vazio: ['Sem texto', 'bad'] };
  const [l, t] = map[d.status] || [d.status, 'mut'];
  return (
    <span className="chip" style={{ ['--t' as any]: `var(--${t === 'mut' ? 'muted' : t})` }} title={d.error || ''}>
      {l}
    </span>
  );
}

function PriorityBadge({ d, onSet }: { d: any; onSet: (p: string) => void }) {
  const prim = d.priority === 'primario';
  return (
    <button
      data-perm="conhecimento.enviar"
      className="chip"
      style={{ cursor: 'pointer', whiteSpace: 'nowrap', ['--t' as any]: prim ? 'var(--bad)' : 'var(--ai)' }}
      title={prim ? 'Base principal: guia ~70% da estratégia da IA. Clique para virar Apoio.' : 'Apoio: só lapida texto, gatilhos e empatia (~30%). Clique para virar Base principal.'}
      onClick={() => onSet(prim ? 'secundario' : 'primario')}
    >
      {prim ? '🔥 Primário' : '⚡ Secundário'}
    </button>
  );
}

function PromptMaster() {
  const can = useCan();
  const master = can('config');
  const [text, setText] = useState('');
  const [saved, setSaved] = useState('');
  const [info, setInfo] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  async function load() {
    try {
      const r = await api('/api/knowledge/master', 'GET');
      setText(r.content || '');
      setSaved(r.content || '');
      setInfo(r);
    } catch {}
  }
  useEffect(() => {
    load();
  }, []);
  async function save() {
    setSaving(true);
    try {
      await api('/api/knowledge/master', 'PUT', { content: text });
      setSaved(text);
      toast('Prompt Master salvo. Já vale na próxima mensagem da IA');
      load();
    } catch (e: any) {
      toast(e.message);
    }
    setSaving(false);
  }
  const dirty = text !== saved;
  return (
    <div className="card" style={{ borderColor: 'var(--accent)' }}>
      <div className="card-h">
        <Ib name="shield" tone="acc" size="sm" />
        <h2>Prompt Master / Identidade Fixa da Automação</h2>
      </div>
      <p className="muted" style={{ fontSize: 12.5, marginBottom: 8 }}>
        Lei máxima do Mapa da Alma. Vai sempre no topo de tudo o que a IA lê no WhatsApp (prospecção, respostas, negociação, follow-up e o teste da base), antes do Cérebro de vendas. A atualização do cérebro nunca mexe neste texto.
      </p>
      {info?.missing && <p className="err" style={{ fontSize: 12.5, marginBottom: 8 }}>Rode a migração 013_base_ativa.sql no Supabase para salvar.</p>}
      <textarea
        className="input"
        style={{ minHeight: 160, fontSize: 13 }}
        value={text}
        readOnly={!master}
        onChange={(e) => setText(e.target.value)}
        placeholder={'Ex.: Somos o Mapa da Alma. Nosso posicionamento é… Nunca prometemos… Sempre destacamos pagamento único, sem mensalidade… Nosso tom é…'}
        aria-label="Prompt Master"
      />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
        <small className="muted" style={{ flex: 1 }}>
          {text.length.toLocaleString('pt-BR')} caracteres
          {info?.updated_by && saved ? ` · salvo por ${info.updated_by} ${timeLabel(info.updated_at)}` : ''}
          {!master ? ' · só o Master edita' : ''}
        </small>
        {master && (
          <button className="btn btn-sm btn-p" onClick={save} disabled={saving || !dirty}>
            {saving ? <span className="spin" /> : <Icon name="check" />}
            {saving ? 'Salvando…' : dirty ? 'Salvar' : 'Salvo'}
          </button>
        )}
      </div>
    </div>
  );
}

export default function Conhecimento() {
  const [docs, setDocs] = useState<any[]>([]);
  const [brain, setBrain] = useState<any>(null);
  const [ups, setUps] = useState<Up[]>([]);
  const [note, setNote] = useState({ name: '', text: '' });
  const [ins, setIns] = useState<any[]>([]);
  const [kind, setKind] = useState('');
  const [qual, setQual] = useState('');
  const [order, setOrder] = useState<'nota' | 'uso'>('nota');
  const [delId, setDelId] = useState<number | null>(null);
  const [delWeak, setDelWeak] = useState(false);
  const [rating, setRating] = useState(false);
  async function delInsight(id: number) {
    try {
      await api('/api/knowledge', 'PATCH', { action: 'delete_insights', ids: [id] });
      setIns((old) => old.filter((x) => x.id !== id));
      setDelId(null);
      toast('Técnica excluída: a IA não usa mais');
    } catch (e: any) {
      toast(e.message);
    }
  }
  async function delWeakAll() {
    try {
      const r = await api('/api/knowledge', 'PATCH', { action: 'delete_weak', below: 4 });
      setDelWeak(false);
      toast(`${r.deleted} técnicas fracas excluídas`);
      loadInsights();
    } catch (e: any) {
      toast(e.message);
    }
  }
  async function rateNow() {
    setRating(true);
    try {
      const r = await api('/api/knowledge', 'PATCH', { action: 'rate' });
      toast(r.rated ? `${r.rated} técnicas avaliadas` : 'Todas as técnicas já têm nota');
      loadInsights();
    } catch (e: any) {
      toast(e.message);
    }
    setRating(false);
  }
  const [doc, setDoc] = useState('');
  const [q, setQ] = useState('');
  const [busyBrain, setBusyBrain] = useState(false);
  const [test, setTest] = useState({ text: 'Achei caro, vou pensar e te falo depois', stage: 'negociando' });
  const [result, setResult] = useState<any>(null);
  const [testing, setTesting] = useState(false);
  const [confirm, setConfirm] = useState<string | null>(null);

  async function load() {
    const [{ data: d }, { data: b }] = await Promise.all([sb().from('knowledge_docs').select('*').order('created_at', { ascending: false }), sb().from('knowledge_brain').select('*').eq('id', 1).maybeSingle()]);
    setDocs(d || []);
    setBrain(b);
  }
  useLive(['knowledge_docs', 'knowledge_brain'], load);

  async function loadInsights() {
    let query = sb().from('knowledge_insights').select('*');
    if (qual === 'fracas') query = query.lt('quality', 4);
    if (qual === 'boas') query = query.gte('quality', 7);
    if (qual === 'novas') query = query.is('quality', null);
    query = (order === 'nota' ? query.order('quality', { ascending: false, nullsFirst: false }) : query).order('wins', { ascending: false }).order('used', { ascending: false }).order('id', { ascending: false }).limit(300);
    if (kind) query = query.eq('kind', kind);
    if (doc) query = query.eq('doc_id', doc);
    const { data } = await query;
    setIns(data || []);
  }
  useEffect(() => {
    loadInsights();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, doc, qual, order, docs.map((d) => d.insights).join(',')]);

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    const list = Array.from(files);
    setUps(list.map((f) => ({ name: f.name, pct: 0, state: 'enviando' })));
    for (let i = 0; i < list.length; i++) {
      const f = list[i];
      const set = (p: Partial<Up>) => setUps((u) => u.map((x, k) => (k === i ? { ...x, ...p } : x)));
      try {
        const r = await uploadFile(f, (pct) => set({ pct, state: pct >= 100 ? 'lendo' : 'enviando' }));
        set({ state: 'ok', msg: `${r.chunks} trechos · a IA começou a estudar` });
      } catch (e: any) {
        set({ state: 'erro', msg: e.message });
      }
    }
    load();
  }
  async function saveNote() {
    try {
      await api('/api/knowledge', 'POST', note);
      setNote({ name: '', text: '' });
      toast('Texto adicionado. A IA vai estudar em instantes');
      load();
    } catch (e: any) {
      toast(e.message);
    }
  }
  async function act(id: string, action: string) {
    try {
      await api('/api/knowledge', 'PATCH', { id, action });
      toast('A IA vai estudar este material de novo');
      load();
    } catch (e: any) {
      toast(e.message);
    }
  }
  const [removing, setRemoving] = useState<string | null>(null);
  async function remove(id: string) {
    setRemoving(id);
    try {
      const r = await api('/api/knowledge', 'DELETE', { id });
      // some da tela na hora: o material, as técnicas dele e o filtro por ele
      setDocs((old) => old.filter((d) => d.id !== id));
      setIns((old) => old.filter((x) => x.doc_id !== id));
      if (doc === id) setDoc('');
      toast(`Material excluído com ${r.insights || 0} técnica(s) e ${r.chunks || 0} trecho(s). O Cérebro de vendas está sendo refeito sem ele.`);
    } catch (e: any) {
      toast(e.message);
    }
    setConfirm(null);
    setRemoving(null);
    load();
  }
  const [syncing, setSyncing] = useState(false);
  const [askSync, setAskSync] = useState(false);
  async function syncBase() {
    setSyncing(true);
    setAskSync(false);
    try {
      const r = await api('/api/knowledge', 'PATCH', { action: 'sync' });
      setDigestMsg({
        ok: true,
        text: `Base sincronizada: ${r.orphanInsights} técnica(s) e ${r.orphanChunks} trecho(s) de livros já excluídos removidos, e ${r.removedOffline} técnica(s) de linguagem corporal/presencial apagadas. O Cérebro de vendas está sendo refeito só com os materiais da lista (leva ~1 min).`,
      });
      load();
      loadInsights();
    } catch (e: any) {
      toast(e.message);
    }
    setSyncing(false);
  }
  async function setPriority(id: string, priority: string) {
    try {
      await api('/api/knowledge', 'PATCH', { action: 'priority', id, priority });
      setDocs((old) => old.map((d) => (d.id === id ? { ...d, priority } : d)));
      toast(priority === 'primario' ? '🔥 Agora é Base principal. Clique em "Atualizar" no Cérebro de vendas para aplicar no manual.' : '⚡ Agora é Apoio. Clique em "Atualizar" no Cérebro de vendas para aplicar no manual.');
    } catch (e: any) {
      toast(e.message);
    }
  }
  const [digesting, setDigesting] = useState(false);
  const [digestMsg, setDigestMsg] = useState<{ ok: boolean; text: string } | null>(null);
  async function digestNow() {
    setDigesting(true);
    setDigestMsg(null);
    try {
      const r = await api('/api/knowledge', 'PATCH', { action: 'digest' });
      setDigestMsg(
        r.ok
          ? { ok: true, text: r.parts ? `${r.parts} parte(s) estudada(s) agora. Se ainda faltar, o robô continua sozinho (ou clique de novo).` : 'Não há livros esperando leitura.' }
          : { ok: false, text: `${r.error}${r.raw ? ` — detalhe: ${r.raw}` : ''}` },
      );
      load();
    } catch (e: any) {
      setDigestMsg({ ok: false, text: e.message });
    }
    setDigesting(false);
  }
  async function rebuild() {
    setBusyBrain(true);
    try {
      await api('/api/knowledge', 'PATCH', { action: 'brain' });
      toast('Cérebro de vendas atualizado');
      load();
    } catch (e: any) {
      toast(e.message);
    }
    setBusyBrain(false);
  }
  async function runTest() {
    setTesting(true);
    setResult(null);
    try {
      setResult(await api('/api/knowledge/test', 'POST', { situation: test.text, stage: test.stage }));
    } catch (e: any) {
      toast(e.message);
    }
    setTesting(false);
  }

  const shown = useMemo(() => ins.filter((i) => !q || norm(i.title + ' ' + i.content + ' ' + (i.tags || []).join(' ')).includes(norm(q))), [ins, q]);
  const totalIns = docs.reduce((a, d) => a + (d.insights || 0), 0);
  const studying = docs.filter((d) => d.status === 'aprendendo').length;
  const docName = Object.fromEntries(docs.map((d) => [d.id, d.name]));

  return (
    <>
      <PageHead title="Base de conhecimento" sub="Livros que a IA estuda de verdade e aplica em todas as conversas" icon="book" tone="gg" help="pdfs" />

      <div className="grid g-kpi">
        {[
          ['book', 'gg', 'Livros e materiais', docs.length],
          ['spark', 'ai', 'Técnicas aprendidas', totalIns],
          ['refresh', 'warn', 'Em estudo agora', studying],
          ['money', 'ok', 'Técnicas que já venderam', ins.filter((i) => i.wins > 0).length],
        ].map((k: any, i) => (
          <div className="card kpi" key={i}>
            <div className="row">
              <Ib name={k[0]} tone={k[1]} delay={i * 0.3} />
            </div>
            <div className="v">{k[3]}</div>
            <div className="l">{k[2]}</div>
          </div>
        ))}
      </div>

      <div className="grid g-2">
        <div className="grid" style={{ alignContent: 'start' }}>
          <label data-perm="conhecimento.enviar" className="drop card" htmlFor="up">
            <Ib name="upload" tone="gg" size="lg" />
            <div>
              <h2>Enviar livros em PDF</h2>
              <p className="muted">Copywriting, vendas, negociação, persuasão. Pode enviar vários de uma vez, com 100, 300 ou 500 páginas. A IA lê o livro inteiro, parte por parte.</p>
            </div>
            <input type="file" id="up" accept=".pdf,.txt,.md" multiple onChange={(e) => upload(e.target.files)} />
          </label>
          {ups.length > 0 && (
            <div className="card">
              <div className="grid" style={{ gap: 10 }}>
                {ups.map((u, i) => (
                  <div key={i}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13 }}>
                      <Icon name={u.state === 'ok' ? 'check' : u.state === 'erro' ? 'alert' : 'file'} className={u.state === 'ok' ? 'status-ok' : u.state === 'erro' ? 'status-bad' : ''} />
                      <b style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.name}</b>
                      <span className="muted">{u.state === 'enviando' ? `${u.pct}%` : u.state === 'lendo' ? 'extraindo o texto…' : ''}</span>
                    </div>
                    {(u.state === 'enviando' || u.state === 'lendo') && (
                      <div className="progress" style={{ marginTop: 6 }}>
                        <i style={{ width: `${u.state === 'lendo' ? 100 : u.pct}%`, background: 'var(--gg)' }} />
                      </div>
                    )}
                    {u.msg && <p className={u.state === 'erro' ? 'err' : 'muted'} style={{ fontSize: 12.5, marginTop: 4 }}>{u.msg}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="card">
            <div className="card-h">
              <Ib name="file" tone="mut" size="sm" />
              <h2>Livros e materiais</h2>
              <span className="sp" />
              {askSync ? (
                <span data-perm="conhecimento.enviar" style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                  <small>Apagar órfãos e técnicas de linguagem corporal?</small>
                  <button className="btn btn-sm btn-p" onClick={syncBase}>
                    Sim
                  </button>
                  <button className="btn btn-sm btn-g" onClick={() => setAskSync(false)}>
                    Não
                  </button>
                </span>
              ) : (
                <button data-perm="conhecimento.enviar" className="btn btn-sm" onClick={() => setAskSync(true)} disabled={syncing} title="Deixa só as técnicas e trechos dos materiais desta lista e remove técnicas de linguagem corporal/presencial">
                  {syncing ? <span className="spin" /> : <Icon name="refresh" />}
                  {syncing ? 'Sincronizando…' : 'Sincronizar Base Ativa'}
                </button>
              )}
              {studying > 0 && (
                <button data-perm="conhecimento.enviar" className="btn btn-sm btn-p" onClick={digestNow} disabled={digesting}>
                  {digesting ? <span className="spin" /> : <Icon name="play" />}
                  {digesting ? 'Estudando… (até 3 min)' : 'Estudar agora'}
                </button>
              )}
            </div>
            {digestMsg && (
              <div className="alert" style={{ marginBottom: 12, borderColor: digestMsg.ok ? 'var(--ok)' : 'var(--bad)' }}>
                <Icon name={digestMsg.ok ? 'check' : 'alert'} className={digestMsg.ok ? 'status-ok' : 'status-bad'} />
                <div style={{ fontSize: 13, wordBreak: 'break-word' }}>{digestMsg.text}</div>
              </div>
            )}
            {docs.length === 0 ? (
              <p className="muted">Nenhum material ainda. Envie o primeiro livro acima.</p>
            ) : (
              <div className="tablewrap">
                <table>
                  <thead>
                    <tr>
                      <th>Material</th>
                      <th title="Primário = base principal (~70%). Secundário = apoio para copy, gatilhos e empatia (~30%)">Prioridade</th>
                      <th>Páginas</th>
                      <th>Técnicas</th>
                      <th>Situação</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {docs.map((d) => (
                      <tr key={d.id}>
                        <td className="biz">
                          <b>{d.name}</b>
                          <small>
                            {d.chunks} trechos · enviado {timeLabel(d.created_at)}
                          </small>
                        </td>
                        <td>
                          <PriorityBadge d={d} onSet={(p) => setPriority(d.id, p)} />
                        </td>
                        <td className="num muted">{d.pages ?? '—'}</td>
                        <td className="num">
                          <button className="linkbtn" onClick={() => setDoc(doc === d.id ? '' : d.id)} title="Ver técnicas deste material">
                            {d.insights}
                          </button>
                        </td>
                        <td>{statusChip(d)}</td>
                        <td>
                          <div className="row-actions" style={{ justifyContent: 'flex-end', flexWrap: 'nowrap' }}>
                            {d.status !== 'aprendendo' && d.chunks > 0 && (
                              <button data-perm="conhecimento.enviar" className="iconbtn" title="Estudar de novo" aria-label="Estudar de novo" onClick={() => act(d.id, 'relearn')}>
                                <Icon name="refresh" />
                              </button>
                            )}
                            {confirm === d.id ? (
                              <span data-perm="conhecimento.enviar" style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                                <small style={{ whiteSpace: 'nowrap' }}>Apagar livro + técnicas?</small>
                                <button className="btn btn-sm" style={{ color: 'var(--bad)' }} onClick={() => remove(d.id)} disabled={removing === d.id}>
                                  {removing === d.id ? <span className="spin" /> : null}
                                  {removing === d.id ? 'Excluindo…' : 'Excluir'}
                                </button>
                                <button className="btn btn-sm btn-g" onClick={() => setConfirm(null)} disabled={removing === d.id}>
                                  Não
                                </button>
                              </span>
                            ) : (
                              <button data-perm="conhecimento.enviar" className="iconbtn" aria-label={`Remover ${d.name}`} onClick={() => setConfirm(d.id)}>
                                <Icon name="trash" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="grid" style={{ alignContent: 'start' }}>
          <PromptMaster />
          <div className="card">
            <div className="card-h">
              <Ib name="robot" tone="ai" size="sm" />
              <h2>Cérebro de vendas</h2>
              <button data-perm="conhecimento.enviar" className="sp btn btn-sm" onClick={rebuild} disabled={busyBrain || !totalIns}>
                {busyBrain ? <span className="spin" /> : <Icon name="refresh" />}
                {busyBrain ? 'Atualizando…' : 'Atualizar'}
              </button>
            </div>
            {brain?.content ? (
              <>
                <div className="aisum pre" style={{ maxHeight: 420, overflow: 'auto' }}>
                  {brain.content}
                </div>
                <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>
                  Feito com {brain.insights} técnicas de {brain.docs} material(is) · atualizado {timeLabel(brain.updated_at)}. A IA segue este manual em todas as mensagens (abaixo do Prompt Master): primeira abordagem, respostas, negociação e follow-ups. Materiais 🔥 Primários pesam ~70%; ⚡ Secundários ~30%, só para lapidar texto, gatilhos e empatia.
                </p>
              </>
            ) : (
              <p className="muted">Assim que a IA terminar de estudar o primeiro livro, este manual aparece aqui e passa a ser usado em todas as conversas.</p>
            )}
          </div>

          <div className="card">
            <div className="card-h">
              <Ib name="target" tone="acc" size="sm" />
              <h2>Testar a base</h2>
            </div>
            <div className="grid" style={{ gap: 10 }}>
              <textarea className="input" value={test.text} onChange={(e) => setTest({ ...test, text: e.target.value })} placeholder="Cole uma mensagem de cliente ou descreva a situação" aria-label="Situação" />
              <div className="row-actions">
                <select className="input" style={{ width: 'auto' }} value={test.stage} onChange={(e) => setTest({ ...test, stage: e.target.value })} aria-label="Momento da venda">
                  <option value="novo">Primeira abordagem</option>
                  <option value="respondeu">Começo da conversa</option>
                  <option value="interessado">Demonstrou interesse</option>
                  <option value="negociando">Negociação e objeções</option>
                  <option value="pix">Fechamento</option>
                </select>
                <button className="btn btn-p" onClick={runTest} disabled={testing}>
                  {testing ? <span className="spin" /> : <Icon name="spark" />}
                  {testing ? 'Pensando…' : 'Ver como a IA responderia'}
                </button>
              </div>
              {result && (
                <div className="grid" style={{ gap: 10 }}>
                  {(result.messages?.length ? result.messages : [result.reply]).map((t: string, i: number) => (
                    <div key={i} className="bub out" style={{ maxWidth: '100%', alignSelf: 'stretch' }}>
                      {i === 0 && (
                        <span className="who" style={{ color: 'var(--ai)' }}>
                          <Icon name="robot" />
                          Resposta da IA
                        </span>
                      )}
                      {t}
                    </div>
                  ))}
                  <p className="muted" style={{ fontSize: 13 }}>{result.why}</p>
                  {result.insights.length === 0 ? (
                    <p className="muted" style={{ fontSize: 13 }}>Nenhuma técnica da base combinou com essa situação. Envie mais livros sobre o tema.</p>
                  ) : (
                    <div className="grid" style={{ gap: 6 }}>
                      <div className="sect">
                        <h3>Técnicas encontradas na base</h3>
                      </div>
                      {result.insights.map((i: any) => (
                        <div key={i.id} className="alert" style={{ padding: 10, borderColor: i.used ? 'var(--ok)' : undefined }}>
                          <div style={{ minWidth: 0 }}>
                            <div className="chips" style={{ marginBottom: 4 }}>
                              <span className="chip" style={{ ['--t' as any]: 'var(--ai)' }}>{KINDS[i.kind] || i.kind}</span>
                              {i.used && <span className="chip" style={{ ['--t' as any]: 'var(--ok)' }}>usada na resposta</span>}
                            </div>
                            <b style={{ fontSize: 13 }}>{i.title}</b>
                            <p className="muted" style={{ fontSize: 12.5 }}>
                              {i.content} <i>({i.doc_name})</i>
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-h" style={{ flexWrap: 'wrap' }}>
          <Ib name="spark" tone="ai" size="sm" />
          <h2>Técnicas aprendidas {doc && <span className="muted" style={{ fontWeight: 500 }}>· {docName[doc]}</span>}</h2>
          <input className="input sp" style={{ width: 240 }} placeholder="Buscar técnica" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar técnica" />
          {doc && (
            <button className="btn btn-sm btn-g" onClick={() => setDoc('')}>
              Todos os livros
            </button>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 10 }}>
          <div className="seg" role="group" aria-label="Qualidade">
            {(
              [
                ['', 'Todas as notas'],
                ['boas', 'Melhores (7+)'],
                ['fracas', 'Fracas (abaixo de 4)'],
                ['novas', 'Sem nota ainda'],
              ] as [string, string][]
            ).map(([k, l]) => (
              <button key={k} aria-pressed={qual === k} onClick={() => setQual(k)}>
                {l}
              </button>
            ))}
          </div>
          <select className="input" style={{ width: 170 }} value={order} onChange={(e) => setOrder(e.target.value as any)} aria-label="Ordem">
            <option value="nota">Maior nota primeiro</option>
            <option value="uso">Mais usadas primeiro</option>
          </select>
          <span className="sp" />
          <button data-perm="conhecimento.enviar" className="btn btn-sm" onClick={rateNow} disabled={rating}>
            {rating ? <span className="spin" /> : <Icon name="star" />}
            {rating ? 'Avaliando…' : 'Avaliar agora'}
          </button>
          {qual === 'fracas' && shown.length > 0 && (
            <span data-perm="conhecimento.enviar" style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
              {delWeak ? (
                <>
                  <span style={{ fontSize: 12.5 }}>Excluir todas as fracas?</span>
                  <button className="btn btn-sm" style={{ color: 'var(--bad)' }} onClick={delWeakAll}>
                    Sim, excluir
                  </button>
                  <button className="btn btn-sm btn-g" onClick={() => setDelWeak(false)}>
                    Não
                  </button>
                </>
              ) : (
                <button className="btn btn-sm" style={{ color: 'var(--bad)' }} onClick={() => setDelWeak(true)}>
                  <Icon name="trash" />
                  Excluir todas as fracas
                </button>
              )}
            </span>
          )}
        </div>
        <p className="muted" style={{ fontSize: 12.5, marginBottom: 10 }}>
          A IA dá nota de 0 a 10 para cada técnica (vale para vender pelo WhatsApp de forma humana?). Abaixo de 4 ela já não usa. Você pode excluir qualquer técnica: ela sai na hora do aprendizado.
        </p>
        <div className="seg" role="group" style={{ marginBottom: 14 }}>
          <button aria-pressed={!kind} onClick={() => setKind('')}>
            Todas
          </button>
          {Object.entries(KINDS).map(([k, l]) => (
            <button key={k} aria-pressed={kind === k} onClick={() => setKind(k)}>
              {l}
            </button>
          ))}
        </div>
        {shown.length === 0 ? (
          <p className="muted">{totalIns ? 'Nenhuma técnica com esse filtro.' : 'As técnicas aparecem aqui conforme a IA estuda os livros.'}</p>
        ) : (
          <div className="grid g-3">
            {shown.slice(0, 120).map((i) => (
              <div key={i.id} className="card" style={{ padding: 14, boxShadow: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div className="chips" style={{ alignItems: 'center' }}>
                  {i.quality != null && (
                    <span className="chip" title={i.quality_note || ''} style={{ ['--t' as any]: i.quality >= 7 ? 'var(--ok)' : i.quality >= 4 ? 'var(--warn)' : 'var(--bad)' }}>
                      nota {i.quality}
                    </span>
                  )}
                  <span className="chip" style={{ ['--t' as any]: 'var(--ai)' }}>{KINDS[i.kind] || i.kind}</span>
                  {i.wins > 0 && <span className="chip" style={{ ['--t' as any]: 'var(--ok)' }}>{i.wins} venda(s)</span>}
                  {i.used > 0 && <span className="chip">usada {i.used}x</span>}
                </div>
                <b style={{ fontSize: 13.5 }}>{i.title}</b>
                <p style={{ fontSize: 13, color: 'var(--ink-2)' }}>{i.content}</p>
                {i.example && (
                  <div className="bub out" style={{ maxWidth: '100%', fontSize: 12.5 }}>
                    {i.example}
                  </div>
                )}
                {i.quality_note && <small className="muted" style={{ fontStyle: 'italic' }}>Avaliação: {i.quality_note}</small>}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 'auto' }}>
                  <small className="muted" style={{ flex: 1, minWidth: 0 }}>{docName[i.doc_id]}</small>
                  {delId === i.id ? (
                    <span className="confirm-pop" data-perm="conhecimento.enviar">
                      Excluir do aprendizado?
                      <button className="btn btn-sm" style={{ color: 'var(--bad)' }} onClick={() => delInsight(i.id)}>
                        Excluir
                      </button>
                      <button className="btn btn-sm btn-g" onClick={() => setDelId(null)}>
                        Não
                      </button>
                    </span>
                  ) : (
                    <button data-perm="conhecimento.enviar" className="btn btn-sm btn-g" style={{ color: 'var(--bad)' }} onClick={() => setDelId(i.id)} aria-label={`Excluir ${i.title}`}>
                      <Icon name="trash" />
                      Excluir
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-h">
          <Ib name="file" tone="acc" size="sm" />
          <h2>Ou cole um texto da equipe</h2>
        </div>
        <div className="grid" style={{ gap: 10 }}>
          <input className="input" placeholder="Título (ex.: Roteiro de objeções da equipe)" value={note.name} onChange={(e) => setNote({ ...note, name: e.target.value })} aria-label="Título" />
          <textarea className="input" style={{ minHeight: 120 }} placeholder="Scripts, respostas que funcionam, diferenciais da empresa…" value={note.text} onChange={(e) => setNote({ ...note, text: e.target.value })} aria-label="Texto" />
          <div>
            <button data-perm="conhecimento.enviar" className="btn btn-p" onClick={saveNote} disabled={!note.text.trim()}>
              <Icon name="plus" />
              Adicionar à base
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
