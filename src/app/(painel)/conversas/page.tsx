'use client';
import Link from 'next/link';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { TxtSigno } from '@/components/Signo';
import { useMe } from '@/components/Shell';
import { PageHead } from '@/components/PageHead';
import { Icon, Ib } from '@/components/Icon';
import { Flag, FlagIdioma } from '@/components/Flag';
import { paisDoLeadRow, nomePais } from '@/lib/ddi';
import { LeadDrawer } from '@/components/LeadDrawer';
import { QuickControl } from '@/components/QuickControl';
import { soundOn, setSound, ding, api, toast, tempOf, initials, timeLabel, hourLabel, dayLabel, sameDay, stageOf, STEPS, useLive, brl, scoreColor, copyText } from '@/components/ui';
import { sb } from '@/lib/supabase/browser';
import { formatPhone } from '@/lib/phone';
import { norm, spNow } from '@/lib/util';
import { inService, serviceLabel, nextCommercialStart } from '@/lib/hours';
import { KINDS } from '@/lib/knowledge-kinds';
import { chipColor, chipName } from '@/lib/chips';

/** Cor de cada número (atualizada junto com a lista de números). */
let CHIP_C: Record<string, string> = {};

/** Etiqueta colorida do número de WhatsApp: "Comercial - 3671". */
function ChipTag({ id, numbers, prefix = '' }: { id?: string | null; numbers: Record<string, string>; prefix?: string }) {
  if (!id || !numbers[id]) return null;
  return (
    <span className="chiptag" style={{ ['--c' as any]: CHIP_C[id] || 'var(--wa)' }} title={`Número de WhatsApp: ${numbers[id]}`}>
      {prefix}
      {numbers[id]}
    </span>
  );
}

/** Começa uma conversa com um número digitado (a IA escreve ou a equipe escreve). */
function NewChat({ numbers, onClose, onDone }: { numbers: Record<string, string>; onClose: () => void; onDone: (id: string) => void }) {
  const me = useMe();
  const master = me?.member?.role === 'master' || me?.member?.role === 'admin';
  const [f, setF] = useState({ phone: '', name: '', niche: '', context: '', number_id: Object.keys(numbers)[0] || '', mode: 'manual', text: 'Oi, tudo bem? 😊', ai: true, cortesia: false });
  const [busy, setBusy] = useState(false);
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value });
  async function go(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await api('/api/conversations/start', 'POST', f);
      toast(f.mode === 'ia' ? 'A IA mandou a primeira mensagem' : f.ai ? 'Mensagem enviada: quando a pessoa responder, a IA assume ✨' : 'Mensagem enviada');
      onDone(r.id);
    } catch (err: any) {
      toast(err.message);
    }
    setBusy(false);
  }
  return (
    <>
      <div className="scrim" onClick={onClose} />
      <form className="modal" role="dialog" aria-label="Nova conversa" onSubmit={go} style={{ textAlign: 'left', alignItems: 'stretch', maxHeight: '92vh', overflowY: 'auto' }}>
        <h2 style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <Ib name="chat" tone="wa" size="sm" /> Nova conversa
        </h2>
        <div className="field">
          <label htmlFor="nc-phone">WhatsApp do cliente</label>
          <input id="nc-phone" className="input" inputMode="tel" required value={f.phone} onChange={set('phone')} placeholder="(19) 99999-9999" autoFocus />
        </div>
        <div className="field">
          <label htmlFor="nc-name">Nome (opcional)</label>
          <input id="nc-name" className="input" value={f.name} onChange={set('name')} placeholder="Maria" />
        </div>
        <div className="field">
          <label htmlFor="nc-ctx">O que a IA precisa saber (opcional)</label>
          <textarea id="nc-ctx" className="input" rows={2} value={f.context} onChange={set('context')} placeholder="Ex.: indicação da Maria, quer entender a vida amorosa, prefere áudio" />
        </div>
        {Object.keys(numbers).length > 1 && (
          <div className="field">
            <label htmlFor="nc-num">Enviar pelo número</label>
            <select id="nc-num" className="input" value={f.number_id} onChange={set('number_id')}>
              {Object.entries(numbers).map(([id, l]) => (
                <option key={id} value={id}>
                  {l}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="seg" role="group" aria-label="Quem escreve">
          <button type="button" aria-pressed={f.mode === 'manual'} onClick={() => setF({ ...f, mode: 'manual' })}>
            Eu mando a 1ª mensagem
          </button>
          <button type="button" aria-pressed={f.mode === 'ia'} onClick={() => setF({ ...f, mode: 'ia' })}>
            A IA escreve
          </button>
        </div>
        {f.mode === 'manual' && (
          <div className="field">
            <label htmlFor="nc-text">Mensagem</label>
            <textarea id="nc-text" className="input" rows={3} value={f.text} onChange={set('text')} placeholder="Oi, Maria! Aqui é o …" />
          </div>
        )}
        <label style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 13 }}>
          <input type="checkbox" checked={f.ai} onChange={(e) => setF({ ...f, ai: e.target.checked })} />
          A IA assume a conversa quando a pessoa responder
        </label>
        {master && (
          <label style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 13 }}>
            <input type="checkbox" checked={f.cortesia} onChange={(e) => setF({ ...f, cortesia: e.target.checked })} />
            🎁 Gratuito / Teste (entrega sem cobrar, sem a pessoa perceber)
          </label>
        )}
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-wa" disabled={busy}>
            {busy ? <span className="spin" /> : <Icon name="send" />}
            {busy ? 'Enviando…' : 'Começar conversa'}
          </button>
          <button type="button" className="btn btn-g" onClick={onClose}>
            Cancelar
          </button>
        </div>
      </form>
    </>
  );
}

/** 👍/👎 numa mensagem enviada: ensina a IA o que repetir e o que evitar. */
/** Reduz a foto antes de enviar (WhatsApp recomprime de qualquer jeito; assim sobe mais rápido). */
async function shrinkForWa(file: File): Promise<File> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return file;
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((ok, bad) => {
      const i = new Image();
      i.onload = () => ok(i);
      i.onerror = bad;
      i.src = url;
    });
    const scale = Math.min(1, 1920 / Math.max(img.naturalWidth, img.naturalHeight));
    if (scale === 1 && file.size < 1.5 * 1024 * 1024 && file.type === 'image/jpeg') return file;
    const c = document.createElement('canvas');
    c.width = Math.round(img.naturalWidth * scale);
    c.height = Math.round(img.naturalHeight * scale);
    const g = c.getContext('2d')!;
    g.fillStyle = '#fff';
    g.fillRect(0, 0, c.width, c.height);
    g.drawImage(img, 0, 0, c.width, c.height);
    const blob: Blob | null = await new Promise((ok) => c.toBlob(ok, 'image/jpeg', 0.86));
    return blob ? new File([blob], 'foto.jpg', { type: 'image/jpeg' }) : file;
  } catch {
    return file;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Trecho citado (resposta a uma mensagem específica), igual ao WhatsApp. */
function Quote({ q, numbers, onJump }: { q: any; numbers?: any; onJump?: () => void }) {
  if (!q) return null;
  return (
    <button type="button" className={`quote ${q.dir === 'in' ? 'q-in' : 'q-out'}`} onClick={onJump} title="Ir para a mensagem citada">
      <b>{q.dir === 'in' ? 'Cliente' : 'Você'}</b>
      <span>{q.body || '📷 Imagem'}</span>
    </button>
  );
}

/** Mídia da conversa (foto, áudio, vídeo, PDF, figurinha): a cópia guardada abre direto; as antigas carregam ao clicar (vêm do WhatsApp). */
function MsgMedia({ m }: { m: any }) {
  const [src, setSrc] = useState<string | null>(m.meta?.url || m._preview || null);
  const [mime, setMime] = useState<string>(m.meta?.mime || '');
  const [busy, setBusy] = useState(false);
  const [big, setBig] = useState(false);
  const kind = m.kind;
  async function load() {
    setBusy(true);
    try {
      const r = await api(`/api/messages/media?id=${m.id}`, 'GET');
      setSrc(r.src);
      if (r.mime) setMime(r.mime);
    } catch (e: any) {
      toast(e.message);
    }
    setBusy(false);
  }
  const label = kind === 'audio' ? '▶ Ouvir áudio' : kind === 'video' ? '▶ Ver vídeo' : kind === 'document' ? '📄 Abrir arquivo' : kind === 'sticker' ? 'Ver figurinha' : '📷 Ver imagem';
  if (!src) {
    if (!m.wa_message_id) return null;
    return (
      <button type="button" className="img-load" onClick={load} disabled={busy}>
        {busy ? <span className="spin" /> : null} {label}
      </button>
    );
  }
  if (kind === 'audio') return <audio className="bub-audio" controls preload="metadata" src={src} />;
  if (kind === 'video') return <video className="bub-img" controls preload="metadata" src={src} />;
  if (kind === 'document') {
    const name = m.meta?.file || String(m.body || '').replace(/^\[documento\]\s*/, '') || 'arquivo';
    const isPdf = /pdf/i.test(mime) || /\.pdf$/i.test(name);
    return (
      <a className="bub-doc" href={src} target="_blank" rel="noopener noreferrer" download={isPdf ? undefined : name}>
        <span className="bub-doc-ic">{isPdf ? 'PDF' : 'ARQ'}</span>
        <span>
          <b>{name}</b>
          <small>{isPdf ? 'Abrir PDF' : 'Baixar arquivo'}</small>
        </span>
      </a>
    );
  }
  return (
    <>
      <img className={kind === 'sticker' ? 'bub-sticker' : 'bub-img'} src={src} alt="" onClick={() => setBig(true)} />
      {big && (
        <div className="img-lb" onClick={() => setBig(false)} role="dialog" aria-label="Imagem">
          <img src={src} alt="" />
        </div>
      )}
    </>
  );
}

function Feedback({ m }: { m: any }) {
  const [v, setV] = useState<number | null>(m.feedback ?? null);
  async function set(next: number) {
    const val = v === next ? null : next;
    let note: string | null = null;
    if (val === -1) note = window.prompt('O que estava errado? (opcional, ajuda a IA a aprender)') || null;
    setV(val);
    try {
      await api('/api/messages/feedback', 'POST', { id: m.id, value: val, note });
      toast(val === 1 ? 'Anotado: a IA vai repetir esse jeito' : val === -1 ? 'Anotado: a IA vai evitar isso' : 'Avaliação removida');
    } catch (e: any) {
      setV(v);
      toast(e.message);
    }
  }
  return (
    <span className="fb" data-perm="conversas.responder">
      <button type="button" aria-pressed={v === 1} title="Boa resposta" onClick={() => set(1)}>
        👍
      </button>
      <button type="button" aria-pressed={v === -1} title="Resposta ruim" onClick={() => set(-1)}>
        👎
      </button>
    </span>
  );
}

function Wave() {
  return (
    <span className="wave">
      {Array.from({ length: 26 }, (_, i) => (
        <i key={i} style={{ height: 5 + Math.abs(Math.sin(i * 1.7)) * 15 }} />
      ))}
    </span>
  );
}

function Gauge({ v, label, color }: { v: number; label: string; color: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flex: 1 }}>
      <div className={`ring${v > 70 ? ' ring-hot' : ''}`} style={{ ['--v' as any]: v, ['--c' as any]: color, width: 64, height: 64 }}>
        <b style={{ width: 50, height: 50, fontSize: 15 }}>{v}%</b>
      </div>
      <small className="muted" style={{ fontSize: 11.5, fontWeight: 600, textAlign: 'center' }}>
        {label}
      </small>
    </div>
  );
}

/* ---- presença: um canal só para a página inteira (cada membro diz qual conversa está aberta) ---- */
let presCh: any = null;
let presReady = false;
let presMe: { id: string; name: string; lead: string } | null = null;
let presState: Record<string, any[]> = {};
const presSubs = new Set<() => void>();

function presTrack() {
  if (presCh && presReady && presMe) presCh.track({ name: presMe.name, lead: presMe.lead, at: Date.now() }).catch(() => {});
}
function presenceJoin(id: string, name: string, lead: string, cb: () => void) {
  presMe = { id, name, lead };
  presSubs.add(cb);
  if (!presCh) {
    presCh = sb().channel('ver-conversas', { config: { presence: { key: id } } });
    presCh.on('presence', { event: 'sync' }, () => {
      presState = presCh.presenceState() || {};
      presSubs.forEach((f) => f());
    });
    presCh.subscribe((status: string) => {
      if (status === 'SUBSCRIBED') {
        presReady = true;
        presTrack();
      }
    });
  } else presTrack();
}
function presenceLeave(cb: () => void) {
  presSubs.delete(cb);
}
/** Quem (membros) está com esta conversa aberta agora. */
function viewersOf(lead: string) {
  const out: { id: string; name: string }[] = [];
  for (const [id, metas] of Object.entries(presState)) {
    const m = (metas as any[])[(metas as any[]).length - 1];
    if (m?.lead === lead) out.push({ id, name: m.name || 'Equipe' });
  }
  return out;
}

/**
 * Equipe na conversa: quem está com ela aberta agora (ao vivo), responsável, notas internas (só a equipe vê)
 * e o histórico do que cada membro fez (aprovou, assumiu, arquivou, respondeu…).
 */
function TeamBox({ l }: { l: any }) {
  const me = useMe();
  const [viewers, setViewers] = useState<{ id: string; name: string }[]>([]);
  const [team, setTeam] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [hist, setHist] = useState<any[]>([]);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [showHist, setShowHist] = useState(false);
  const myId = me?.id;
  const myName = me?.member?.name || me?.email || 'Equipe';

  // quem está com esta conversa aberta (presença ao vivo, sem notificar ninguém)
  useEffect(() => {
    if (!myId || !l?.id) return;
    const update = () => setViewers(viewersOf(l.id));
    try {
      presenceJoin(myId, myName, l.id, update);
    } catch {
      /* presença é só informativa: nunca derruba a tela */
    }
    update();
    return () => presenceLeave(update);
  }, [l?.id, myId, myName]);

  async function loadNotes() {
    const [{ data: n }, { data: h }] = await Promise.all([
      sb().from('lead_notes').select('*').eq('lead_id', l.id).order('created_at', { ascending: false }).limit(30),
      sb().from('lead_events').select('id,text,type,created_at,actor_name,meta').eq('lead_id', l.id).order('created_at', { ascending: false }).limit(60),
    ]);
    setNotes(n || []);
    setHist((h || []).filter((e: any) => e.actor_name || e.meta?.actor).slice(0, 25));
  }
  useEffect(() => {
    if (!l?.id) return;
    loadNotes().catch(() => {});
    sb()
      .from('team_members')
      .select('id,name,email,active')
      .then(({ data }: any) => setTeam((data || []).filter((m: any) => m.active !== false)));
    const ch = sb()
      .channel(`notas:${l.id}:${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'lead_notes', filter: `lead_id=eq.${l.id}` }, () => loadNotes())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'lead_events', filter: `lead_id=eq.${l.id}` }, () => loadNotes())
      .subscribe();
    return () => {
      sb().removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [l?.id]);

  async function act(body: any, msg: string) {
    setBusy(true);
    try {
      await api(`/api/leads/${l.id}`, 'POST', body);
      toast(msg);
      loadNotes();
    } catch (e: any) {
      toast(e.message);
    }
    setBusy(false);
  }
  const others = viewers.filter((v) => v.id !== myId);
  return (
    <div className="teambox">
      <div className="tb-row">
        <span className="tb-eye" title="Quem está com esta conversa aberta agora">
          👁
        </span>
        <span className="tb-viewers">
          {viewers.length === 0 ? (
            <small className="muted">Só você</small>
          ) : (
            viewers.map((v) => (
              <span key={v.id} className="viewer" title={v.id === myId ? 'Você' : `${v.name} está vendo esta conversa`}>
                <i />
                {v.id === myId ? 'Você' : v.name}
              </span>
            ))
          )}
        </span>
        {others.length > 0 && <small className="muted">{others.length === 1 ? 'também está aqui' : 'também estão aqui'}</small>}
      </div>
      <div className="tb-row">
        <label htmlFor={`resp-${l.id}`} className="muted" style={{ fontSize: 12 }}>
          Responsável
        </label>
        <select id={`resp-${l.id}`} className="input" style={{ height: 30, flex: 1 }} value={l.assigned_to || ''} disabled={busy} onChange={(e) => act({ action: 'assign', member: e.target.value || null }, e.target.value ? 'Responsável definido' : 'Conversa sem responsável')}>
          <option value="">Ninguém</option>
          {team.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name || m.email}
              {m.id === myId ? ' (eu)' : ''}
            </option>
          ))}
        </select>
        {l.assigned_to !== myId && (
          <button className="btn btn-sm btn-g" disabled={busy} onClick={() => act({ action: 'assign', member: myId }, 'Agora você é o responsável')}>
            Assumir
          </button>
        )}
      </div>
      <div className="tb-notes">
        <div style={{ display: 'flex', gap: 6 }}>
          <input className="input" style={{ height: 32 }} placeholder="Nota interna (só a equipe vê)…" value={note} onChange={(e) => setNote(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && note.trim() && (act({ action: 'note', text: note }, 'Nota salva'), setNote(''))} aria-label="Nota interna" />
          <button className="btn btn-sm" disabled={busy || !note.trim()} onClick={() => (act({ action: 'note', text: note }, 'Nota salva'), setNote(''))}>
            Salvar
          </button>
        </div>
        {notes.slice(0, 5).map((n) => (
          <div key={n.id} className="tb-note">
            <b>{n.author_name || 'Equipe'}</b> <small className="muted">{timeLabel(n.created_at)}</small>
            <p>{n.text}</p>
          </div>
        ))}
      </div>
      <button className="linkbtn" style={{ fontSize: 12 }} onClick={() => setShowHist((v) => !v)}>
        {showHist ? 'Esconder' : 'Ver'} o que a equipe fez nesta conversa ({hist.length})
      </button>
      {showHist && (
        <div className="tb-hist">
          {hist.length === 0 && <small className="muted">Nenhuma ação da equipe ainda.</small>}
          {hist.map((e) => (
            <div key={e.id}>
              <b>{e.actor_name || e.meta?.actor?.name}</b> <small className="muted">· {timeLabel(e.created_at)}</small>
              <p>{e.text}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Pedido de desconto abaixo do mínimo: a equipe aprova um valor ou recusa ali mesmo (o cliente só ouviu uma frase neutra). */
function ApprovalBar({ lead }: { lead: any }) {
  const txt = String(lead.needs_human).replace(/^APROVAÇÃO: /, '');
  const asked = (txt.match(/R\$\s*([\d.]+(?:,\d{2})?)/) || [])[1] || '';
  const [price, setPrice] = useState(asked.replace(/\./g, ''));
  const [busy, setBusy] = useState(false);
  useEffect(() => setPrice(asked.replace(/\./g, '')), [lead.id, asked]);
  async function act(body: any, msg: string) {
    setBusy(true);
    try {
      await api(`/api/leads/${lead.id}`, 'POST', body);
      toast(msg);
    } catch (e: any) {
      toast(e.message);
    }
    setBusy(false);
  }
  return (
    <div className="alert approval-bar" role="alert">
      <span className="approval-ico" aria-hidden="true">⚠️</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <b>Aprovação de valor:</b> {txt}
        <small className="muted" style={{ display: 'block' }}>O cliente recebeu só uma resposta neutra ("deixa eu ver o que consigo fazer…"). A IA continua assim que você decidir.</small>
      </div>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontSize: 13 }}>R$</span>
        <input className="input" style={{ width: 90, height: 32 }} value={price} onChange={(e) => setPrice(e.target.value)} inputMode="decimal" aria-label="Valor aprovado" />
        <button data-perm="leads.desconto" className="btn btn-sm btn-p" disabled={busy || !Number(price.replace(',', '.'))} onClick={() => act({ action: 'approve', price: Number(price.replace(',', '.')) }, 'Valor liberado. A IA fecha com o cliente')}>
          Aprovar
        </button>
        <button data-perm="leads.desconto" className="btn btn-sm" disabled={busy} onClick={() => act({ action: 'deny' }, 'Recusado. A IA mantém o mínimo e oferece um bônus')}>
          Recusar
        </button>
      </div>
    </div>
  );
}

/** Homem/mulher do cliente (detectado sozinho pelo nome; a equipe pode corrigir). Define o modelo masculino/feminino. */
function GenderPick({ l }: { l: any }) {
  const g = l.gender || l.memory?.genero_cliente || '';
  async function set(v: string) {
    try {
      await api(`/api/leads/${l.id}`, 'POST', { action: 'gender', gender: v === g ? null : v });
      toast(v === g ? 'Gênero limpo (o sistema detecta de novo pelo nome)' : `Prévias com o modelo ${v}`);
    } catch (e: any) {
      toast(e.message);
    }
  }
  return (
    <span style={{ display: 'inline-flex', gap: 2 }} title="Homem ou mulher (detectado pelo nome; clique para corrigir). Escolhe o modelo masculino/feminino da prévia.">
      {[
        ['masculino', '♂'],
        ['feminino', '♀'],
      ].map(([v, s]) => (
        <button key={v} className="chip" onClick={() => set(v)} aria-pressed={g === v} style={{ ['--t' as any]: g === v ? (v === 'feminino' ? '#db2777' : '#2563eb') : 'var(--muted)', cursor: 'pointer', opacity: g && g !== v ? 0.45 : 1 }} aria-label={v}>
          {s}
        </button>
      ))}
    </span>
  );
}

const INTENT_TXT: Record<string, string> = {
  quer_ver_previa: 'quer ver a prévia', quer_mudar_previa: 'quer corrigir dados', cobrando_algo_prometido: 'cobrando algo', repetiu_pedido: 'repetiu o pedido', quer_pagar: 'quer pagar 💰',
  pergunta_preco: 'perguntou o preço', pergunta_servico_ou_prazo: 'dúvida sobre o mapa', objecao: 'objeção', vai_pensar: 'vai pensar', mandou_material: 'mandou arquivo/comprovante',
  elogio_ou_concordou: 'gostou / concordou', reclamacao_ou_irritado: 'reclamou / irritado', quer_falar_com_pessoa: 'quer falar com pessoa', perguntou_se_e_robo: 'perguntou se é robô',
  nao_quer_mais: 'não quer mais', conversa_social: 'conversa / desabafo', outro: 'outro',
};
const HUMOR: Record<string, string> = { animado: '😄 animado(a)', neutro: '🙂 neutro', apressado: '⏱️ com pressa', desconfiado: '🤨 desconfiado(a)', impaciente: '😤 impaciente', irritado: '😠 irritado(a)', triste: '😢 triste' };

/** Intenção do cliente na última mensagem (o que ele quis dizer, intenções e humor), lida pela IA. */
function Intencao({ l }: { l: any }) {
  const m = l.memory || {};
  if (!m.intencao && !(m.intencoes || []).length) return null;
  return (
    <div className="sect">
      <h3>Intenção agora</h3>
      {m.intencao && <p style={{ fontSize: 13.5, margin: '0 0 6px' }}>{m.intencao}</p>}
      <div className="chips">
        {(m.intencoes || []).map((i: string) => <span key={i} className="chip" style={{ ['--t' as any]: i === 'quer_pagar' ? 'var(--ok)' : /reclam|nao_quer|robo/.test(i) ? 'var(--bad)' : 'var(--ai)' }}>{INTENT_TXT[i] || i}</span>)}
        {m.humor && <span className="chip" style={{ ['--t' as any]: 'var(--muted)' }}>{HUMOR[m.humor] || m.humor}</span>}
      </div>
    </div>
  );
}

/** Ficha do cliente: tudo o que a IA já sabe (dados, links enviados, valores, prazos e onde parou). É a base para retomar dias depois. */
function Ficha({ l, msgs }: { l: any; msgs: any[] }) {
  const m = l.memory || {};
  const links = useMemo(() => {
    const out: { url: string; label: string }[] = [];
    const seen = new Set<string>();
    for (const x of msgs) {
      if (x.direction !== 'out') continue;
      for (const u of String(x.body || '').match(/https?:\/\/[^\s<>"']+/g) || []) {
        const url = u.replace(/[.,;:!?)]+$/, '');
        if (seen.has(url)) continue;
        seen.add(url);
        const label = /\/mapa\//.test(url) ? 'Mapa da Alma' : /\/previa\//.test(url) ? 'Prévia do mapa' : /\/pagar\//.test(url) ? 'Link de pagamento' : 'Link';
        out.push({ url, label });
      }
    }
    return out.slice(-8);
  }, [msgs]);
  const first = String(m.nome_cliente || '').trim().split(/\s+/)[0];
  const rows: [string, any][] = [
    ['Origem', l.source === 'site' ? 'Site mapadelalma.site (teste gratuito)' : l.source === 'anuncio' ? `Anúncio${l.campaign ? ` · ${l.campaign}` : ''}` : l.source === 'checkout' ? 'Link de pagamento' : 'Direto no WhatsApp'],
    ['Nome', m.nome_cliente ? `${m.nome_cliente}${first && first !== m.nome_cliente ? ` (chamar de ${first})` : ''}` : null],
    ['Mapa', m.mapa_tipo ? (String(m.mapa_tipo) === 'casal' ? 'Mapa do casal' : 'Mapa pessoal') : null],
    ['Nome do mapa', m.mapa_nome_completo],
    ['Nascimento', m.mapa_nascimento],
    ['Signo', m.signo],
    ['2ª pessoa', [m.mapa_nome_2, m.mapa_nascimento_2].filter(Boolean).join(' · ') || null],
    ['O que busca', m.interesse || m.objetivo],
    ['Consultas ao mapa', m.consultas ? `${m.consultas} consulta(s) na conversa${m.consulta_pendente ? ' · olhando o mapa agora' : ''}` : null],
    ['Senha do mapa', m.senha_mapa],
    ['Cidade', m.cidade || l.city],
    ['E-mail', m.email],
    ['Valores', [...(m.precos_ditos || []), l.deal_price ? `último oferecido: ${brl(l.deal_price)}` : null].filter(Boolean).join(' · ') || null],
    ['Negociação', (m.negociacao || []).join('\n') || null],
    ['Prazos', (m.prazos || []).join('\n') || null],
    ['Objeções', (l.objections || []).join(' · ') || null],
    ['Onde parou', m.ultima_tratativa],
  ];
  const shown = rows.filter(([, v]) => v != null && String(v).trim());
  if (!shown.length && !links.length) return null;
  return (
    <div className="sect">
      <h3>Ficha do cliente</h3>
      <dl className="ficha">
        {shown.map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd style={{ whiteSpace: 'pre-line' }}><TxtSigno t={String(v)} /></dd>
          </div>
        ))}
        {links.length > 0 && (
          <div>
            <dt>Links enviados</dt>
            <dd>
              {links.map((x) => (
                <a key={x.url} href={x.url} target="_blank" rel="noopener noreferrer" title={x.url}>
                  {x.label}
                </a>
              ))}
            </dd>
          </div>
        )}
      </dl>
    </div>
  );
}

/** Perfil do contato (como no WhatsApp Web): foto grande, nome, número, recado, conta comum ou comercial e dados da empresa. */
function ContactProfile({ lead, photo, numbers, onClose }: { lead: any; photo?: string | null; numbers: Record<string, string>; onClose: () => void }) {
  const [p, setP] = useState<any>(null);
  const [zoom, setZoom] = useState(false);
  useEffect(() => {
    api(`/api/leads/${lead.id}/profile`, 'GET')
      .then(setP)
      .catch(() => setP({}));
    const k = (e: KeyboardEvent) => e.key === 'Escape' && (zoom ? setZoom(false) : onClose());
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lead.id, zoom]);
  const pic = p?.picture || photo;
  const m = lead.memory || {};
  return (
    <div className="cprof-scrim" onClick={onClose} role="dialog" aria-label={`Perfil de ${lead.name}`}>
      <aside className="cprof" onClick={(e) => e.stopPropagation()}>
        <header>
          <button type="button" className="iconbtn" onClick={onClose} aria-label="Fechar">
            <Icon name="x" />
          </button>
          <b>Dados do contato</b>
        </header>
        <div className="cprof-top">
          <button type="button" className="cprof-pic" onClick={() => pic && setZoom(true)} disabled={!pic} aria-label="Ver foto em tamanho grande">
            {pic ? <img src={pic} alt={`Foto de ${lead.name}`} /> : <span>{initials(lead.name)}</span>}
          </button>
          <h3>{p?.name || lead.name}</h3>
          <span className="cprof-num">{formatPhone(lead.whatsapp)}</span>
          {p === null ? (
            <span className="spin" />
          ) : (
            <span className={`cprof-kind ${p?.isBusiness ? 'biz' : ''}`}>{p?.isBusiness ? '🏢 Conta comercial (WhatsApp Business)' : '👤 Conta pessoal'}</span>
          )}
        </div>
        {typeof p?.status === 'string' && p.status.trim() && (
          <section>
            <small>Recado</small>
            <p>{p.status}</p>
          </section>
        )}
        {p?.business && (
          <section>
            <small>Empresa</small>
            {p.business.category && <p><b>{p.business.category}</b></p>}
            {p.business.description && <p style={{ whiteSpace: 'pre-line' }}>{p.business.description}</p>}
            {p.business.address && <p>📍 {p.business.address}</p>}
            {p.business.email && <p>✉️ {p.business.email}</p>}
            {(p.business.website || []).map((w: string) => (
              <p key={w}>
                🔗{' '}
                <a href={w.startsWith('http') ? w : `https://${w}`} target="_blank" rel="noopener noreferrer">
                  {w}
                </a>
              </p>
            ))}
          </section>
        )}
        <section>
          <small>No painel</small>
          <p>
            Origem: <b>{lead.source === 'site' ? 'Veio do site (teste gratuito)' : lead.source === 'anuncio' ? `Anúncio${lead.campaign ? ` · ${lead.campaign}` : ''}` : lead.source === 'google' ? 'Prospecção (Google)' : 'Direto no WhatsApp'}</b>
          </p>
          {m.nome_cliente && <p>Nome dito na conversa: <b>{m.nome_cliente}</b></p>}
          {m.mapa_nome_completo && <p>Mapa de: <b>{m.mapa_nome_completo}</b>{m.mapa_nascimento ? ` · ${m.mapa_nascimento}` : ''}</p>}
          {lead.number_id && numbers[lead.number_id] && <p>Atendido pelo número: <b>{numbers[lead.number_id]}</b></p>}
          <p>Etapa: <b>{stageOf(lead.stage)[1]}</b></p>
        </section>
        <a className="btn btn-wa" style={{ margin: '0 16px 16px', justifyContent: 'center' }} href={`https://wa.me/${String(lead.whatsapp || '').replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer">
          <Icon name="wa" /> Abrir no WhatsApp
        </a>
      </aside>
      {zoom && pic && (
        <div className="cprof-zoom" onClick={(e) => (e.stopPropagation(), setZoom(false))}>
          <img src={pic} alt={`Foto de ${lead.name}`} />
        </div>
      )}
    </div>
  );
}

/** Conversa GRATUITA / TESTE: a IA atende normal e entrega sem cobrar (só o Master liga). */
function Cortesia({ l }: { l: any }) {
  const me = useMe();
  const [on, setOn] = useState<boolean>(!!l.cortesia);
  useEffect(() => setOn(!!l.cortesia), [l.id, l.cortesia]);
  const master = me?.member?.role === 'master' || me?.member?.role === 'admin';
  if (!master && !on) return null;
  return (
    <div className="sect">
      <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: master ? 'pointer' : 'default', padding: '10px 12px', borderRadius: 12, border: `1.5px ${on ? 'solid' : 'dashed'} ${on ? 'var(--ok)' : 'var(--line)'}`, background: on ? 'color-mix(in srgb, var(--ok) 8%, transparent)' : 'transparent' }}>
        <input type="checkbox" checked={on} disabled={!master} style={{ marginTop: 3, accentColor: '#16a34a' }} onChange={async (e) => { const v = e.target.checked; setOn(v); try { await api(`/api/leads/${l.id}`, 'POST', { action: 'cortesia', on: v }); toast(v ? 'Conversa gratuita/teste: a IA entrega sem cobrar 🎁' : 'Conversa voltou ao normal (com cobrança)'); } catch (err: any) { setOn(!v); toast(err.message); } }} />
        <span><b style={{ fontSize: 13.5 }}>🎁 Gratuito / Teste</b><br /><small className="muted">A IA atende normal (consulta, prévia, leitura) e entrega o mapa ou o tarô sem falar de preço nem pagamento. O cliente não percebe.</small></span>
      </label>
    </div>
  );
}

/** Áudio pronto: escolher da biblioteca, ouvir antes e mandar (nunca o mesmo duas vezes para o mesmo contato). */
function AudioPronto({ l }: { l: any }) {
  const [lista, setLista] = useState<any[] | null>(null);
  const [aberto, setAberto] = useState(false);
  const [busy, setBusy] = useState('');
  async function abrir() {
    setAberto(true);
    try { const r = await api(`/api/audios?lead=${l.id}`, 'GET'); setLista(r.audios || []); if (r.aviso) toast(r.aviso); } catch (e: any) { toast(e.message); }
  }
  async function mandar(a: any) {
    setBusy(a.id);
    try { await api('/api/audios', 'POST', { action: 'enviar', lead_id: l.id, id: a.id }); toast('Áudio enviado 🎤'); setLista((lista || []).map((x) => (x.id === a.id ? { ...x, enviado: true } : x))); } catch (e: any) { toast(e.message); }
    setBusy('');
  }
  return (
    <>
      <style>{`.ap-bg{position:fixed;inset:0;background:rgba(10,6,20,.45);display:grid;place-items:center;z-index:90;padding:16px}.ap-modal{width:min(560px,100%);max-height:88vh;overflow:auto;margin:0}.ap-item{border:1.5px solid var(--line);border-radius:12px;padding:10px;display:flex;flex-direction:column;gap:6px}.ap-item.off{opacity:.55}`}</style>
      <button className="btn btn-g btn-sm" onClick={abrir}><Icon name="mic" />Áudio pronto</button>
      {aberto && (
        <div className="ap-bg" onClick={() => setAberto(false)}>
          <div className="card ap-modal" onClick={(e) => e.stopPropagation()}>
            <div className="card-h"><Ib name="mic" tone="ai" size="sm" /><h2>Mandar áudio pronto</h2><div className="sp" /><button className="btn btn-g btn-sm" onClick={() => setAberto(false)}><Icon name="x" /></button></div>
            {!lista ? <span className="spin" /> : !lista.filter((a) => a.ativo).length ? <p className="muted">Nenhum áudio ligado. Suba em Fluxo › Biblioteca de áudios.</p> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {lista.filter((a) => a.ativo).map((a) => (
                  <div key={a.id} className={'ap-item' + (a.enviado ? ' off' : '')}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <b style={{ flex: 1 }}>A{a.codigo} · {a.nome}</b>
                      {a.enviado ? <span className="chip">já enviado ✓</span> : <button className="btn btn-p btn-sm" disabled={!!busy} onClick={() => mandar(a)}>{busy === a.id ? <span className="spin" /> : <Icon name="send" />}Enviar</button>}
                    </div>
                    {a.intuito && <small className="muted">Quando usar: {a.intuito}</small>}
                    <audio controls preload="none" src={a.url} style={{ height: 34, width: '100%' }} />
                    {a.transcricao && <small className="muted" style={{ whiteSpace: 'pre-line' }}>“{a.transcricao}”</small>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

/** Atalhos da consulta: mandar só as pirâmides escolhidas, a imagem de apresentação ou uma simpatia. */
const PIRS: [string, string][] = [['vida', 'Vida'], ['pessoal', 'Pessoal'], ['social', 'Social'], ['destino', 'Destino']];
function Atalhos({ l }: { l: any }) {
  const [so, setSo] = useState<string[]>([]);
  const [busy, setBusy] = useState('');
  const [simp, setSimp] = useState<any[] | null>(null);
  const [cod, setCod] = useState('');
  const temMapa = !!(l.mapa_slug || l.preview_slug);
  const enviadas: string[] = l.memory?.piramides_enviadas || [];
  useEffect(() => { setSo([]); setCod(''); }, [l.id]);
  async function pir(enviar: boolean, abrir = false) {
    if (!so.length) return toast('Escolha de 1 a 3 pirâmides');
    setBusy(enviar ? 'pir' : 'link');
    try {
      const r = await api(`/api/leads/${l.id}`, 'POST', { action: 'piramides', so, enviar });
      if (abrir) window.open(r.url, '_blank');
      else if (!enviar) { copyText(r.url); toast('Link copiado'); }
      else toast('Pirâmides enviadas no WhatsApp 🔺');
    } catch (e: any) { toast(e.message); }
    setBusy('');
  }
  async function previa(modo: 'enviar' | 'link' | 'ver' | 'renovar') {
    setBusy('pv');
    try {
      const r = await api(`/api/leads/${l.id}`, 'POST', { action: 'previa', modo: modo === 'enviar' || modo === 'renovar' ? modo : 'link' });
      if (modo === 'ver') window.open(r.url + '?previa=1', '_blank');
      else if (modo === 'link') { copyText(r.url); toast('Link da prévia copiado'); }
      else if (modo === 'enviar') toast('Prévia enviada no WhatsApp 🔒');
      else toast('Contagem da prévia reiniciada ⏳');
    } catch (e: any) { toast(e.message); }
    setBusy('');
  }
  async function apresentacao() {
    setBusy('ap');
    try { await api(`/api/leads/${l.id}`, 'POST', { action: 'apresentacao' }); toast('Imagem de apresentação enviada ✨'); } catch (e: any) { toast(e.message); }
    setBusy('');
  }
  async function abrirSimp() {
    if (simp) return;
    try { const r = await api('/api/simpatias', 'GET'); setSimp((r.simpatias || []).filter((x: any) => x.ativo)); } catch (e: any) { toast(e.message); }
  }
  async function mandarSimp() {
    if (!cod) return toast('Escolha uma simpatia');
    setBusy('sp');
    try { await api('/api/simpatias', 'POST', { action: 'enviar', lead_id: l.id, codigo: cod }); toast('Simpatia enviada 💜'); setCod(''); } catch (e: any) { toast(e.message); }
    setBusy('');
  }
  return (
    <div className="sect">
      <h3>Atalhos da consulta</h3>
      <small className="muted" style={{ display: 'block', marginBottom: 6 }}>Pirâmides para o cliente ver (1 a 3, sem senha){!temMapa ? ': gere o mapa primeiro (nome completo + data)' : ''}</small>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {PIRS.map(([id, nome]) => {
          const on = so.includes(id);
          return <button key={id} type="button" className={'btn btn-sm ' + (on ? 'btn-p' : 'btn-g')} disabled={!temMapa || (!on && so.length >= 3)} onClick={() => setSo(on ? so.filter((x) => x !== id) : [...so, id])} title={enviadas.includes(id) ? 'Já enviada nesta conversa' : ''}>{nome}{enviadas.includes(id) ? ' ✓' : ''}</button>;
        })}
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
        <button className="btn btn-p btn-sm" disabled={!temMapa || !!busy} onClick={() => pir(true)}>{busy === 'pir' ? <span className="spin" /> : <Icon name="send" />}Enviar</button>
        <button className="btn btn-g btn-sm" disabled={!temMapa || !!busy} onClick={() => pir(false)}><Icon name="copy" />Copiar link</button>
        <button className="btn btn-g btn-sm" disabled={!temMapa || !!busy} onClick={() => pir(false, true)}><Icon name="eye" />Ver</button>
      </div>
      <small className="muted" style={{ display: 'block', margin: '10px 0 6px' }}>Prévia do mapa com bloqueios (abre só o que a IA já comentou, com contador de 30 min)</small>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <button className="btn btn-p btn-sm" disabled={!temMapa || !!busy} onClick={() => previa('enviar')}>{busy === 'pv' ? <span className="spin" /> : <Icon name="send" />}Enviar prévia</button>
        <button className="btn btn-g btn-sm" disabled={!temMapa || !!busy} onClick={() => previa('link')}><Icon name="copy" />Copiar link</button>
        <button className="btn btn-g btn-sm" disabled={!temMapa || !!busy} onClick={() => previa('ver')}><Icon name="eye" />Ver</button>
        <button className="btn btn-g btn-sm" disabled={!temMapa || !!busy} onClick={() => previa('renovar')} title="Reinicia a contagem de 30 minutos">Renovar tempo</button>
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
        <button className="btn btn-g btn-sm" disabled={!!busy} onClick={apresentacao}>{busy === 'ap' ? <span className="spin" /> : <Icon name="star" />}Imagem de apresentação{l.memory?.apresentacao_em ? ' ✓' : ''}</button>
        <a className="btn btn-g btn-sm" href={`/api/mapas/apresentacao?idioma=${l.idioma === 'es' ? 'es' : 'pt'}`} target="_blank" rel="noreferrer"><Icon name="eye" />Ver imagem</a>
        <AudioPronto l={l} />
      </div>
      <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
        <select className="input" style={{ height: 32, fontSize: 12.5, flex: 1, minWidth: 0 }} value={cod} onFocus={abrirSimp} onMouseDown={abrirSimp} onChange={(e) => setCod(e.target.value)}>
          <option value="">💜 Simpatia ou oração…</option>
          {(simp || []).map((x: any) => <option key={x.id} value={x.codigo}>S{x.codigo} · {x.titulo}{(l.memory?.simpatias_enviadas || []).includes(x.codigo) ? ' ✓' : ''}</option>)}
        </select>
        <button className="btn btn-g btn-sm" disabled={!cod || !!busy} onClick={mandarSimp}>{busy === 'sp' ? <span className="spin" /> : <Icon name="send" />}</button>
      </div>
    </div>
  );
}

function Side({ l, msgs, numbers, onOpen, onRefresh, refreshing }: { l: any; msgs: any[]; numbers: Record<string, string>; onOpen: () => void; onRefresh: () => void; refreshing: boolean }) {
  const t = tempOf(l.temperature || 0);
  const nxt = STEPS.find((s) => !(l.steps || []).includes(s[0]));
  const kb = useMemo(() => {
    const m = new Map<string, any>();
    msgs.forEach((x) => (x.meta?.kb || []).forEach((k: any) => m.set(String(k.id), k)));
    return Array.from(m.values()).slice(-6).reverse();
  }, [msgs]);
  const prob = l.stage === 'pago' ? 100 : l.close_probability || 0;
  return (
    <>
      <TeamBox l={l} />
      <Cortesia l={l} />
      <Atalhos l={l} />
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <Gauge v={l.temperature || 0} label={`Temperatura · ${t[0]}`} color={`var(--${t[1]})`} />
        {((l.temperature || 0) > 70 || prob > 70) && (
          <span className="hot-fire" role="img" aria-label="Perto de fechar" title="Perto de fechar a compra">
            🔥
          </span>
        )}
        <Gauge v={prob} label="Chance de compra" color={prob >= 60 ? 'var(--ok)' : prob >= 30 ? 'var(--warn)' : 'var(--muted)'} />
      </div>
      <div className="sect">
        <h3 style={{ display: 'flex', alignItems: 'center' }}>
          Resumo da IA
          <button className="linkbtn" style={{ marginLeft: 'auto', fontSize: 12, textTransform: 'none', letterSpacing: 0 }} onClick={onRefresh} disabled={refreshing}>
            {refreshing ? 'Atualizando…' : 'Atualizar'}
          </button>
        </h3>
        <div className="aisum" style={{ whiteSpace: 'pre-line' }}>{l.summary || 'Ainda sem resumo.'}</div>
      </div>
      <Intencao l={l} />
      <Ficha l={l} msgs={msgs} />
      {l.next_step && (
        <div className="next">
          <Ib name="target" tone="acc" size="sm" />
          <div style={{ fontSize: 13 }}>
            <b>Próximo passo</b>
            <br />
            {l.next_step}
          </div>
        </div>
      )}
      <div className="sect">
        <h3>Etapa</h3>
        <div className="chips">
          <span className="chip" style={{ ['--t' as any]: 'var(--accent)' }}>
            {stageOf(l.stage)[1]}
          </span>
          {l.deal_price && <span className="chip" style={{ ['--t' as any]: 'var(--gg)' }}>{brl(l.deal_price)}</span>}
          <ChipTag id={l.number_id} numbers={numbers} />
          <span className="chip" style={{ ['--t' as any]: l.idioma === 'es' ? '#d97706' : 'var(--muted)', cursor: 'pointer' }} title="Clique para trocar o idioma do atendimento (português/espanhol)"
            onClick={async () => { const novo = l.idioma === 'es' ? 'pt' : 'es'; if (!confirm(`Atender esta pessoa em ${novo === 'es' ? 'ESPANHOL' : 'PORTUGUÊS'} daqui em diante?`)) return; try { await api(`/api/leads/${l.id}`, 'POST', { action: 'idioma', idioma: novo }); toast('Idioma alterado'); } catch (e: any) { toast(e.message); } }}>
            {l.idioma === 'es' ? '🇪🇸 Español' : '🇧🇷 Português'}{l.pais && l.pais !== 'BR' ? ` · ${l.pais}` : ''}
          </span>
        </div>
        {nxt && (
          <p style={{ fontSize: 12.5, marginTop: 8 }}>
            <span className="muted">Falta:</span> {nxt[1]}
          </p>
        )}
      </div>
      {((l.pains || []).length > 0 || (l.objections || []).length > 0) && (
        <div className="sect">
          <h3>Dores e objeções</h3>
          <div className="chips">
            {(l.pains || []).slice(-5).map((p: string) => (
              <span key={'p' + p} className="chip" style={{ ['--t' as any]: 'var(--accent)' }}>
                {p}
              </span>
            ))}
            {(l.objections || []).slice(-4).map((p: string) => (
              <span key={'o' + p} className="chip" style={{ ['--t' as any]: 'var(--warn)' }}>
                {p}
              </span>
            ))}
          </div>
        </div>
      )}
      <div className="sect">
        <h3>Técnicas aplicadas nesta conversa</h3>
        {kb.length === 0 ? (
          <p className="muted" style={{ fontSize: 12.5 }}>Nenhuma ainda. Aparecem aqui quando a IA usa algo da base de conhecimento.</p>
        ) : (
          <div className="grid" style={{ gap: 6 }}>
            {kb.map((k) => (
              <div key={k.id} style={{ fontSize: 12.5, display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                <Icon name="book" className="status-ok" />
                <span>
                  <b>{k.title}</b>
                  <span className="muted">
                    {' '}
                    · {KINDS[k.kind] || k.kind}
                    {k.doc ? ` · ${k.doc}` : ''}
                  </span>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
      <button className="btn" onClick={onOpen}>
        <Icon name="eye" />
        Ver ficha completa
      </button>
    </>
  );
}

/** quantas mensagens aparecem ao abrir (as mais recentes); o resto com "Ver mensagens anteriores" */
const MSG_WINDOW = 80;

const FILTERS: [string, string][] = [
  ['todas', 'Todas'],
  ['alerta', 'Precisa de você'],
  ['quentes', 'Quentes'],
  ['ia', 'IA atendendo'],
  ['equipe', 'Equipe atendendo'],
  ['pausadas', 'IA pausada'],
  ['salvos', 'Contatos salvos'],
  ['arquivadas', 'Arquivadas'],
];

function Conversas() {
  const params = useSearchParams();
  const [list, setList] = useState<any[]>([]);
  const [numbers, setNumbers] = useState<Record<string, string>>({});
  const [numFilter, setNumFilter] = useState('');
  const [filter, setFilter] = useState('todas');
  const [lastMsg, setLastMsg] = useState<Record<string, any>>({});
  const [cur, setCur] = useState<string | null>(params.get('lead'));
  // link "Abrir conversa" (pop-up de aprovação, busca) com a tela já aberta
  useEffect(() => {
    const l = params.get('lead');
    if (l) setCur(l);
  }, [params]);
  const [lead, setLead] = useState<any>(null);
  // painel lateral: só um (ao lado do chat em tela larga, embaixo em tela estreita) — antes renderizava os dois
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1240px)');
    const f = () => setNarrow(mq.matches);
    f();
    mq.addEventListener('change', f);
    return () => mq.removeEventListener('change', f);
  }, []);
  // conversas já abertas ficam guardadas: reabrir é instantâneo (atualiza por trás)
  const chatCache = useRef(new Map<string, { lead: any; msgs: any[]; ev: any; at: number }>());
  const curRef = useRef<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [listMax, setListMax] = useState(120);
  const [askDel, setAskDel] = useState(false);
  const [msgs, setMsgs] = useState<any[]>([]);
  const [q, setQ] = useState('');
  const [text, setText] = useState('');
  // respostas rápidas: digite /atalho na caixa (Configurações › Respostas rápidas)
  const [quick, setQuick] = useState<{ k: string; t: string }[]>([]);
  // horários (para avisar a equipe quando a IA está fora do horário de atendimento)
  const [hoursSt, setHoursSt] = useState<any>(null);
  const [, hTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => hTick((x) => x + 1), 60_000);
    return () => clearInterval(t);
  }, []);
  const [qSel, setQSel] = useState(0);
  useEffect(() => {
    api('/api/settings', 'GET')
      .then((s: any) => (setQuick(Array.isArray(s?.quick_replies) ? s.quick_replies.filter((x: any) => x?.k && x?.t) : []), setHoursSt(s)))
      .catch(() => {});
  }, []);
  const qMatch = /^\/([\wçãáéíóú-]*)$/i.test(text.trim()) ? quick.filter((x) => norm(x.k).startsWith(norm(text.trim().slice(1)))) : [];
  function applyQuick(x: { k: string; t: string }) {
    const first = String(lead?.memory?.nome_cliente || '').trim().split(/\s+/)[0];
    setText(x.t.replace(/\{nome\}/g, first || '').replace(/,\s*!/g, '!').replace(/\s{2,}/g, ' '));
    setQSel(0);
    requestAnimationFrame(() => {
      const t = taRef.current;
      if (!t) return;
      t.focus();
      t.style.height = 'auto';
      t.style.height = Math.min(t.scrollHeight, 160) + 'px';
    });
  }
  const [replyTo, setReplyTo] = useState<any>(null);
  const [outbox, setOutbox] = useState<any[]>([]);
  const [pics, setPics] = useState<{ file: File; url: string }[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [drawer, setDrawer] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [newChat, setNewChat] = useState(false);
  const [replyErr, setReplyErr] = useState<any>(null);
  const eligible = useRef<{ key: string; at: number }>({ key: '', at: 0 });
  const [replying, setReplying] = useState(false);
  const [askLock, setAskLock] = useState(false);
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 5000);
    return () => clearInterval(t);
  }, []);
  const box = useRef<HTMLDivElement>(null);

  async function loadList() {
    const cols = 'id,name,temperature,close_probability,stage,whatsapp,number_id,last_inbound_at,last_outbound_at,needs_human,ai_enabled,niche,city,wa_key,source';
    // (a foto vem da rota /api/avatars, guardada no servidor)
    const ql = (c: string) => sb().from('leads').select(c).or('last_inbound_at.not.is.null,last_outbound_at.not.is.null').order('updated_at', { ascending: false }).limit(500);
    const [first, { data: nums }] = await Promise.all([
      // ai_locked só existe depois da migração 012; sem ela a lista continua funcionando
      ql(cols + ',idioma,pais,ai_locked,team_unread,archived_at,saved_contact,campaign').then((r: any) =>
        r.error ? ql(cols + ',ai_locked,team_unread,archived_at,saved_contact,campaign') : r,
      ).then((r: any) =>
        r.error ? ql(cols + ',ai_locked,team_unread,archived_at,saved_contact') : r,
      ).then((r: any) =>
        r.error ? ql(cols + ',ai_locked,team_unread').then((r1: any) => (r1.error ? ql(cols + ',ai_locked').then((r2: any) => (r2.error ? ql(cols) : r2)) : r1)) : r,
      ),
      sb().from('whatsapp_numbers').select('*').order('created_at'),
    ]);
    CHIP_C = Object.fromEntries((nums || []).map((n: any, i: number) => [n.id, chipColor(n, i)]));
    setNumbers(Object.fromEntries((nums || []).map((n: any) => [n.id, chipName(n)])));
    const data: any[] = (first as any).data || [];
    const rows = data.sort((a: any, b: any) => {
      const ta = Math.max(new Date(a.last_inbound_at || 0).getTime(), new Date(a.last_outbound_at || 0).getTime());
      const tb = Math.max(new Date(b.last_inbound_at || 0).getTime(), new Date(b.last_outbound_at || 0).getTime());
      return tb - ta;
    });
    setList(rows);
    if (!cur && rows[0]) setCur(rows[0].id);
    const ids = rows.slice(0, 120).map((r: any) => r.id);
    if (ids.length) {
      const { data: m } = await sb().from('messages').select('lead_id,body,kind,created_at,direction,author').in('lead_id', ids).order('created_at', { ascending: false }).limit(1500);
      const map: Record<string, any> = {};
      (m || []).forEach((x: any) => {
        if (!map[x.lead_id]) map[x.lead_id] = x;
      });
      setLastMsg(map);
    }
  }
  // tempo real sem recarregar tudo: cada mudança atualiza só a conversa que mudou (bem mais rápido com muitas conversas)
  useEffect(() => {
    loadList();
    const tsOf = (x: any) => Math.max(new Date(x.last_inbound_at || 0).getTime(), new Date(x.last_outbound_at || 0).getTime());
    // junta as mudanças que chegam em sequência e aplica de uma vez (a cada ~250 ms): a tela não engasga
    const pendLeads = new Map<string, any>();
    let pendLast: Record<string, any> = {};
    let timer: any = null;
    const flushSoon = () => {
      if (timer) return;
      timer = setTimeout(() => {
        timer = null;
        if (pendLeads.size) {
          const upd = new Map(pendLeads);
          pendLeads.clear();
          setList((l) => {
            const seen = new Set<string>();
            const next = l.map((x) => {
              const n = upd.get(x.id);
              if (!n) return x;
              seen.add(x.id);
              return { ...x, ...n };
            });
            upd.forEach((n, id) => !seen.has(id) && next.unshift(n));
            return next.sort((a, b) => tsOf(b) - tsOf(a));
          });
        }
        if (Object.keys(pendLast).length) {
          const add = pendLast;
          pendLast = {};
          setLastMsg((o) => ({ ...o, ...add }));
        }
      }, 250);
    };
    const ch = sb()
      .channel('conv-list-' + Math.random().toString(36).slice(2))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, (p: any) => {
        if (p.eventType === 'DELETE') return setList((l) => l.filter((x) => x.id !== p.old?.id));
        const n = p.new;
        if (!n?.id) return;
        if (n.id === curRef.current) {
          setLead((o: any) => (o?.id === n.id ? { ...o, ...n } : o));
          chatCache.current.delete(n.id);
        } else chatCache.current.delete(n.id);
        if (!n.last_inbound_at && !n.last_outbound_at) return;
        pendLeads.set(n.id, n);
        flushSoon();
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (p: any) => {
        const m = p.new;
        if (!m?.lead_id) return;
        pendLast[m.lead_id] = m;
        flushSoon();
        if (m.lead_id === curRef.current) {
          const id = m.lead_id;
          setMsgs((old) => (old.some((x) => x.id === m.id) ? old : [...old, m]));
          if (m.meta?.cid) setOutbox((o) => o.filter((x) => x.cid !== m.meta.cid));
          // conversa aberta na tela: a mensagem já foi vista
          if (m.direction === 'in' && document.visibilityState === 'visible' && seenFor.current !== id) setTimeout(() => curRef.current === id && seenFor.current !== id && markSeen(id), 1200);
        } else chatCache.current.delete(m.lead_id);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'whatsapp_numbers' }, () => loadList())
      .subscribe();
    // conferência de segurança a cada 2 minutos (se alguma mudança se perder na conexão)
    const t = setInterval(loadList, 120_000);
    const vis = () => document.visibilityState === 'visible' && loadList();
    document.addEventListener('visibilitychange', vis);
    return () => {
      if (timer) clearTimeout(timer);
      sb().removeChannel(ch);
      clearInterval(t);
      document.removeEventListener('visibilitychange', vis);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchChat(id: string, all = false) {
    const [{ data: l }, { data: m }, { data: ev }] = await Promise.all([
      sb().from('leads').select('*').eq('id', id).maybeSingle(),
      // só as mais recentes (abre rápido); "ver anteriores" busca o resto
      sb().from('messages').select('*').eq('lead_id', id).order('created_at', { ascending: false }).limit(all ? 2000 : 150),
      sb().from('lead_events').select('type,text,created_at').eq('lead_id', id).in('type', ['reply_error', 'reply_skip']).order('created_at', { ascending: false }).limit(1),
    ]);
    const data = { lead: l, msgs: (m || []).slice().reverse(), ev: ev?.[0] || null, at: Date.now(), all };
    chatCache.current.set(id, data);
    if (chatCache.current.size > 40) chatCache.current.delete(chatCache.current.keys().next().value as string);
    return data;
  }
  /** passar o mouse na conversa já busca (abre sem esperar) */
  function prefetch(id: string) {
    const c = chatCache.current.get(id);
    if (c && Date.now() - c.at < 20_000) return;
    fetchChat(id).catch(() => {});
  }
  async function loadChat(id: string, all = false) {
    const cached = chatCache.current.get(id);
    if (cached && !all) {
      // mostra na hora o que já tem; a busca abaixo só atualiza
      setLead(cached.lead);
      setMsgs(cached.msgs);
      setReplyErr(cached.ev);
    } else if (!all) {
      const row = list.find((x) => x.id === id);
      if (row) setLead((old: any) => (old?.id === id ? old : { ...row }));
      setMsgs([]);
    }
    const { lead: l, msgs: m, ev } = await fetchChat(id, all);
    if (curRef.current !== id) return; // trocou de conversa no meio: ignora
    setLead(l);
    setMsgs(m);
    setReplyErr(ev);
    // só dá como lida quando a pessoa rola a conversa (ou se ela é curta e cabe na tela)
    seenFor.current = l?.team_unread ? id : null;
    autoScrollAt.current = Date.now();
    setTimeout(() => {
      const b = box.current;
      if (seenFor.current === id && b && b.scrollHeight <= b.clientHeight + 4) markSeen(id);
    }, 1800);
  }
  const seenFor = useRef<string | null>(null);
  const autoScrollAt = useRef(0);
  function onUserScroll() {
    if (!cur || seenFor.current !== cur) return;
    if (Date.now() - autoScrollAt.current < 700) return; // rolagem automática ao abrir não conta
    seenFor.current = null;
    markSeen(cur);
  }
  /** a equipe abriu a conversa: zera a bolinha vermelha */
  async function markSeen(id: string, l?: any) {
    if (l && !l.team_unread) return;
    await sb().from('leads').update({ team_unread: 0 }).eq('id', id).then(() => {}, () => {});
    setList((old) => old.map((x) => (x.id === id ? { ...x, team_unread: 0 } : x)));
  }
  // a caixa da conversa ocupa exatamente o que sobra da tela: a barra de enviar fica sempre visível embaixo
  const wrapRef = useRef<HTMLDivElement>(null);
  // largura da lista de conversas (arrastando o divisor); fica salva neste navegador
  const clistRef = useRef<HTMLDivElement>(null);
  const [listW, setListW] = useState(0);
  // topo compacto (arrastando o divisor de cima para cima): títulos, chips e botões diminuem e a conversa ganha altura
  const [cmp, setCmp] = useState(0);
  const [cmpDrag, setCmpDrag] = useState(false);
  useEffect(() => {
    try {
      const v = Number(localStorage.getItem('conv-compact'));
      if (v > 0 && v <= 1) setCmp(v);
    } catch {}
  }, []);
  function saveCmp(v: number) {
    const r = Math.round(v * 100) / 100;
    setCmp(r);
    try {
      localStorage.setItem('conv-compact', String(r));
    } catch {}
  }
  const [dragging, setDragging] = useState(false);
  useEffect(() => {
    try {
      const v = Number(localStorage.getItem('conv-list-w'));
      if (v >= 220) setListW(v);
    } catch {}
  }, []);
  useEffect(() => {
    const fit = () => {
      const el = wrapRef.current;
      if (!el) return;
      if (window.innerWidth <= 760) {
        el.style.height = '';
        return;
      }
      const top = el.getBoundingClientRect().top + window.scrollY;
      el.style.height = Math.max(420, window.innerHeight - top - 12) + 'px';
    };
    fit();
    window.addEventListener('resize', fit);
    // o painel rápido abre/fecha e muda o espaço de cima
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(fit) : null;
    const above = wrapRef.current?.parentElement;
    if (ro && above) Array.from(above.children).forEach((c) => c !== wrapRef.current && ro.observe(c));
    const t = setTimeout(fit, 400);
    return () => {
      window.removeEventListener('resize', fit);
      ro?.disconnect();
      clearTimeout(t);
    };
  }, []);
  const [som, setSom] = useState(true);
  useEffect(() => setSom(soundOn()), []);
  async function replyNow() {
    setReplying(true);
    try {
      await api(`/api/leads/${cur}`, 'POST', { action: 'reply_now' });
      setReplyErr(null);
      toast('A IA respondeu');
    } catch (e: any) {
      setReplyErr({ text: e.message, created_at: new Date().toISOString() });
    }
    setReplying(false);
  }
  const [asAudio, setAsAudio] = useState(false);
  const [audioBusy, setAudioBusy] = useState(false);
  async function replyAudio() {
    setAudioBusy(true);
    try {
      await api(`/api/leads/${cur}`, 'POST', { action: 'reply_audio' });
      toast('A IA respondeu em áudio 🔊');
    } catch (e: any) {
      toast(e.message);
    }
    setAudioBusy(false);
  }
  async function sayAudio() {
    if (!text.trim()) return;
    setAudioBusy(true);
    try {
      await api(`/api/leads/${cur}`, 'POST', { action: 'say_audio', text });
      setText('');
      setAsAudio(false);
      if (taRef.current) taRef.current.style.height = 'auto';
      toast('Áudio enviado com a voz do número 🔊');
    } catch (e: any) {
      toast(e.message);
    }
    setAudioBusy(false);
  }
  useEffect(() => {
    setReplyTo(null);
    setPics((p) => (p.forEach((x) => URL.revokeObjectURL(x.url)), []));
    curRef.current = cur;
    setShowAll(false);
    if (!cur) return;
    loadChat(cur);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cur]);
  useEffect(() => {
    if (box.current) {
      autoScrollAt.current = Date.now();
      box.current.scrollTop = box.current.scrollHeight;
    }
  }, [msgs]);

  /** Envio na hora: o balão aparece já ("enviando…") e some o texto da caixa; se der erro, dá para tentar de novo. */
  async function deliver(item: any) {
    try {
      if (item.kind === 'image') {
        const fd = new FormData();
        fd.append('leadId', item.leadId);
        fd.append('file', item.file);
        if (item.body) fd.append('caption', item.body);
        if (item.replyTo) fd.append('replyTo', item.replyTo);
        fd.append('clientId', item.cid);
        const r = await fetch('/api/messages/image', { method: 'POST', body: fd });
        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(j.error || 'Não foi possível enviar a imagem');
      } else await api('/api/messages/send', 'POST', { leadId: item.leadId, text: item.body, replyTo: item.replyTo, clientId: item.cid });
      // se o tempo real atrasar, recarrega a conversa para o balão "enviando" virar o definitivo
      setTimeout(() => setOutbox((o) => (o.some((x) => x.cid === item.cid) ? (cur === item.leadId && loadChat(item.leadId), o.filter((x) => x.cid !== item.cid)) : o)), 6000);
    } catch (err: any) {
      setOutbox((o) => o.map((x) => (x.cid === item.cid ? { ...x, status: 'erro', error: err.message } : x)));
      toast(err.message);
    }
  }
  function send(e?: React.FormEvent) {
    e?.preventDefault();
    if (!cur || (!text.trim() && !pics.length)) return;
    const base = { leadId: cur, replyTo: replyTo?.id || null, quoted: replyTo ? { body: replyTo.kind === 'image' && !replyTo.body ? '📷 Imagem' : replyTo.body, dir: replyTo.direction } : null, at: new Date().toISOString(), status: 'enviando' };
    const items: any[] = [];
    if (pics.length) {
      // a legenda vai na primeira foto
      pics.forEach((p, i) => items.push({ ...base, cid: 'c' + Date.now().toString(36) + i, kind: 'image', file: p.file, preview: p.url, body: i === 0 ? text.trim() : '', replyTo: i === 0 ? base.replyTo : null, quoted: i === 0 ? base.quoted : null }));
    } else items.push({ ...base, cid: 'c' + Date.now().toString(36), kind: 'text', body: text.trim() });
    setOutbox((o) => [...o, ...items]);
    setText('');
    setPics([]);
    setReplyTo(null);
    requestAnimationFrame(() => {
      if (taRef.current) taRef.current.style.height = '';
      if (box.current) box.current.scrollTop = box.current.scrollHeight;
    });
    // fotos uma de cada vez (na ordem); texto direto
    (async () => {
      for (const it of items) await deliver(it);
    })();
  }
  function retry(it: any) {
    setOutbox((o) => o.map((x) => (x.cid === it.cid ? { ...x, status: 'enviando', error: null } : x)));
    deliver(it);
  }
  async function addPics(list: FileList | File[] | null) {
    const files = Array.from(list || []).filter((f) => /^image\//.test(f.type));
    if (!files.length) return;
    const room = 10 - pics.length;
    const ready = await Promise.all(files.slice(0, room).map(shrinkForWa));
    setPics((p) => [...p, ...ready.map((f) => ({ file: f, url: URL.createObjectURL(f) }))]);
    taRef.current?.focus();
  }
  function jumpTo(id?: string | null) {
    if (!id) return;
    const el = document.getElementById('m-' + id);
    if (!el) return;
    el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    el.classList.add('flash');
    setTimeout(() => el.classList.remove('flash'), 1400);
  }
  async function toggleAi() {
    try {
      const r = await api(`/api/leads/${cur}`, 'POST', { action: 'ai', on: !lead.ai_enabled });
      setLead(r);
      toast(r.ai_enabled ? 'Conversa devolvida para a IA' : 'Você assumiu. A IA pausou só para este contato');
    } catch (e: any) {
      toast(e.message);
    }
  }
  async function archive(on: boolean) {
    try {
      const r = await api(`/api/leads/${cur}`, 'POST', { action: 'archive', on });
      setLead(r);
      setList((l) => l.map((x) => (x.id === r.id ? { ...x, archived_at: r.archived_at } : x)));
      toast(on ? 'Conversa arquivada (volta sozinha se o cliente escrever)' : 'Conversa desarquivada');
    } catch (e: any) {
      toast(e.message);
    }
  }
  async function removeConv() {
    try {
      const r = await api(`/api/leads/${cur}`, 'POST', { action: 'limpar' });
      setAskDel(false);
      setList((l) => l.map((x) => (x.id === cur ? { ...x, ...r } : x)));
      setLead(r);
      toast('Conversa limpa: o próximo contato começa do zero');
      window.location.reload();
    } catch (e: any) {
      toast(e.message);
    }
  }
  async function setLock(on: boolean) {
    try {
      const r = await api(`/api/leads/${cur}`, 'POST', { action: 'lock', on });
      setLead(r);
      setAskLock(false);
      toast(on ? 'IA pausada definitivamente nesta conversa. Ela só volta se você reativar.' : 'IA reativada nesta conversa');
      loadList();
    } catch (e: any) {
      toast(e.message);
    }
  }
  async function refreshSummary() {
    setRefreshing(true);
    try {
      setLead(await api(`/api/leads/${cur}`, 'POST', { action: 'summary' }));
      toast('Resumo atualizado');
    } catch (e: any) {
      toast(e.message);
    }
    setRefreshing(false);
  }

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    list.forEach((x) => (c[x.number_id || 'sem'] = (c[x.number_id || 'sem'] || 0) + 1));
    return c;
  }, [list]);
  // por número: mensagens não lidas e conversas esperando a equipe (aprovação / ação manual)
  const chipStats = useMemo(() => {
    const u: Record<string, number> = {};
    const a: Record<string, number> = {};
    for (const x of list) {
      if (x.archived_at) continue;
      const k = x.number_id || 'sem';
      // conta conversas não lidas (não mensagens)
      if (Number(x.team_unread) > 0) u[k] = (u[k] || 0) + 1;
      if (x.needs_human) a[k] = (a[k] || 0) + 1;
    }
    const total = Object.values(u).reduce((t, v) => t + v, 0);
    return { u, a, total };
  }, [list]);
  const archivedCount = useMemo(() => list.filter((x) => x.archived_at && (!numFilter || x.number_id === numFilter)).length, [list, numFilter]);
  // número que acabou de receber mensagem: a aba pulsa por alguns segundos
  const prevUnread = useRef<Record<string, number>>({});
  const [pulse, setPulse] = useState<Record<string, number>>({});
  useEffect(() => {
    const now = Date.now();
    const hit: Record<string, number> = {};
    for (const [k, v] of Object.entries(chipStats.u) as [string, number][]) if (v > (prevUnread.current[k] || 0) && Object.keys(prevUnread.current).length) hit[k] = now;
    prevUnread.current = { ...chipStats.u };
    if (Object.keys(hit).length) {
      setPulse((p) => ({ ...p, ...hit }));
      setTimeout(() => setPulse((p) => Object.fromEntries(Object.entries(p).filter(([, t]) => Date.now() - t < 7000))), 7500);
    }
  }, [chipStats]);
  const shown = useMemo(
    () =>
      list.filter((c) => {
    if (q && !norm(c.name + ' ' + (c.whatsapp || '')).includes(norm(q))) return false;
    if (numFilter && c.number_id !== numFilter) return false;
    // arquivadas só aparecem no filtro delas
    if (filter === 'arquivadas') return !!c.archived_at;
    if (c.archived_at) return false;
    if (filter === 'salvos') return !!c.saved_contact;
    if (filter === 'alerta') return !!c.needs_human;
    if (filter === 'quentes') return (c.temperature || 0) >= 65 && !['pago', 'sem'].includes(c.stage);
    if (filter === 'ia') return c.ai_enabled;
    if (filter === 'equipe') return !c.ai_enabled && !c.ai_locked;
    if (filter === 'pausadas') return !!c.ai_locked;
    return true;
  }),
    [list, q, numFilter, filter],
  );

  // balões só são redesenhados quando as mensagens mudam (digitar na caixa não redesenha a conversa inteira)
  const shownMsgs = useMemo(() => (showAll ? msgs : msgs.slice(-MSG_WINDOW)), [msgs, showAll]);
  const msgView = useMemo(
    () =>
      shownMsgs.map((m, i) => {
        const sep = i === 0 || !sameDay(shownMsgs[i - 1].created_at, m.created_at) ? <div className="daysep" key={'d-' + m.id}><span>{dayLabel(m.created_at)}</span></div> : null;
        const el = renderBub(m);
        return sep ? [sep, el] : el;
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [shownMsgs, numbers],
  );
  function renderBub(m: any) {
    {
                  const replyBtn = (
                    <button type="button" className="bub-reply" onClick={() => (setReplyTo(m), taRef.current?.focus())} title="Responder esta mensagem" aria-label="Responder esta mensagem">
                      ↩
                    </button>
                  );
                  const quote = m.meta?.quoted ? <Quote q={m.meta.quoted} onJump={() => jumpTo(m.meta.quoted.id)} /> : null;
                  const media = ['image', 'video', 'document', 'sticker'].includes(m.kind) || (m.kind === 'audio' && (m.meta?.url || m.direction === 'in')) ? <MsgMedia m={m} /> : null;
                  const img = m.kind === 'audio' ? null : media;
                  const bodyText = ['image', 'video', 'sticker'].includes(m.kind) && /^(📷 Imagem|\[imagem\]|\[vídeo\]|\[figurinha\]|\[mídia\])$/.test(m.body || '') ? null : m.kind === 'document' ? null : m.body;
                  return m.direction === 'in' ? (
                    <div className="bub in" key={m.id} id={'m-' + m.id}>
                      {replyBtn}
                      {quote}
                      {m.kind === 'audio' ? (
                        <>
                          {media || (
                            <div className="audio">
                              <Icon name="mic" />
                              <Wave />
                            </div>
                          )}
                          <div className="transc">
                            <b>
                              <Icon name="robot" />
                              Transcrição automática
                            </b>
                            {m.transcript || 'Não foi possível transcrever este áudio.'}
                          </div>
                        </>
                      ) : (
                        <>
                          {img}
                          {bodyText}
                        </>
                      )}
                      <span className="when">{hourLabel(m.created_at)}</span>
                    </div>
                  ) : m.author === 'system' && m.body && m.body.length > 120 ? (
                    <div className="bub out" key={m.id} id={'m-' + m.id} style={{ wordBreak: 'break-all', fontFamily: 'var(--f-mono)', fontSize: 11.5 }}>
                      {m.body}
                      <span className="when">{hourLabel(m.created_at)}</span>
                    </div>
                  ) : (
                    <div className={`bub out ${m.author === 'human' ? 'human' : ''}`} key={m.id} id={'m-' + m.id}>
                      {replyBtn}
                      <span className="who" style={{ color: m.author === 'human' ? 'var(--accent)' : 'var(--ai)' }}>
                        <Icon name={m.author === 'human' ? 'user' : m.author === 'system' ? 'pix' : 'robot'} />
                        {m.author === 'human' ? (m.meta?.by ? `Equipe · ${m.meta.by}` : 'Equipe') : m.author === 'system' ? 'Sistema' : 'IA'}
                        {numbers[m.number_id] && <span style={{ fontWeight: 600, color: CHIP_C[m.number_id] || 'var(--muted)' }}> · {numbers[m.number_id]}</span>}
                      </span>
                      {quote}
                      {img}
                      {m.kind === 'audio' && media}
                      {bodyText}
                      {(m.meta?.kb || []).length > 0 && (
                        <span style={{ display: 'flex', gap: 4, marginTop: 4, fontSize: 11, color: 'var(--muted)' }} title={(m.meta.kb || []).map((k: any) => k.title + (k.doc ? ` (${k.doc})` : '')).join('\n')}>
                          <Icon name="book" />
                          {m.meta.kb.map((k: any) => k.title).join(' · ')}
                        </span>
                      )}
                      <span className="when">
                        {hourLabel(m.created_at)}
                        {m.author !== 'system' && <Feedback m={m} />}
                      </span>
                    </div>
                  );
    }
  }

  // fotos de perfil do WhatsApp (cópia guardada no servidor; busca só as que faltam)
  const [photos, setPhotos] = useState<Record<string, string>>({});
  const askedPhotos = useRef(new Set<string>());
  useEffect(() => {
    const ids = shown
      .slice(0, Math.min(listMax, 60))
      .filter((c) => !askedPhotos.current.has(c.id))
      .map((c) => c.id);
    if (!ids.length) return;
    ids.forEach((id) => askedPhotos.current.add(id));
    const t = setTimeout(() => {
      api('/api/avatars', 'POST', { ids: ids.slice(0, 40) })
        .then((r: any) => r && Object.keys(r).length && setPhotos((o) => ({ ...o, ...r })))
        .catch(() => {});
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shown, listMax]);

  // menu do botão direito (e do ⋯) em cada conversa
  const [menu, setMenu] = useState<{ x: number; y: number; c: any } | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  useEffect(() => setProfileOpen(false), [cur]);
  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && close();
    window.addEventListener('click', close);
    window.addEventListener('scroll', close, true);
    window.addEventListener('keydown', esc);
    return () => {
      window.removeEventListener('click', close);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('keydown', esc);
    };
  }, [menu]);
  async function quickAct(c: any, action: string, extra: any = {}, ok = '') {
    setMenu(null);
    try {
      const r = await api(`/api/leads/${c.id}`, 'POST', { action, ...extra });
      if (action === 'delete') {
        setList((l) => l.filter((x) => x.id !== c.id));
        if (cur === c.id) {
          setCur(null);
          setLead(null);
        }
      } else if (r && r.id) {
        setList((l) => l.map((x) => (x.id === c.id ? { ...x, ...r } : x)));
        if (cur === c.id) setLead(r);
      }
      chatCache.current.delete(c.id);
      if (ok) toast(ok);
    } catch (e: any) {
      toast(e.message);
    }
  }
  async function setUnread(c: any, unread: boolean) {
    setMenu(null);
    await sb().from('leads').update({ team_unread: unread ? 1 : 0 }).eq('id', c.id).then(() => {}, () => {});
    setList((l) => l.map((x) => (x.id === c.id ? { ...x, team_unread: unread ? 1 : 0 } : x)));
  }
  const openMenu = (e: React.MouseEvent, c: any) => {
    e.preventDefault();
    e.stopPropagation();
    const W = 230;
    const H = 330;
    setMenu({ x: Math.min(e.clientX, window.innerWidth - W - 8), y: Math.min(e.clientY, window.innerHeight - H - 8), c });
  };

  const listView = useMemo(
    () =>
      shown.slice(0, listMax).map((c) => {
        const t = tempOf(c.temperature || 0);
        const lm = lastMsg[c.id];
        const approval = c.needs_human && String(c.needs_human).startsWith('APROVAÇÃO: ');
        const showProb = c.close_probability > 0 && !['pago', 'sem'].includes(c.stage);
        const photo = photos[c.id];
        return (
          <div
            key={c.id}
            role="button"
            tabIndex={0}
            className={`citem2 ${c.needs_human ? 'attn' : ''} ${c.team_unread > 0 ? 'unread' : ''}`}
            aria-current={c.id === cur}
            onClick={() => setCur(c.id)}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), setCur(c.id))}
            onContextMenu={(e) => openMenu(e, c)}
            onMouseEnter={() => c.id !== cur && prefetch(c.id)}
            onFocus={() => c.id !== cur && prefetch(c.id)}
            title={c.needs_human ? 'Precisa de você: ' + String(c.needs_human).replace(/^APROVAÇÃO: /, '') : undefined}
            style={c.number_id && CHIP_C[c.number_id] ? { ['--chip' as any]: CHIP_C[c.number_id] } : undefined}
          >
            <span className="cav">
              {photo ? <img src={photo} alt="" loading="lazy" onError={() => setPhotos((o) => ({ ...o, [c.id]: '' }))} /> : <span>{initials(c.name)}</span>}
              <i className="ctemp" style={{ background: `var(--${t[1]})` }} title={`${t[0]} · ${c.temperature || 0}°`} />
              <span className="cflag"><FlagIdioma idioma={c.idioma || (paisDoLeadRow(c) === 'BR' || !paisDoLeadRow(c) ? 'pt' : 'es')} size={19} /></span>
            </span>
            <span className="cbody">
              <span className="crow1">
                <b className="cname">
                  {c.ai_locked && <span className="cico" title="IA pausada definitivamente">⏸</span>}
                  {c.needs_human && !approval && <Icon name="bell" className="status-bad" />}
                  {c.name}
                </b>
                <time className={c.team_unread > 0 ? 'new' : ''}>{lm ? timeLabel(lm.created_at) : ''}</time>
              </span>
              <span className="crow2">
                <span className="cprev">{lm ? (lm.direction === 'out' ? (lm.author === 'human' ? 'Equipe: ' : lm.author === 'system' ? 'Sistema: ' : 'IA: ') : '') + (lm.body || '') : '—'}</span>
                {c.team_unread > 0 && <span className="cunread">{c.team_unread > 99 ? '99+' : c.team_unread}</span>}
              </span>
              <span className="crow3">
                {approval && <span className="ctag warn">⚠ aprovação</span>}
                <ChipTag id={c.number_id} numbers={numbers} />
                <span className="ctag">{stageOf(c.stage)[1]}</span>
                {(c.source === 'anuncio' || c.source === 'google') && (
                  <span className={`ctag src-${c.source}`} title={c.campaign ? `Campanha: ${c.campaign}` : undefined}>
                    {c.source === 'anuncio' ? 'Anúncio' : 'Prospecção'}
                  </span>
                )}
                {showProb && (
                  <span className="cprob" style={{ color: scoreColor(c.close_probability) }} title="Chance de compra">
                    {c.close_probability}%
                  </span>
                )}
              </span>
            </span>
            <span className="cacts" onClick={(e) => e.stopPropagation()}>
              <button type="button" title={c.archived_at ? 'Desarquivar' : 'Arquivar'} aria-label={c.archived_at ? 'Desarquivar' : 'Arquivar'} onClick={() => quickAct(c, 'archive', { on: !c.archived_at }, c.archived_at ? 'Conversa desarquivada' : 'Conversa arquivada')}>
                <Icon name="archive" />
              </button>
              <button type="button" title="Mais opções" aria-label="Mais opções" onClick={(e) => openMenu(e, c)}>
                ⋯
              </button>
            </span>
          </div>
        );
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [shown, lastMsg, cur, numbers, listMax, photos],
  );

  const menuView = menu ? (
    <div className="cmenu" role="menu" style={{ left: menu.x, top: menu.y }} onClick={(e) => e.stopPropagation()} onContextMenu={(e) => e.preventDefault()}>
      <b className="cmenu-h">{menu.c.name}</b>
      <button role="menuitem" onClick={() => (setMenu(null), setCur(menu.c.id))}>
        <Icon name="chat" /> Abrir conversa
      </button>
      {menu.c.team_unread > 0 ? (
        <button role="menuitem" onClick={() => setUnread(menu.c, false)}>
          <Icon name="check" /> Marcar como lida
        </button>
      ) : (
        <button role="menuitem" onClick={() => setUnread(menu.c, true)}>
          <Icon name="bell" /> Marcar como não lida
        </button>
      )}
      <button role="menuitem" onClick={() => quickAct(menu.c, 'ai', { on: !menu.c.ai_enabled }, menu.c.ai_enabled ? 'IA pausada nesta conversa' : 'IA ativada nesta conversa')} disabled={menu.c.ai_locked}>
        <Icon name="robot" /> {menu.c.ai_enabled ? 'Desativar IA' : 'Ativar IA'}
      </button>
      <button role="menuitem" onClick={() => quickAct(menu.c, 'lock', { on: !menu.c.ai_locked }, menu.c.ai_locked ? 'IA reativada' : 'IA pausada definitivamente')}>
        <Icon name="pause" /> {menu.c.ai_locked ? 'Reativar IA (tirar pausa)' : 'Pausar IA definitivamente'}
      </button>
      <button role="menuitem" onClick={() => quickAct(menu.c, 'archive', { on: !menu.c.archived_at }, menu.c.archived_at ? 'Conversa desarquivada' : 'Conversa arquivada')}>
        <Icon name="archive" /> {menu.c.archived_at ? 'Desarquivar' : 'Arquivar'}
      </button>
      <hr />
      <button role="menuitem" onClick={() => (setMenu(null), navigator.clipboard?.writeText(String(menu.c.whatsapp || '')).then(() => toast('Número copiado')))}>
        <Icon name="copy" /> Copiar número
      </button>
      <a role="menuitem" href={`https://wa.me/${String(menu.c.whatsapp || '').replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" onClick={() => setMenu(null)}>
        <Icon name="wa" /> Abrir no WhatsApp
      </a>
      <hr />
      <button
        role="menuitem"
        className="danger"
        onClick={() => {
          const c = menu.c;
          setMenu(null);
          if (window.confirm(`Limpar a conversa com ${c.name} e começar do zero? O histórico e a memória da IA somem do painel (no WhatsApp continuam) e a próxima mensagem dele começa um atendimento novo.`)) quickAct(c, 'limpar', {}, 'Conversa limpa: o próximo contato começa do zero');
        }}
      >
        <Icon name="trash" /> Excluir conversa
      </button>
    </div>
  ) : null;

  return (
    <>
      <div className={`conv-top ${cmp > 0.45 ? 'tight' : ''}`} style={cmp ? ({ zoom: 1 - 0.26 * cmp } as any) : undefined}>
      <PageHead title="Conversas" sub="Todas as conversas de cada número conectado, com o histórico completo" icon="chat" tone="wa" help="conversas">
        <button className="btn btn-sm btn-g" onClick={() => (setSound(!som), setSom(!som), !som && ding())} title="Som quando chega mensagem de cliente" aria-pressed={som}>
          {som ? '🔔 Som ligado' : '🔕 Som desligado'}
        </button>
        <button data-perm="conversas.responder" className="btn btn-wa btn-sm" onClick={() => setNewChat(true)}>
          <Icon name="plus" />
          Nova conversa
        </button>
        <QuickControl />
      </PageHead>
      {newChat && (
        <NewChat
          numbers={numbers}
          onClose={() => setNewChat(false)}
          onDone={(id) => {
            setNewChat(false);
            setCur(id);
            loadList();
          }}
        />
      )}
      {Object.keys(numbers).length > 0 && (
        <div className="ntabs" role="group" aria-label="Filtrar por número">
          <button className="ntab ntab-all" aria-pressed={!numFilter} onClick={() => setNumFilter('')} title={`${list.filter((x) => !x.archived_at).length} conversa(s) · ${chipStats.total} não lida(s)`}>
            <span className="ntab-l">Todos os números</span>
            <span className={`ntab-n ${chipStats.total ? 'has' : ''}`} aria-label={`${chipStats.total} conversa(s) não lida(s)`}>
              <Icon name="chat" />
              {chipStats.total > 99 ? '99+' : chipStats.total}
            </span>
          </button>
          {Object.entries(numbers).map(([id, label]) => {
            const u = chipStats.u[id] || 0;
            return (
              <button
                key={id}
                aria-pressed={numFilter === id}
                onClick={() => setNumFilter(numFilter === id ? '' : id)}
                className={`ntab ${pulse[id] ? 'chip-pulse' : ''}`}
                style={{ ['--c' as any]: CHIP_C[id] || 'var(--accent)' }}
                title={`${counts[id] || 0} conversa(s)${u ? ` · ${u} não lida(s)` : ''}${chipStats.a[id] ? ` · ${chipStats.a[id]} esperando a equipe` : ''}`}
              >
                <i className="ntab-dot" aria-hidden="true" />
                <span className="ntab-l">{label}</span>
                {chipStats.a[id] > 0 && (
                  <span className="ntab-warn" aria-label={`${chipStats.a[id]} esperando a equipe`}>
                    ⚠ {chipStats.a[id]}
                  </span>
                )}
                <span className={`ntab-n ${u ? 'has' : ''}`} aria-label={`${u} conversa(s) não lida(s)`}>
                  <Icon name="chat" />
                  {u > 99 ? '99+' : u}
                </span>
              </button>
            );
          })}
        </div>
      )}
      </div>
      <div
        className={`vresize ${cmpDrag ? 'on' : ''}`}
        role="separator"
        aria-orientation="horizontal"
        aria-label="Arraste para cima para compactar o topo e ganhar espaço"
        title="Arraste para cima: o topo fica menor e a conversa ganha espaço · duplo clique volta ao normal"
        onDoubleClick={() => saveCmp(0)}
        onPointerDown={(e) => {
          e.preventDefault();
          const startY = e.clientY;
          const start = cmp;
          let v = start;
          setCmpDrag(true);
          document.body.classList.add('resizing-v');
          const move = (ev: PointerEvent) => {
            // só sobe (compacta); a altura atual é o mínimo — não desce além do normal
            v = Math.max(0, Math.min(1, start + (startY - ev.clientY) / 110));
            setCmp(v);
          };
          const up = () => {
            window.removeEventListener('pointermove', move);
            window.removeEventListener('pointerup', up);
            document.body.classList.remove('resizing-v');
            setCmpDrag(false);
            saveCmp(v);
          };
          window.addEventListener('pointermove', move);
          window.addEventListener('pointerup', up);
        }}
      >
        <i />
      </div>
      <div className="chatwrap" ref={wrapRef} style={listW ? ({ ['--clw' as any]: listW + 'px' } as any) : undefined}>
        <div className="clist" ref={clistRef}>
          <span
            className={`cresize ${dragging ? 'on' : ''}`}
            role="separator"
            aria-orientation="vertical"
            aria-label="Arrastar para mudar a largura da lista de conversas"
            title="Arraste para mudar a largura · duplo clique volta ao padrão"
            onDoubleClick={() => {
              setListW(0);
              try {
                localStorage.removeItem('conv-list-w');
              } catch {}
            }}
            onPointerDown={(e) => {
              e.preventDefault();
              const startX = e.clientX;
              const startW = clistRef.current?.offsetWidth || 320;
              let w = startW;
              setDragging(true);
              document.body.classList.add('resizing');
              const move = (ev: PointerEvent) => {
                w = Math.max(220, Math.min(Math.round(window.innerWidth * 0.55), startW + ev.clientX - startX));
                wrapRef.current?.style.setProperty('--clw', w + 'px');
              };
              const up = () => {
                window.removeEventListener('pointermove', move);
                window.removeEventListener('pointerup', up);
                document.body.classList.remove('resizing');
                setDragging(false);
                setListW(w);
                try {
                  localStorage.setItem('conv-list-w', String(w));
                } catch {}
              };
              window.addEventListener('pointermove', move);
              window.addEventListener('pointerup', up);
            }}
          />
          <div className="sh" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <input className="input" placeholder="Buscar nome ou número" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar contato" />
            <div className="chips">
              {FILTERS.map(([k, l]) => (
                <button
                  key={k}
                  className="chip"
                  onClick={() => setFilter(k)}
                  style={{ cursor: 'pointer', ['--t' as any]: filter === k ? 'var(--accent)' : 'var(--muted)', background: filter === k ? undefined : 'transparent' }}
                >
                  {l}
                  {k === 'arquivadas' && archivedCount > 0 && <span className="fcount">{archivedCount}</span>}
                </button>
              ))}
            </div>
          </div>
          <div className="items">
            {shown.length === 0 && <p className="muted" style={{ padding: 14 }}>Nenhuma conversa com esse filtro.</p>}
            {listView}
            {shown.length > listMax && (
              <button type="button" className="btn btn-sm" style={{ margin: 10 }} onClick={() => setListMax((n) => n + 150)}>
                Mostrar mais {Math.min(150, shown.length - listMax)} conversas
              </button>
            )}
          </div>
        </div>
        <div
          className={`cmain ${dragOver ? 'drag' : ''}`}
          onDragOver={(e) => {
            if (lead && Array.from(e.dataTransfer.types).includes('Files')) {
              e.preventDefault();
              setDragOver(true);
            }
          }}
          onDragLeave={(e) => e.currentTarget === e.target && setDragOver(false)}
          onDrop={(e) => {
            if (!lead) return;
            e.preventDefault();
            setDragOver(false);
            addPics(e.dataTransfer.files);
          }}
        >
          {lead ? (
            <>
              <div className="chead">
                <div className="chead-who">
                <button type="button" className="cav chead-av" onClick={() => setProfileOpen(true)} title="Ver perfil do contato" aria-label="Ver perfil do contato">
                  {photos[lead.id] || lead.photo_url ? <img src={photos[lead.id] || lead.photo_url} alt="" /> : <span>{initials(lead.name)}</span>}
                </button>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <b style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }} onClick={() => setProfileOpen(true)}>
                    {lead.name}
                    <FlagIdioma idioma={lead.idioma || (paisDoLeadRow(lead) === 'BR' || !paisDoLeadRow(lead) ? 'pt' : 'es')} size={18} />
                    {paisDoLeadRow(lead) && <Flag iso={paisDoLeadRow(lead)} size={18} title={`País: ${nomePais(paisDoLeadRow(lead))}`} />}
                  </b>
                  <small style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                    {formatPhone(lead.whatsapp)}
                    {lead.number_id && numbers[lead.number_id] && (
                      <>
                        <span>· falando com</span>
                        <ChipTag id={lead.number_id} numbers={numbers} />
                      </>
                    )}
                  </small>
                  {(() => {
                    // o mesmo cliente também conversa com outro número da empresa: conversas separadas, com atalho
                    const others = list.filter((x) => x.id !== lead.id && ((lead.wa_key && x.wa_key === lead.wa_key) || x.id === lead.related_lead_id));
                    if (!others.length) return null;
                    return (
                      <small style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', marginTop: 2 }}>
                        <span className="muted">Também conversa com</span>
                        {others.map((o) => (
                          <button key={o.id} className="linkbtn" style={{ padding: 0 }} onClick={() => setCur(o.id)} title="Abrir a outra conversa deste cliente">
                            <ChipTag id={o.number_id} numbers={numbers} />
                          </button>
                        ))}
                      </small>
                    );
                  })()}
                </div>
                </div>
                <div className="chead-acts">
                {lead.source === 'anuncio' && (
                  <span className="chip chip-ad" title={lead.campaign ? `Veio do anúncio: ${lead.campaign}` : 'Veio de um anúncio'}>
                    <Icon name="ig" />
                    Anúncio{lead.campaign ? ` · ${lead.campaign.length > 34 ? lead.campaign.slice(0, 32) + '…' : lead.campaign}` : ''}
                  </span>
                )}
                {lead.source === 'google' && (
                  <span className="chip chip-pros" title="Encontrado na Prospecção (Google)">
                    <Icon name="pin" />
                    Prospecção
                  </span>
                )}
                {lead.ai_locked ? (
                  <span className="chip" style={{ ['--t' as any]: 'var(--bad, #c0392b)' }} title={lead.ai_locked_by ? `Pausada por ${lead.ai_locked_by}` : undefined}>
                    ⏸ IA pausada definitivamente
                  </span>
                ) : lead.ai_enabled ? (
                  <span className="chip" style={{ ['--t' as any]: 'var(--ai)' }}>
                    <Icon name="robot" />
                    IA atendendo
                  </span>
                ) : (
                  <span className="chip" style={{ ['--t' as any]: 'var(--accent)' }}>
                    <Icon name="user" />
                    Equipe atendendo
                  </span>
                )}
                {lead.ai_locked ? (
                  <button data-perm="conversas.responder" className="btn btn-sm btn-p" onClick={() => setLock(false)}>
                    ▶ Reativar IA
                  </button>
                ) : (
                  <>
                    <button data-perm="conversas.responder" className="btn btn-sm" onClick={toggleAi} title={lead.ai_enabled ? 'A IA para de responder este contato (você assume)' : 'A IA volta a responder este contato'}>
                      {lead.ai_enabled ? '⏹ Desativar IA' : '▶ Ativar IA'}
                    </button>
                    {askLock ? (
                      <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                        <small className="muted">A IA não volta sozinha. Confirmar?</small>
                        <button data-perm="conversas.responder" className="btn btn-sm btn-p" onClick={() => setLock(true)}>
                          Pausar
                        </button>
                        <button className="btn btn-sm btn-g" onClick={() => setAskLock(false)}>
                          Cancelar
                        </button>
                      </span>
                    ) : (
                      <button data-perm="conversas.responder" className="btn btn-sm btn-g" onClick={() => setAskLock(true)} title="A IA para de vez nesta conversa e só volta quando alguém reativar">
                        ⏸ Pausar definitivamente
                      </button>
                    )}
                  </>
                )}
                {lead.saved_contact && (
                  <span className="chip" style={{ ['--t' as any]: 'var(--muted)' }} title="Este número está salvo nos contatos do celular deste chip. Por padrão a IA não atende; use Ativar IA para ela atender.">
                    📇 Contato salvo
                  </span>
                )}
                <button data-perm="conversas.responder" className="btn btn-sm btn-g" onClick={() => archive(!lead.archived_at)} title={lead.archived_at ? 'Volta para a lista' : 'Some da lista; volta sozinha se o cliente escrever'}>
                  {lead.archived_at ? '↩ Desarquivar' : '🗄 Arquivar'}
                </button>
                {askDel ? (
                  <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                    <small style={{ color: 'var(--bad)' }}>Limpar o histórico e a memória e começar do zero com este contato?</small>
                    <button data-perm="leads.excluir" className="btn btn-sm" style={{ color: 'var(--bad)', borderColor: 'var(--bad)' }} onClick={removeConv}>
                      Limpar e recomeçar
                    </button>
                    <button className="btn btn-sm btn-g" onClick={() => setAskDel(false)}>
                      Cancelar
                    </button>
                  </span>
                ) : (
                  <button data-perm="leads.excluir" className="iconbtn" aria-label="Excluir conversa" title="Excluir conversa" onClick={() => setAskDel(true)}>
                    <Icon name="trash" />
                  </button>
                )}
                </div>
              </div>
              {hoursSt && !inService(hoursSt) && !lead.ai_locked && lead.ai_enabled && (
                <div className="offhours-note">
                  <span>🌙</span>
                  <span>
                    <b>Fora do horário de atendimento da IA</b> ({serviceLabel(hoursSt)}). Quem escreve agora recebe o aviso automático e a IA responde no horário comercial, a partir das{' '}
                    {spNow(nextCommercialStart(hoursSt)).hhmm}. <Link href="/config#horarios">Ver horários</Link>
                  </span>
                </div>
              )}
              {lead.ai_locked && (
                <div className="note" style={{ margin: '8px 12px', padding: '8px 12px', borderRadius: 10, background: 'color-mix(in srgb, var(--muted) 12%, transparent)', fontSize: 13 }}>
                  A IA está pausada definitivamente nesta conversa{lead.ai_locked_by ? ` (por ${lead.ai_locked_by})` : ''}.
                  {hoursSt && !inService(hoursSt) ? ` Além disso, agora está fora do horário de atendimento da IA (${serviceLabel(hoursSt)}).` : ''} Ela não responde, não manda follow-up nem remarketing para este contato, mesmo que ele escreva. Só volta se alguém clicar em <b>Reativar IA</b>.
                </div>
              )}
              {(() => {
                const last = msgs[msgs.length - 1];
                if (lead.ai_locked || !lead.ai_enabled || !last || last.direction !== 'in') return null;
                const due = lead.reply_due_at ? new Date(lead.reply_due_at).getTime() - Date.now() : null;
                // só é "atraso" depois de 4 min sem resposta contando de quando a IA pôde responder
                // (mensagem nova, IA reativada ou conversa aberta agora): evita alarme falso logo após reativar
                const key = `${lead.id}:${last.id}:${lead.ai_enabled}:${lead.ai_locked}`;
                if (eligible.current.key !== key) eligible.current = { key, at: Date.now() };
                const since = Math.max(new Date(last.created_at).getTime(), eligible.current.at);
                const late = due === null ? Date.now() - since > 240000 : due < -240000 && Date.now() - eligible.current.at > 240000;
                const errAfter = replyErr && replyErr.created_at >= last.created_at;
                if (errAfter && replyErr.type === 'reply_skip')
                  return (
                    <div className="alert" style={{ borderRadius: 0, borderLeft: 0, borderRight: 0, borderTop: 0, background: 'var(--surface-2)' }}>
                      <Icon name="check" />
                      <p style={{ fontSize: 13 }}>{replyErr.text.replace(/^IA não respondeu [^:]*: /, 'A IA preferiu não responder: ')}</p>
                      <button data-perm="conversas.responder" className="btn btn-sm" onClick={replyNow} disabled={replying}>
                        {replying ? <span className="spin" /> : <Icon name="send" />}
                        Responder mesmo assim
                      </button>
                    </div>
                  );
                if (!late && !errAfter)
                  return (
                    <div className="alert" style={{ borderRadius: 0, borderLeft: 0, borderRight: 0, borderTop: 0, background: 'color-mix(in srgb, var(--ai) 8%, var(--surface))' }}>
                      <span className="spin" />
                      <p style={{ fontSize: 13 }}>{due !== null && due > 10 * 60_000 ? `A IA responde às ${new Date(lead.reply_due_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })} (horário comercial).` : due !== null && due > 0 ? `A IA responde em ~${Math.ceil(due / 1000)}s (espera para parecer humano).` : 'Na fila: a IA começa a responder em instantes (lê, mostra "digitando…" e envia).'}</p>
                    </div>
                  );
                return (
                  <div className="alert" style={{ borderRadius: 0, borderLeft: 0, borderRight: 0, borderTop: 0, background: 'color-mix(in srgb, var(--bad) 8%, var(--surface))' }}>
                    <Icon name="alert" className="status-bad" />
                    <p style={{ fontSize: 13, wordBreak: 'break-word' }}>
                      <b>A IA ainda não respondeu.</b> {errAfter ? replyErr.text : 'A resposta está demorando mais que o normal. Clique em Responder agora ou veja o Painel rápido.'}
                    </p>
                    <button data-perm="conversas.responder" className="btn btn-sm btn-p" onClick={replyNow} disabled={replying}>
                      {replying ? <span className="spin" /> : <Icon name="send" />}
                      {replying ? 'Respondendo…' : 'Responder agora'}
                    </button>
                  </div>
                );
              })()}
              {lead.needs_human && (
                String(lead.needs_human).startsWith('APROVAÇÃO: ') ? (
                  <ApprovalBar lead={lead} />
                ) : (
                <div className="alert" style={{ borderRadius: 0, borderLeft: 0, borderRight: 0, borderTop: 0, background: 'color-mix(in srgb, var(--warn) 10%, var(--surface))' }}>
                  <Icon name="bell" className="status-bad" />
                  <p>
                    <b>Precisa de você:</b> {lead.needs_human}
                  </p>
                  <button className="btn btn-sm" onClick={() => setDrawer(true)}>
                    Resolver
                  </button>
                </div>
                )
              )}
              <div className="msgs" ref={box} onScroll={onUserScroll} onWheel={() => ((autoScrollAt.current = 0), onUserScroll())} onTouchMove={() => ((autoScrollAt.current = 0), onUserScroll())}>
                {msgs.length === 0 && <div className="sysmsg">Nenhuma mensagem ainda.</div>}
                {!showAll && msgs.length > MSG_WINDOW && (
                  <button type="button" className="btn btn-sm" style={{ alignSelf: 'center' }} onClick={() => (setShowAll(true), msgs.length >= 150 && cur && loadChat(cur, true))}>
                    Ver mensagens anteriores
                  </button>
                )}
                {msgView}
                {outbox
                  .filter((o) => o.leadId === cur)
                  .map((o) => (
                    <div key={o.cid} className={`bub out human pending ${o.status === 'erro' ? 'failed' : ''}`}>
                      {o.quoted && <Quote q={o.quoted} />}
                      {o.kind === 'image' && <img className="bub-img" src={o.preview} alt="" />}
                      {o.body}
                      <span className="when">
                        {o.status === 'erro' ? (
                          <>
                            <span style={{ color: 'var(--bad)' }}>Não enviada</span>
                            <button type="button" className="linkbtn" onClick={() => retry(o)}>
                              tentar de novo
                            </button>
                            <button type="button" className="linkbtn" onClick={() => setOutbox((x) => x.filter((y) => y.cid !== o.cid))}>
                              descartar
                            </button>
                          </>
                        ) : (
                          <>
                            <span className="spin" style={{ width: 10, height: 10 }} /> enviando…
                          </>
                        )}
                      </span>
                    </div>
                  ))}
              </div>
              {(replyTo || pics.length > 0) && (
                <div className="compose-extra">
                  {replyTo && (
                    <div className="reply-bar">
                      <Quote q={{ body: replyTo.kind === 'image' && /^(📷 Imagem|\[imagem\])$/.test(replyTo.body || '') ? '📷 Imagem' : replyTo.body, dir: replyTo.direction }} onJump={() => jumpTo(replyTo.id)} />
                      <button type="button" className="iconbtn" onClick={() => setReplyTo(null)} aria-label="Cancelar resposta">
                        <Icon name="x" />
                      </button>
                    </div>
                  )}
                  {pics.length > 0 && (
                    <div className="pic-strip">
                      {pics.map((p, i) => (
                        <div key={p.url} className="pic">
                          <img src={p.url} alt="" />
                          <button type="button" onClick={() => (URL.revokeObjectURL(p.url), setPics((x) => x.filter((_, k) => k !== i)))} aria-label="Remover imagem">
                            ✕
                          </button>
                        </div>
                      ))}
                      <small className="muted">{pics.length === 1 ? 'O texto abaixo vai como legenda.' : 'O texto abaixo vai como legenda da primeira foto.'}</small>
                    </div>
                  )}
                </div>
              )}
              {qMatch.length > 0 && (
                <div className="quick-pop" role="listbox" aria-label="Respostas rápidas">
                  {qMatch.slice(0, 8).map((x, i) => (
                    <button key={x.k} type="button" role="option" aria-selected={i === qSel} className={i === Math.min(qSel, qMatch.length - 1) ? 'on' : ''} onMouseDown={(e) => (e.preventDefault(), applyQuick(x))}>
                      <b>/{x.k}</b>
                      <span>{x.t}</span>
                    </button>
                  ))}
                  <small>↑↓ escolhe · Enter usa · edite antes de enviar</small>
                </div>
              )}
              <form
                data-perm="conversas.responder"
                className="composer"
                onSubmit={(e) => {
                  if (asAudio) {
                    e.preventDefault();
                    sayAudio();
                  } else send(e);
                }}
              >
                <button type="button" className="btn btn-sm" onClick={replyAudio} disabled={audioBusy || lead.ai_locked} title="A IA lê a conversa e responde agora em áudio, com a voz da conversa">
                  {audioBusy && !text.trim() ? <span className="spin" /> : <Icon name="mic" />}
                  IA em áudio
                </button>
                <button type="button" className="iconbtn" onClick={() => fileRef.current?.click()} disabled={asAudio} title="Anexar imagem (também dá para colar com Ctrl+V ou arrastar para a conversa)" aria-label="Anexar imagem">
                  <Icon name="clip" />
                </button>
                <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => (addPics(e.target.files), (e.target.value = ''))} />
                <textarea
                  ref={taRef}
                  className="input compose-ta"
                  rows={1}
                  placeholder={asAudio ? 'Escreva o que o áudio vai dizer (sai com a voz da conversa)' : pics.length ? 'Legenda (opcional)' : lead.ai_enabled ? 'Escreva para assumir a conversa · / para respostas rápidas' : 'Digite sua mensagem · / para respostas rápidas'}
                  value={text}
                  onChange={(e) => {
                    setText(e.target.value);
                    const t = e.target;
                    t.style.height = 'auto';
                    t.style.height = Math.min(t.scrollHeight, 160) + 'px';
                  }}
                  onKeyDown={(e) => {
                    // atalho aberto: setas escolhem, Enter/Tab usa
                    if (qMatch.length) {
                      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                        e.preventDefault();
                        setQSel((n) => (n + (e.key === 'ArrowDown' ? 1 : -1) + qMatch.length) % qMatch.length);
                        return;
                      }
                      if (e.key === 'Enter' || e.key === 'Tab') {
                        e.preventDefault();
                        applyQuick(qMatch[Math.min(qSel, qMatch.length - 1)]);
                        return;
                      }
                    }
                    // Enter envia; Shift+Enter pula linha (como no WhatsApp Web)
                    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                      e.preventDefault();
                      if (asAudio) sayAudio();
                      else send();
                    } else if (e.key === 'Escape' && replyTo) setReplyTo(null);
                  }}
                  onPaste={(e) => {
                    const files = Array.from(e.clipboardData?.files || []).filter((f) => /^image\//.test(f.type));
                    if (files.length && !asAudio) {
                      e.preventDefault();
                      addPics(files);
                    }
                  }}
                  aria-label="Mensagem"
                />
                <button
                  type="button"
                  className={`iconbtn ${asAudio ? 'on' : ''}`}
                  style={asAudio ? { color: 'var(--ai)', background: 'var(--surface-2)' } : undefined}
                  disabled={audioBusy}
                  onClick={() => {
                    // com texto escrito: já envia em áudio; sem texto: liga o modo áudio (Enter passa a mandar áudio)
                    if (text.trim()) sayAudio();
                    else {
                      setAsAudio(!asAudio);
                      if (!asAudio) toast('Modo áudio ligado: escreva e aperte Enter para enviar como áudio');
                      taRef.current?.focus();
                    }
                  }}
                  aria-pressed={asAudio}
                  title={text.trim() ? 'Enviar este texto como áudio, com a voz do número' : 'Modo áudio: o que você escrever sai como áudio com a voz do número'}
                  aria-label="Enviar como áudio"
                >
                  {audioBusy && text.trim() ? <span className="spin" /> : '🔊'}
                </button>
                <button className="btn btn-wa" disabled={audioBusy || (!text.trim() && !pics.length)} aria-label={asAudio ? 'Enviar como áudio' : 'Enviar'} title={asAudio ? 'Enviar como áudio' : 'Enviar'}>
                  {audioBusy && text.trim() ? <span className="spin" /> : <Icon name="send" />}
                </button>
              </form>
            </>
          ) : (
            <div className="msgs">
              <div className="sysmsg">Escolha uma conversa à esquerda.</div>
            </div>
          )}
        </div>
        <div className="cside">{lead && !narrow && <Side l={lead} msgs={msgs} numbers={numbers} onOpen={() => setDrawer(true)} onRefresh={refreshSummary} refreshing={refreshing} />}</div>
      </div>
      {lead && narrow && (
        <div className="card cside-inline" style={{ flexDirection: 'column', gap: 14 }}>
          <Side l={lead} msgs={msgs} numbers={numbers} onOpen={() => setDrawer(true)} onRefresh={refreshSummary} refreshing={refreshing} />
        </div>
      )}
      {drawer && lead && <LeadDrawer id={lead.id} onClose={() => setDrawer(false)} />}
      {menuView}
      {profileOpen && lead && <ContactProfile lead={lead} photo={photos[lead.id] || lead.photo_url} numbers={numbers} onClose={() => setProfileOpen(false)} />}
    </>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="spin" />}>
      <Conversas />
    </Suspense>
  );
}
