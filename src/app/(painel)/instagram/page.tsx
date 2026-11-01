'use client';
import { useEffect, useState } from 'react';
import { PageHead } from '@/components/PageHead';
import { Icon, Ib } from '@/components/Icon';
import { api, toast, copyText, scoreColor, useLive } from '@/components/ui';
import { sb } from '@/lib/supabase/browser';
import { startOfTodayISO } from '@/lib/util';
import { DEFAULT_SETTINGS, deepMerge } from '@/lib/settings';

export default function Instagram() {
  const [queue, setQueue] = useState<any[]>([]);
  const [sentToday, setSentToday] = useState(0);
  const [settings, setSettings] = useState<any>(DEFAULT_SETTINGS);
  const [skipped, setSkipped] = useState<string[]>([]);
  const [msg, setMsg] = useState('');
  const [reply, setReply] = useState('');
  const [replied, setReplied] = useState<any[]>([]);

  async function load() {
    const [{ data }, { count }, { data: s }, { data: rep }] = await Promise.all([
      sb().from('leads').select('*').eq('ig_status', 'fila').eq('opted_out', false).order('score', { ascending: false }).limit(200),
      sb().from('lead_events').select('id', { count: 'exact', head: true }).eq('type', 'ig_sent').gte('created_at', startOfTodayISO()),
      sb().from('settings').select('data').eq('id', 1).maybeSingle(),
      sb().from('leads').select('id,name,instagram,ig_status').eq('ig_status', 'enviado').order('updated_at', { ascending: false }).limit(12),
    ]);
    setQueue(data || []);
    setSentToday(count || 0);
    setSettings(deepMerge(DEFAULT_SETTINGS, s?.data || {}));
    setReplied(rep || []);
  }
  useLive(['leads'], load);

  const ordered = [...queue.filter((l) => !skipped.includes(l.id)), ...queue.filter((l) => skipped.includes(l.id))];
  const cur = ordered[0];

  useEffect(() => {
    const t = settings.ig_templates || [];
    setMsg(t.length ? t[Math.floor(Math.random() * t.length)] : '');
    setReply('');
  }, [cur?.id, settings]);

  async function act(id: string, action: string, extra: any = {}) {
    try {
      await api('/api/ig', 'POST', { id, action, ...extra });
      toast(action === 'sent' ? 'Direct marcado como enviado' : action === 'replied' ? 'Lead puxado para a venda' : 'Perfil removido');
      load();
    } catch (e: any) {
      toast(e.message);
    }
  }

  const limit = settings.ig_daily_limit || 60;
  const handle = cur?.instagram?.replace('@', '');

  return (
    <>
      <PageHead title="Instagram assistido" sub="O sistema prepara tudo, você envia o direct com 1 clique" icon="ig" tone="ig" help="instagram" />
      <div className="grid g-2">
        <div className="card">
          {cur ? (
            <>
              <div className="card-h">
                <Ib name="ig" tone="ig" size="sm" />
                <h2>Próximo da fila</h2>
                <span className="sp chip" style={{ ['--t' as any]: 'var(--ig)' }}>
                  {queue.length} na fila
                </span>
              </div>
              <div className="igcard">
                <div className="ring" style={{ ['--v' as any]: cur.score, ['--c' as any]: scoreColor(cur.score) }}>
                  <b>{cur.score}</b>
                </div>
                <div style={{ minWidth: 0 }}>
                  <h2>{cur.instagram}</h2>
                  <p className="muted">
                    {cur.name} · {[cur.niche, cur.city].filter(Boolean).join(' · ')}
                  </p>
                  <textarea className="input igmsg" style={{ width: '100%', minHeight: 70 }} value={msg} onChange={(e) => setMsg(e.target.value)} aria-label="Mensagem do direct" />
                  <div className="row-actions">
                    <button className="btn btn-p" onClick={() => copyText(msg)}>
                      <Icon name="copy" />
                      1. Copiar mensagem
                    </button>
                    <a className="btn" href={`https://instagram.com/${handle}`} target="_blank" rel="noreferrer">
                      <Icon name="ext" />
                      2. Abrir perfil
                    </a>
                    <button className="btn" onClick={() => act(cur.id, 'sent')} disabled={sentToday >= limit}>
                      <Icon name="check" />
                      3. Marquei como enviado
                    </button>
                    <button className="btn btn-g" onClick={() => setSkipped([...skipped, cur.id])}>
                      Pular
                    </button>
                    <button className="btn btn-g" onClick={() => act(cur.id, 'wrong')}>
                      Perfil errado
                    </button>
                  </div>
                  <p className="muted" style={{ fontSize: 12.5, marginTop: 10 }}>
                    Responda um story recente com a mensagem. Quando a pessoa responder, use o quadro "Responderam?" ao lado.
                  </p>
                </div>
              </div>
            </>
          ) : (
            <div className="empty">
              <Ib name="check" tone="ok" size="lg" />
              <div>
                <h2>Fila vazia</h2>
                <p>Faça uma busca em Prospecção e envie os leads para a fila.</p>
              </div>
            </div>
          )}
        </div>
        <div className="grid" style={{ alignContent: 'start' }}>
          <div className="card">
            <div className="card-h">
              <Ib name="target" tone="ig" size="sm" />
              <h2>Meta de hoje</h2>
            </div>
            <div className="kpi">
              <div className="v num">
                {sentToday} <span className="muted" style={{ fontSize: 16 }}>/ {limit}</span>
              </div>
              <div className="progress">
                <i style={{ width: `${Math.min(100, (sentToday / limit) * 100)}%` }} />
              </div>
              <p className="muted" style={{ fontSize: 12.5 }}>
                {sentToday >= limit ? 'Limite de hoje atingido. Continue amanhã para proteger a conta.' : 'Envie em blocos de 15 com uma pausa de 20 minutos entre eles.'}
              </p>
            </div>
          </div>
          <div className="card">
            <div className="card-h">
              <Ib name="chat" tone="ai" size="sm" />
              <h2>Responderam?</h2>
            </div>
            {replied.length === 0 ? (
              <p className="muted">Os perfis que você já chamou aparecem aqui. Marque quem respondeu.</p>
            ) : (
              <div className="grid" style={{ gap: 8 }}>
                <input className="input" placeholder="Cole a resposta (opcional)" value={reply} onChange={(e) => setReply(e.target.value)} aria-label="Resposta recebida" />
                {replied.map((r) => (
                  <div key={r.id} style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13 }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <b>{r.instagram}</b>
                      <br />
                      <small className="muted">{r.name}</small>
                    </div>
                    <button className="btn btn-sm" onClick={() => act(r.id, 'replied', { reply })}>
                      Respondeu
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
