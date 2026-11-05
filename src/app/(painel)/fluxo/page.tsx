'use client';
/* Inteligência da IA › Fluxo: sequência de abertura (texto, áudio, imagem, PDF, espera, aguardar resposta) antes da IA assumir. */
import { useEffect, useRef, useState } from 'react';
import { PageHead } from '@/components/PageHead';
import { Icon, Ib } from '@/components/Icon';
import { toast, api } from '@/components/ui';

type Passo = { idioma_audio?: 'pt' | 'es'; id: string; tipo: string; texto?: string; url?: string; nome_arquivo?: string; transcricao?: string; audio_id?: string; atraso?: number[]; minutos?: number[]; apos_resposta?: number[]; limite?: number | null };
const ICO: Record<string, string> = { texto: 'chat', audio: 'mic', imagem: 'eye', pdf: 'file', espera: 'clock', aguardar: 'pause', ia: 'robot' };
const novoId = () => 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
const PADRAO: Record<string, Partial<Passo>> = {
  texto: { texto: '', atraso: [3, 5] },
  audio: { url: '', transcricao: '', atraso: [2, 4] },
  imagem: { url: '', texto: '', atraso: [2, 4] },
  pdf: { url: '', texto: '', atraso: [2, 4] },
  espera: { minutos: [1, 2] },
  aguardar: { apos_resposta: [4, 6], limite: 8 },
  ia: { apos_resposta: [3, 5] },
};

function Faixa({ label, v, onChange, unidade }: { label: string; v?: number[]; onChange: (x: number[]) => void; unidade: string }) {
  const a = v?.[0] ?? 0, b = v?.[1] ?? a;
  return (
    <label className="fx-faixa"><span>{label}</span>
      <input className="input" type="number" min={0} value={a} onChange={(e) => onChange([Number(e.target.value), Math.max(Number(e.target.value), b)])} />
      <em>a</em>
      <input className="input" type="number" min={0} value={b} onChange={(e) => onChange([a, Number(e.target.value)])} />
      <em>{unidade}</em>
    </label>
  );
}

function Upload({ accept, onDone, rota = '/api/fluxos', extra }: { accept: string; onDone: (url: string, nome: string, transcricao?: string | null, j?: any) => void; rota?: string; extra?: Record<string, string> }) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  async function envia(f: File) {
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('file', f);
      for (const [k, v] of Object.entries(extra || {})) fd.append(k, v);
      const r = await fetch(rota, { method: 'POST', body: fd });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Falha no envio');
      onDone(j.url, j.nome, j.transcricao, j);
      toast(j.aviso || (j.transcricao ? 'Áudio enviado e transcrito ✨' : 'Arquivo enviado ✨'));
    } catch (e: any) { toast(e.message); }
    setBusy(false);
  }
  return (
    <>
      <input ref={ref} type="file" accept={accept} hidden onChange={(e) => e.target.files?.[0] && envia(e.target.files[0])} />
      <button type="button" className="btn btn-g btn-sm" disabled={busy} onClick={() => ref.current?.click()}>{busy ? <span className="spin" /> : <Icon name="upload" />}Enviar arquivo</button>
    </>
  );
}

function Card({ p, i, total, tipos, set, mover, tirar, audios, idiomaFluxo }: { idiomaFluxo: string; p: Passo; i: number; total: number; tipos: Record<string, string>; set: (p: Passo) => void; mover: (d: number) => void; tirar: () => void; audios: any[] }) {
  const up = (k: keyof Passo, v: any) => set({ ...p, [k]: v });
  return (
    <div className={'fx-card t-' + p.tipo}>
      <div className="fx-h">
        <span className="fx-n">{i + 1}</span>
        <Icon name={ICO[p.tipo] || 'chat'} />
        <select className="input" value={p.tipo} onChange={(e) => set({ id: p.id, tipo: e.target.value, ...PADRAO[e.target.value] } as Passo)}>
          {Object.entries(tipos).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <div className="sp" />
        <button type="button" className="btn btn-g btn-sm" disabled={i === 0} onClick={() => mover(-1)} title="Subir">↑</button>
        <button type="button" className="btn btn-g btn-sm" disabled={i === total - 1} onClick={() => mover(1)} title="Descer">↓</button>
        <button type="button" className="btn btn-g btn-sm" onClick={tirar} title="Tirar passo"><Icon name="trash" /></button>
      </div>
      {p.tipo === 'texto' && <textarea className="input" rows={3} value={p.texto || ''} onChange={(e) => up('texto', e.target.value)} placeholder="Ex.: {saudacao}! Meu nome é {atendente} 😊" />}
      {['audio', 'imagem', 'pdf'].includes(p.tipo) && (
        <div className="fx-arq">
          <Upload accept={p.tipo === 'audio' ? 'audio/*' : p.tipo === 'imagem' ? 'image/*' : 'application/pdf'} extra={{ idioma: idiomaFluxo }} onDone={(url, nome, tr, j) => set({ ...p, url, nome_arquivo: nome, audio_id: undefined, transcricao: tr || p.transcricao, idioma_audio: p.tipo === 'audio' ? (j?.idioma || undefined) : undefined })} />
          {p.tipo === 'audio' && audios.length > 0 && (
            <select className="input" style={{ height: 32, fontSize: 12.5, maxWidth: 260 }} value={p.audio_id || ''} onChange={(e) => { const a = audios.find((x) => x.id === e.target.value); if (a) set({ ...p, audio_id: a.id, url: a.url, nome_arquivo: a.nome, transcricao: a.transcricao || p.transcricao }); }}>
              <option value="">…ou escolher da biblioteca</option>
              {audios.map((a) => <option key={a.id} value={a.id}>A{a.codigo} · {a.nome}{a.ativo ? '' : ' (desligado)'}</option>)}
            </select>
          )}
          {p.url ? (p.tipo === 'audio' ? <audio controls src={p.url} style={{ height: 34, maxWidth: '100%' }} /> : p.tipo === 'imagem' ? <img src={p.url} alt="" style={{ height: 60, borderRadius: 8 }} /> : <a href={p.url} target="_blank" rel="noreferrer">{p.nome_arquivo || 'PDF'}</a>) : <span className="fx-falta">Sem arquivo ainda: este passo é pulado</span>}
        </div>
      )}
      {p.tipo === 'audio' && p.url && (() => { const a = p.idioma_audio; const ok = !a || a === idiomaFluxo; return <small style={{ fontWeight: 700, color: a ? (ok ? '#0f7a43' : '#c0392b') : 'var(--muted)' }}>{a ? `Áudio em ${a === 'es' ? 'espanhol 🇪🇸' : 'português 🇧🇷'}${ok ? ' ✓' : ` ✗ — este fluxo é ${idiomaFluxo === 'es' ? 'espanhol' : 'português'}: o passo será pulado até você trocar o áudio`}` : 'Idioma do áudio ainda não detectado (envie o arquivo de novo para detectar)'}</small>; })()}
      {p.tipo === 'audio' && !!p.url && <button type="button" className="btn btn-g btn-sm" style={{ alignSelf: 'flex-start' }} onClick={async () => { try { const r = await api('/api/fluxos', 'POST', { action: 'retranscrever', url: p.url, idioma: idiomaFluxo }); set({ ...p, transcricao: r.transcricao, idioma_audio: r.idioma || undefined }); toast(`Transcrito de novo (${r.idioma === 'es' ? 'espanhol' : r.idioma === 'pt' ? 'português' : 'idioma não identificado'})`); } catch (e: any) { toast(e.message); } }}><Icon name="mic" />Transcrever o áudio de novo (detecta o idioma)</button>}
      {p.tipo === 'audio' && !!p.transcricao && <button type="button" className="btn btn-g btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => { navigator.clipboard?.writeText(p.transcricao || ''); toast('Texto copiado'); }}><Icon name="copy" />Copiar texto do áudio</button>}
      {p.tipo === 'audio' && <textarea className="input" rows={3} value={p.transcricao || ''} onChange={(e) => up('transcricao', e.target.value)} placeholder="O que o áudio diz (a IA lê isso para saber o que já foi falado e não repetir)" />}
      {['imagem', 'pdf'].includes(p.tipo) && <input className="input" value={p.texto || ''} onChange={(e) => up('texto', e.target.value)} placeholder="Legenda (opcional)" />}
      {['texto', 'audio', 'imagem', 'pdf'].includes(p.tipo) && <Faixa label="Espera antes de enviar" v={p.atraso} onChange={(x) => up('atraso', x)} unidade="segundos" />}
      {p.tipo === 'espera' && <Faixa label="Ficar parado" v={p.minutos} onChange={(x) => up('minutos', x)} unidade="minutos" />}
      {p.tipo === 'aguardar' && (
        <>
          <Faixa label="Depois que o cliente responder, seguir em" v={p.apos_resposta} onChange={(x) => up('apos_resposta', x)} unidade="minutos" />
          <label className="fx-faixa"><span>Sem resposta, seguir sozinho depois de</span><input className="input" type="number" min={0} value={p.limite ?? ''} onChange={(e) => up('limite', e.target.value === '' ? null : Number(e.target.value))} placeholder="—" /><em>minutos (vazio = espera a resposta)</em></label>
        </>
      )}
      {p.tipo === 'ia' && (
        <>
          <Faixa label="Depois que o cliente responder, a IA responde em" v={p.apos_resposta} onChange={(x) => up('apos_resposta', x)} unidade="minutos" />
          <small className="muted">A partir daqui a IA conduz a consulta pelo Roteiro de atendimento.</small>
        </>
      )}
    </div>
  );
}

function Testes({ d, reload }: { d: any; reload: () => void }) {
  const fls: any[] = d?.fluxos || [];
  const atual = fls.find((f) => f.padrao && f.ativo);
  const v = d?.voz || {};
  async function abertura(id: string | null) {
    try { await api('/api/fluxos', 'POST', { action: 'abertura', id }); toast(id ? 'Abertura trocada: vale para as próximas conversas novas' : 'Sem fluxo: a IA abre a conversa sozinha (texto)'); reload(); } catch (e: any) { toast(e.message); }
  }
  async function voz(patch: any, msg: string) {
    try { await api('/api/fluxos', 'POST', { action: 'voz', ...patch }); toast(msg); reload(); } catch (e: any) { toast(e.message); }
  }
  const Op = ({ on, onClick, t, s: sub }: { on: boolean; onClick: () => void; t: string; s: string }) => (
    <button type="button" className={'fx-op' + (on ? ' on' : '')} onClick={onClick}><b>{on ? '● ' : '○ '}{t}</b><small>{sub}</small></button>
  );
  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div className="card-h"><Ib name="sliders" tone="ai" size="sm" /><h2>Painel de testes: como a conversa começa e responde</h2></div>
      <div className="fx-tst">
        <div>
          <h4>1. Abertura da conversa nova</h4>
          <div className="fx-ops">
            {fls.map((f) => <Op key={f.id} on={atual?.id === f.id} onClick={() => abertura(f.id)} t={f.nome} s={(f.passos || []).some((p: any) => p.tipo === 'audio') ? `${(f.passos || []).filter((p: any) => p.tipo === 'audio' && p.url).length} de ${(f.passos || []).filter((p: any) => p.tipo === 'audio').length} áudios enviados` : 'Só texto'} />)}
            <Op on={!atual} onClick={() => abertura(null)} t="Sem fluxo (IA em texto)" s="A IA abre sozinha pelo roteiro, em 3 balões" />
          </div>
        </div>
        <div>
          <h4>2. Voz da IA gerada na hora (ElevenLabs)</h4>
          {!v.chave ? <p className="fx-falta">Falta a chave do ElevenLabs no Easypanel (ELEVENLABS_API_KEY).</p> : !v.vozes ? <p className="fx-falta">Nenhuma voz ativa em Vozes (ElevenLabs): cadastre a voz NATALIA TEIXEIRA lá.</p> : null}
          <div className="fx-ops">
            <Op on={!!v.ligada} onClick={() => voz({ ligada: !v.ligada }, !v.ligada ? 'Voz da IA ligada' : 'Voz da IA desligada: tudo em texto')} t={v.ligada ? 'Voz ligada' : 'Voz desligada (só texto)'} s="Chave geral dos áudios gerados pela IA" />
            <Op on={!!v.ligada && !!v.cliente_audio} onClick={() => voz({ cliente_audio: !v.cliente_audio }, 'Salvo')} t="Responder áudio com áudio" s="Quando o cliente manda áudio" />
            <Op on={!!v.ligada && !!v.fechamento} onClick={() => voz({ fechamento: !v.fechamento }, 'Salvo')} t="Áudio no fechamento" s="Na hora da oferta e do Pix" />
            <Op on={!!v.ligada && !!v.boas_vindas} onClick={() => voz({ boas_vindas: !v.boas_vindas }, 'Salvo')} t="Áudio de boas-vindas" s="Só quando não há fluxo de abertura" />
          </div>
          <div className="fx-faixa" style={{ marginTop: 8 }}>
            <span>Máximo de áudios gerados por conversa</span>
            <input className="input" type="number" min={0} max={20} defaultValue={v.max_por_conversa ?? 4} onBlur={(e) => voz({ max_por_conversa: Number(e.target.value) }, 'Limite salvo')} />
            <span>e no máximo</span>
            <input className="input" type="number" min={0} max={100} defaultValue={v.max_pct ?? 10} onBlur={(e) => voz({ max_pct: Number(e.target.value) }, 'Limite salvo')} />
            <span>% das respostas</span>
          </div>
          <small className="muted">Os áudios gravados do Fluxo não contam nesse limite. A voz e o modelo (Eleven v4 Turbo) ficam em Vozes (ElevenLabs).</small>
        </div>
      </div>
    </div>
  );
}

function Biblioteca({ lista, reload }: { lista: any[]; reload: () => void }) {
  const [ed, setEd] = useState<Record<string, any>>({});
  const [idN, setIdN] = useState('pt');
  async function salvar(a: any, patch: any, msg = 'Salvo') {
    try { await api('/api/audios', 'POST', { action: 'salvar', id: a.id, ...patch }); toast(msg); reload(); } catch (e: any) { toast(e.message); }
  }
  async function excluir(a: any) {
    if (!confirm(`Excluir o áudio "${a.nome}"? (Para só parar de usar, é melhor desligar.)`)) return;
    try { await api('/api/audios', 'POST', { action: 'excluir', id: a.id }); reload(); } catch (e: any) { toast(e.message); }
  }
  const val = (a: any, k: string) => (ed[a.id]?.[k] ?? a[k] ?? '');
  const set = (a: any, k: string, v: string) => setEd({ ...ed, [a.id]: { ...(ed[a.id] || {}), [k]: v } });
  return (
    <div className="card" style={{ marginTop: 16 }}>
      <div className="card-h">
        <Ib name="mic" tone="ai" size="sm" />
        <h2>Biblioteca de áudios (respostas prontas)</h2>
        <div className="sp" />
        <select className="input" style={{ height: 32, width: 150 }} value={idN} onChange={(e) => setIdN(e.target.value)} title="Idioma do áudio que você vai subir"><option value="pt">🇧🇷 Português</option><option value="es">🇪🇸 Español</option></select>
        <Upload accept="audio/*" rota="/api/audios" extra={{ idioma: idN }} onDone={() => reload()} />
      </div>
      <p className="muted" style={{ fontSize: 13, marginTop: 0 }}>Suba o áudio: ele é <b>transcrito sozinho</b>. Escreva o <b>intuito</b> (quando ele deve ser usado). A IA manda o áudio certo na hora certa, dentro ou fora do fluxo, e a equipe manda pela conversa (botão <b>Áudio pronto</b>). O mesmo áudio <b>nunca</b> vai duas vezes para o mesmo contato. Desligado, ele não é usado, mas continua guardado.</p>
      {!lista.length ? <p className="muted">Nenhum áudio ainda.</p> : (
        <div className="fx-bib">
          {lista.map((a) => (
            <div key={a.id} className={'fx-aud' + (a.ativo ? '' : ' off')}>
              <div className="fx-h">
                <span className="fx-n" style={{ ['--c' as any]: '#d6336a', background: '#d6336a' }}>A{a.codigo}</span>
                <input className="input" style={{ height: 32 }} value={val(a, 'nome')} onChange={(e) => set(a, 'nome', e.target.value)} />
                <select className="input" style={{ height: 32, width: 64 }} value={a.idioma || 'pt'} onChange={(e) => salvar(a, { idioma: e.target.value }, 'Idioma do áudio salvo')} title="Idioma do áudio (a IA só usa para contatos desse idioma)"><option value="pt">🇧🇷</option><option value="es">🇪🇸</option></select>
                <label className="fx-sw" style={{ alignItems: 'center' }}><input type="checkbox" checked={!!a.ativo} onChange={(e) => salvar(a, { ativo: e.target.checked }, e.target.checked ? 'Áudio ligado' : 'Áudio desligado (continua guardado)')} /><small>{a.ativo ? 'Ligado' : 'Desligado'}</small></label>
                <button className="btn btn-g btn-sm" title="Excluir" onClick={() => excluir(a)}><Icon name="trash" /></button>
              </div>
              <audio controls src={a.url} style={{ height: 34, width: '100%' }} />
              <input className="input" value={val(a, 'intuito')} onChange={(e) => set(a, 'intuito', e.target.value)} placeholder="Quando usar (ex.: pedir o nome de batismo e a data de nascimento; cliente com dúvida se funciona)" />
              <textarea className="input" rows={3} value={val(a, 'transcricao')} onChange={(e) => set(a, 'transcricao', e.target.value)} placeholder="O que o áudio diz" />
              <div className="row" style={{ gap: 8, alignItems: 'center' }}>
                <small className="muted">{a.usos || 0} envio(s)</small><div className="sp" />
                {ed[a.id] && <button className="btn btn-p btn-sm" onClick={() => { salvar(a, ed[a.id]); setEd({ ...ed, [a.id]: undefined }); }}><Icon name="check" />Salvar</button>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function FluxoPage() {
  const [d, setD] = useState<any>(null);
  const [ed, setEd] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [bib, setBib] = useState<any[]>([]);
  const loadBib = () => api('/api/audios', 'GET').then((r: any) => setBib(r.audios || [])).catch(() => {});
  useEffect(() => { loadBib(); }, []);
  const load = () => api('/api/fluxos', 'GET').then((r: any) => { setD(r); if (!ed && r.fluxos?.length) setEd(JSON.parse(JSON.stringify(r.fluxos.find((f: any) => f.padrao) || r.fluxos[0]))); }).catch((e: any) => toast(e.message));
  useEffect(() => { load(); }, []);
  const tipos: Record<string, string> = d?.tipos || {};
  async function salvar() {
    setBusy(true);
    try {
      const r = await api('/api/fluxos', 'POST', { action: 'salvar', ...ed });
      setEd(JSON.parse(JSON.stringify(r.fluxo)));
      toast('Fluxo salvo ✨');
      load();
    } catch (e: any) { toast(e.message); }
    setBusy(false);
  }
  async function clonarES() {
    if (!ed) return;
    setBusy(true);
    try {
      const falas = [...new Set((ed.passos || []).filter((p: Passo) => p.tipo === 'audio' && (p.transcricao || '').trim()).map((p: Passo) => p.transcricao as string))];
      const escritos = [...new Set([ed.nome, ed.descricao, ...(ed.passos || []).filter((p: Passo) => p.tipo !== 'audio').map((p: Passo) => p.texto)].filter(Boolean) as string[])];
      let mf: Record<string, string> = {}, me: Record<string, string> = {};
      try { if (falas.length) mf = (await api('/api/fluxos', 'POST', { action: 'traduzir', fala: true, textos: falas })).mapa || {}; } catch {}
      try { if (escritos.length) me = (await api('/api/fluxos', 'POST', { action: 'traduzir', textos: escritos })).mapa || {}; } catch {}
      const t = (x?: string) => (x ? me[x] || x : x);
      const passos = (ed.passos || []).map((p: Passo) => p.tipo === 'audio'
        ? { ...p, id: novoId(), idioma_audio: p.url ? (p.idioma_audio || (ed.idioma === 'es' ? 'es' : 'pt')) : undefined, transcricao: p.transcricao ? mf[p.transcricao] || p.transcricao : p.transcricao }
        : { ...p, id: novoId(), texto: t(p.texto) });
      setEd({ nome: `${ed.nome} (ES)`, descricao: t(ed.descricao) || '', ativo: false, padrao: false, idioma: 'es', passos });
      toast('Cópia em espanhol criada (desligada). Os áudios ainda são os de português: copie cada texto, gere no ElevenLabs e troque o áudio antes de ligar.');
    } catch (e: any) { toast(e.message); }
    setBusy(false);
  }
  async function mudaIdioma(idioma: string) {
    const base = { ...ed, idioma };
    setEd(base);
    if (idioma !== 'es') return;
    const alvo = (ed?.passos || []).filter((p: Passo) => p.tipo === 'audio' && (p.transcricao || '').trim());
    if (!alvo.length) return;
    setBusy(true);
    try {
      const r = await api('/api/fluxos', 'POST', { action: 'traduzir', fala: true, textos: alvo.map((p: Passo) => p.transcricao) });
      setEd({ ...base, passos: (ed.passos || []).map((p: Passo) => p.tipo === 'audio' && p.transcricao?.trim() ? { ...p, transcricao: r.mapa?.[p.transcricao] || p.transcricao } : p) });
      toast(`${alvo.length} texto(s) de áudio traduzidos para espanhol falado: copie e gere no ElevenLabs. Salve o fluxo para guardar.`);
    } catch (e: any) { toast(e.message); }
    setBusy(false);
  }
  async function excluir() {
    if (!ed?.id || !confirm(`Excluir o fluxo "${ed.nome}"?`)) return;
    try { await api('/api/fluxos', 'POST', { action: 'excluir', id: ed.id }); setEd(null); load(); } catch (e: any) { toast(e.message); }
  }
  const passos: Passo[] = ed?.passos || [];
  const setPassos = (l: Passo[]) => setEd({ ...ed, passos: l });
  const add = (pos: number, tipo = 'texto') => { const l = [...passos]; l.splice(pos, 0, { id: novoId(), tipo, ...PADRAO[tipo] } as Passo); setPassos(l); };
  const camps = (d?.campanhas || []).filter((c: any) => ed?.id && c.fluxo_id === ed.id);
  return (
    <>
      <PageHead title="Fluxo" sub="A sequência de abertura da conversa (mensagens, áudios, imagens e esperas) antes da IA assumir" icon="send" tone="ai" help="abordagens" />
      {d?.aviso && <div className="card" style={{ marginBottom: 12, color: 'var(--warn)', fontWeight: 600 }}>{d.aviso}</div>}
      {d && !d.aviso && <Testes d={d} reload={load} />}
      {d && !d.aviso && <Biblioteca lista={bib} reload={loadBib} />}
      <div style={{ height: 16 }} />
      <div className="fx-top">
        {(d?.fluxos || []).map((f: any) => (
          <button key={f.id} className={'fx-tab' + (ed?.id === f.id ? ' on' : '')} onClick={() => setEd(JSON.parse(JSON.stringify(f)))}>
            <b>{f.nome}</b>
            <small>{f.ativo ? (f.padrao ? '● Ligado · padrão' : '● Ligado') : '○ Desligado'} · {f.iniciados || 0} iniciados · {f.concluidos || 0} concluídos</small>
          </button>
        ))}
        <button className="fx-tab novo" onClick={() => setEd({ nome: 'Novo fluxo', ativo: false, padrao: false, passos: [{ id: novoId(), tipo: 'texto', ...PADRAO.texto }, { id: novoId(), tipo: 'ia', ...PADRAO.ia }] })}><Icon name="plus" />Novo fluxo</button>
      </div>
      {ed && (
        <div className="fx-grid">
          <div className="card fx-side">
            <div className="field"><label>Nome</label><input className="input" value={ed.nome || ''} onChange={(e) => setEd({ ...ed, nome: e.target.value })} /></div>
            <div className="field"><label>Para que serve</label><textarea className="input" rows={3} value={ed.descricao || ''} onChange={(e) => setEd({ ...ed, descricao: e.target.value })} /></div>
            <div className="field"><label>Idioma deste fluxo</label><select className="input" value={ed.idioma || 'pt'} onChange={(e) => mudaIdioma(e.target.value)}><option value="pt">🇧🇷 Português (clientes do Brasil, +55)</option><option value="es">🇪🇸 Español (América Latina)</option></select></div>
            {ed.idioma === 'es' && passos.some((p) => p.tipo === 'audio' && p.url) && <div className="card" style={{ color: 'var(--warn)', fontSize: 12.5, fontWeight: 600 }}>Fluxo em espanhol com áudio gravado: confirme que cada áudio já está em espanhol (gere no ElevenLabs com o texto de cada passo) antes de ligar. Cliente de fora do Brasil não pode receber áudio em português.</div>}
            <label className="fx-sw"><input type="checkbox" checked={!!ed.ativo} onChange={(e) => setEd({ ...ed, ativo: e.target.checked })} /><span><b>Ligado</b><br /><small className="muted">Desligado, ele não roda em conversa nenhuma.</small></span></label>
            <label className="fx-sw"><input type="checkbox" checked={!!ed.padrao} onChange={(e) => setEd({ ...ed, padrao: e.target.checked })} /><span><b>Abertura padrão</b><br /><small className="muted">Roda em toda conversa nova (menos nas campanhas que têm um fluxo próprio).</small></span></label>
            {camps.length > 0 && <p className="muted" style={{ fontSize: 12.5 }}>Usado nas campanhas: {camps.map((c: any) => c.nome).join(', ')}</p>}
            <div className="fx-vars">
              <b>Variáveis do texto</b>
              <span><code>{'{saudacao}'}</code> Bom dia / Boa tarde / Boa noite</span>
              <span><code>{'{atendente}'}</code> nome da atendente do número</span>
              <span><code>{'{nome}'}</code> primeiro nome do cliente (se já souber)</span>
              <span><code>{'{empresa}'}</code> nome da empresa</span>
            </div>
            <p className="muted" style={{ fontSize: 12.5 }}>O fluxo só roda em conversa <b>nova</b>. Enquanto ele roda, a IA espera. No passo “Passar para a IA”, ela assume com tudo o que foi dito (inclusive o que os áudios falam).</p>
            <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
              <button className="btn btn-p" disabled={busy} onClick={salvar}>{busy ? <span className="spin" /> : <Icon name="check" />}Salvar fluxo</button>
              {ed.id && <button className="btn btn-g" disabled={busy} onClick={clonarES} title="Copia o fluxo inteiro, traduz os textos e deixa os áudios para você trocar pelos em espanhol"><Icon name="copy" />Clonar para espanhol</button>}
              {ed.id && <button className="btn btn-g" onClick={excluir}><Icon name="trash" />Excluir</button>}
            </div>
          </div>
          <div className="fx-canvas">
            <div className="fx-ini"><Icon name="chat" />Cliente manda a 1ª mensagem</div>
            {passos.map((p, i) => (
              <div key={p.id}>
                <div className="fx-seta"><button type="button" title="Inserir passo aqui" onClick={() => add(i)}>+</button></div>
                <Card p={p} i={i} total={passos.length} tipos={tipos}
                  set={(np) => setPassos(passos.map((x, j) => (j === i ? np : x)))}
                  mover={(dd) => { const l = [...passos]; const [x] = l.splice(i, 1); l.splice(i + dd, 0, x); setPassos(l); }}
                  tirar={() => setPassos(passos.filter((_, j) => j !== i))} audios={bib} idiomaFluxo={ed.idioma || 'pt'} />
              </div>
            ))}
            <div className="fx-seta"><button type="button" title="Adicionar passo no fim" onClick={() => add(passos.length)}>+</button></div>
            <div className="fx-add">
              {Object.entries(tipos).map(([k, v]) => <button key={k} type="button" className="btn btn-g btn-sm" onClick={() => add(passos.length, k)}><Icon name={ICO[k]} />{v}</button>)}
            </div>
          </div>
        </div>
      )}
      <style>{`.fx-top{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px}
.fx-tab{display:flex;flex-direction:column;align-items:flex-start;gap:2px;border:1.5px solid var(--line);background:var(--surface);border-radius:12px;padding:8px 12px;cursor:pointer;text-align:left;color:inherit}
.fx-tab.on{border-color:var(--ai);background:color-mix(in srgb,var(--ai) 7%,transparent)}.fx-tab small{color:var(--muted);font-size:11.5px}.fx-tab.novo{flex-direction:row;align-items:center;gap:6px;border-style:dashed}
.fx-grid{display:grid;grid-template-columns:300px 1fr;gap:16px;align-items:start}@media (max-width:900px){.fx-grid{grid-template-columns:1fr}}
.fx-side{position:sticky;top:12px;display:flex;flex-direction:column;gap:10px;margin:0}
.fx-sw{display:flex;gap:10px;align-items:flex-start;cursor:pointer}.fx-sw input{margin-top:3px;width:18px;height:18px;accent-color:var(--ai)}
.fx-vars{display:flex;flex-direction:column;gap:3px;font-size:12.5px;background:var(--bg);border-radius:10px;padding:10px}.fx-vars code{font-size:12px;margin-right:4px}
.fx-canvas{display:flex;flex-direction:column;align-items:stretch;max-width:640px;width:100%;margin:0 auto}
.fx-ini{align-self:center;display:flex;gap:8px;align-items:center;background:var(--ai);color:#fff;border-radius:999px;padding:8px 16px;font-weight:600;font-size:13px}
.fx-seta{display:flex;justify-content:center;position:relative;height:34px}.fx-seta::before{content:'';position:absolute;top:0;bottom:0;left:50%;border-left:2px dashed color-mix(in srgb,var(--ai) 45%,transparent)}
.fx-seta button{position:relative;z-index:1;align-self:center;width:24px;height:24px;border-radius:50%;border:1.5px solid var(--ai);background:var(--surface);color:var(--ai);font-weight:700;cursor:pointer;line-height:1}
.fx-card{border:1.5px solid var(--line);border-left:5px solid var(--c,#7a5af8);border-radius:14px;background:var(--surface);padding:10px 12px;display:flex;flex-direction:column;gap:8px;box-shadow:0 2px 8px #0000000d}
.fx-card.t-texto{--c:#7a5af8}.fx-card.t-audio{--c:#d6336a}.fx-card.t-imagem,.fx-card.t-pdf{--c:#0f7a6a}.fx-card.t-espera,.fx-card.t-aguardar{--c:#c9821a}.fx-card.t-ia{--c:#16a34a}
.fx-h{display:flex;gap:8px;align-items:center}.fx-h select{height:32px;font-size:13px;max-width:220px}.fx-n{width:22px;height:22px;border-radius:50%;background:var(--c);color:#fff;display:grid;place-items:center;font-size:12px;font-weight:700;flex:none}
.fx-faixa{display:flex;gap:6px;align-items:center;flex-wrap:wrap;font-size:12.5px;color:var(--muted)}.fx-faixa input{width:70px;height:30px}.fx-faixa em{font-style:normal}
.fx-arq{display:flex;gap:10px;align-items:center;flex-wrap:wrap}.fx-falta{font-size:12.5px;color:var(--warn)}
.fx-tst{display:grid;grid-template-columns:1fr 1fr;gap:18px}@media (max-width:900px){.fx-tst{grid-template-columns:1fr}}.fx-tst h4{margin:0 0 8px;font-size:13.5px}
.fx-ops{display:flex;flex-wrap:wrap;gap:8px}.fx-op{display:flex;flex-direction:column;align-items:flex-start;gap:2px;border:1.5px solid var(--line);background:var(--surface);color:inherit;border-radius:12px;padding:8px 12px;cursor:pointer;text-align:left}.fx-op.on{border-color:var(--ok);background:color-mix(in srgb,var(--ok) 9%,transparent)}.fx-op small{color:var(--muted);font-size:11.5px}
.fx-bib{display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:12px}.fx-aud{border:1.5px solid var(--line);border-left:5px solid #d6336a;border-radius:14px;padding:10px 12px;display:flex;flex-direction:column;gap:8px}.fx-aud.off{opacity:.55}
.fx-add{display:flex;gap:6px;flex-wrap:wrap;justify-content:center;margin-top:4px}`}</style>
    </>
  );
}
