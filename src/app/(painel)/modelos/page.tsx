'use client';
import { useEffect, useState } from 'react';
import { SitesTabs } from '@/components/SitesTabs';
import { PageHead } from '@/components/PageHead';
import { Icon, Ib } from '@/components/Icon';
import { Switch, toast, api, useLive, copyText } from '@/components/ui';
import { sb } from '@/lib/supabase/browser';

const EMPTY = { niche: '', name: '', example_url: '', accent: '#e8562a', style: 'moderno', hero_image: '', gallery: '', notes: '', active: true };
const STYLES = ['moderno', 'elegante', 'clean', 'acolhedor', 'premium', 'divertido'];

function Form({ initial, onDone }: { initial: any; onDone: () => void }) {
  const [f, setF] = useState<any>({ ...EMPTY, ...initial, gallery: (initial?.gallery || []).join('\n') });
  const [busy, setBusy] = useState(false);
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value });

  async function save() {
    if (!f.niche.trim() || !f.name.trim()) return toast('Preencha o nicho e o nome do modelo.');
    setBusy(true);
    const row = {
      niche: f.niche.trim(),
      name: f.name.trim(),
      example_url: f.example_url.trim() || null,
      accent: f.accent,
      style: f.style,
      hero_image: f.hero_image.trim() || null,
      gallery: String(f.gallery).split('\n').map((x: string) => x.trim()).filter(Boolean).slice(0, 6),
      notes: f.notes.trim() || null,
      active: !!f.active,
    };
    const q = initial?.id ? sb().from('site_templates').update(row).eq('id', initial.id) : sb().from('site_templates').insert(row);
    const { error } = await q;
    setBusy(false);
    if (error) return toast(error.message);
    toast('Modelo salvo');
    onDone();
  }

  return (
    <div>
      <div className="formgrid">
        <div className="field">
          <label>Nicho</label>
          <input className="input" value={f.niche} onChange={set('niche')} placeholder="Ex.: fisioterapia (ou geral)" />
        </div>
        <div className="field">
          <label>Nome do modelo</label>
          <input className="input" value={f.name} onChange={set('name')} placeholder="Ex.: Clínica Moderna" />
        </div>
        <div className="field" style={{ gridColumn: 'span 2' }}>
          <label>Link do site de exemplo (a IA manda na conversa)</label>
          <input className="input" value={f.example_url} onChange={set('example_url')} placeholder="https://exemplo-fisio.vercel.app" />
        </div>
      </div>
      <div className="formgrid" style={{ marginTop: 12 }}>
        <div className="field">
          <label>Cor principal da prévia</label>
          <input className="input" type="color" value={f.accent} onChange={set('accent')} style={{ height: 40, padding: 4 }} />
        </div>
        <div className="field">
          <label>Estilo dos textos</label>
          <select className="input" value={f.style} onChange={set('style')}>
            {STYLES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
        <div className="field" style={{ gridColumn: 'span 2' }}>
          <label>Imagem de capa (link de uma foto do nicho)</label>
          <input className="input" value={f.hero_image} onChange={set('hero_image')} placeholder="https://… .jpg (pode ser do seu site de exemplo ou de um banco de imagens grátis)" />
        </div>
      </div>
      <div className="formgrid" style={{ marginTop: 12 }}>
        <div className="field">
          <label>Galeria (até 6 links de fotos, um por linha)</label>
          <textarea className="input" value={f.gallery} onChange={set('gallery')} />
        </div>
        <div className="field">
          <label>Observações para a IA (opcional)</label>
          <textarea className="input" value={f.notes} onChange={set('notes')} placeholder="Ex.: destacar agendamento online e atendimento domiciliar" />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 14 }}>
        <button className="btn btn-p" disabled={busy} onClick={save}>
          <Icon name="check" />
          {busy ? 'Salvando…' : 'Salvar modelo'}
        </button>
        <button className="btn btn-g" onClick={onDone}>
          Cancelar
        </button>
        <span className="sp" style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13 }}>
          Ativo <Switch label="Modelo ativo" checked={!!f.active} onChange={(v) => setF({ ...f, active: v })} />
        </span>
      </div>
    </div>
  );
}

export default function Modelos() {
  const [list, setList] = useState<any[]>([]);
  const [q, setQ] = useState('');
  const nq = (t: string) => String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const [previews, setPreviews] = useState<any[]>([]);
  async function setVisible(p: any, visible: boolean) {
    setPreviews((l) => l.map((x) => (x.slug === p.slug ? { ...x, visible } : x)));
    try {
      await api('/api/visibilidade', 'POST', { kind: 'previa', id: p.slug, visible });
      toast(visible ? 'Prévia visível para o cliente' : 'Prévia oculta: o cliente vê "Página indisponível"');
    } catch (e: any) {
      setPreviews((l) => l.map((x) => (x.slug === p.slug ? { ...x, visible: !visible } : x)));
      toast(e.message);
    }
  }
  const [prem, setPrem] = useState<any[]>([]);
  const [pick, setPick] = useState<Record<string, string>>({});
  const [busyP, setBusyP] = useState('');
  const [unlink, setUnlink] = useState<string | null>(null);
  useEffect(() => {
    api('/api/premium', 'GET')
      .then((r) => setPrem((r.templates || []).filter((t: any) => t.build_ok && t.active !== false)))
      .catch(() => {});
  }, []);
  /** refaz a prévia do cliente com um modelo premium (o link continua o mesmo) */
  async function redo(p: any, send = false) {
    setBusyP(p.slug);
    try {
      const r = await api('/api/previews', 'POST', { lead_id: p.lead_id, template: pick[p.slug] || p.leads?.premium_template || null, send });
      toast(send ? 'Prévia refeita e enviada no WhatsApp' : 'Prévia refeita com o modelo premium. O link é o mesmo');
      window.open(r.url, '_blank');
      load();
    } catch (e: any) {
      toast(e.message);
    }
    setBusyP('');
  }
  async function doUnlink(slug: string) {
    try {
      await api('/api/previews', 'DELETE', { slug });
      setUnlink(null);
      toast('Prévia desvinculada. A próxima sai nova, com o modelo premium');
      load();
    } catch (e: any) {
      toast(e.message);
    }
  }
  const [edit, setEdit] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [msg, setMsg] = useState('');
  const [explain, setExplain] = useState('');

  const load = async () => {
    const [t, p] = await Promise.all([
      sb().from('site_templates').select('*').order('niche'),
      sb().from('previews').select('slug,views,sent_at,created_at,created_by,lead_id,visible,kind:content->>kind,tpl:content->>template_name,leads(name,niche,stage,premium_template)').order('created_at', { ascending: false }).limit(60),
    ]);
    setList(t.data || []);
    setPreviews(p.data || []);
  };
  useEffect(() => {
    load();
    api('/api/settings', 'GET').then((s) => {
      setSettings(s);
      setMsg(s.previews?.message || '');
      setExplain(s.previews?.explain || '');
    });
  }, []);
  useLive(['previews', 'site_templates'], load);

  const base = settings ? String(settings.checkout?.base_url || '').trim() : '';
  const origin = base ? (base.startsWith('http') ? base : 'https://' + base).replace(/\/$/, '') : typeof window !== 'undefined' ? window.location.origin : '';

  async function savePrev(patch: any) {
    try {
      const s = await api('/api/settings', 'PATCH', { previews: patch });
      setSettings(s);
      toast('Salvo');
    } catch (e: any) {
      toast(e.message);
    }
  }
  async function remove(t: any) {
    if (!window.confirm(`Apagar o modelo "${t.name}"?`)) return;
    const { error } = await sb().from('site_templates').delete().eq('id', t.id);
    if (error) toast(error.message);
    else load();
  }

  return (
    <>
      <PageHead title="Sites" sub="Exemplos por nicho que a IA mostra na conversa e a prévia automática para lead quente" icon="globe" help="previas">
        <button data-perm="modelos.editar" className="btn btn-p btn-sm" onClick={() => setEdit({})}>
          <Icon name="plus" />
          Novo modelo
        </button>
      </PageHead>
      <SitesTabs />

      {settings && (
        <div data-perm="modelos.editar" className="card">
          <div className="card-h">
            <Ib name="spark" tone="ai" size="sm" />
            <h2>Como a IA usa</h2>
          </div>
          <div style={{ display: 'grid', gap: 10, fontSize: 13.5 }}>
            <label style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <Switch label="Mandar exemplos" checked={!!settings.previews?.send_examples} onChange={(v) => savePrev({ send_examples: v })} />
              Mandar o link de um site de exemplo do nicho quando o cliente mostrar interesse
            </label>
            <label style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <Switch label="Prévia automática" checked={!!settings.previews?.auto} onChange={(v) => savePrev({ auto: v })} />
              Criar e enviar a prévia personalizada quando o lead ficar quente (temperatura ≥ {settings.temp?.hot || 65})
            </label>
            <div className="field">
              <label>Mensagem que acompanha a prévia ({'{url}'} vira o link)</label>
              <textarea className="input" value={msg} onChange={(e) => setMsg(e.target.value)} onBlur={() => msg !== settings.previews?.message && savePrev({ message: msg })} />
            </div>
            <div className="field">
              <label>Explicação enviada logo depois do link (deixe vazio para não mandar)</label>
              <textarea className="input" value={explain} onChange={(e) => setExplain(e.target.value)} onBlur={() => explain !== (settings.previews?.explain || '') && savePrev({ explain })} />
            </div>
            <p className="muted" style={{ fontSize: 12.5 }}>
              Cada prévia custa menos de 1 centavo de dólar (a IA escreve só os textos). Ela fica em {origin}/previa/… e usa os dados da ficha do Google.
            </p>
          </div>
        </div>
      )}

      {edit && (
        <div className="card">
          <div className="card-h">
            <Ib name="globe" tone="acc" size="sm" />
            <h2>{edit.id ? `Editar ${edit.name}` : 'Novo modelo'}</h2>
          </div>
          <Form
            initial={edit}
            onDone={() => {
              setEdit(null);
              load();
            }}
          />
        </div>
      )}

      {list.length === 0 && !edit && (
        <div className="card">
          <p className="muted">Nenhum modelo ainda. Cadastre um por nicho (ou um "geral") com o link de um site que vocês já fizeram.</p>
        </div>
      )}

      {list.length > 0 && (
        <div className="tpl-search">
          <div className="tpl-search-in">
            <Icon name="search" />
            <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nicho ou nome do modelo" aria-label="Buscar modelos" />
            {q && (
              <button type="button" className="iconbtn" onClick={() => setQ('')} aria-label="Limpar busca">
                <Icon name="x" />
              </button>
            )}
          </div>
        </div>
      )}
      <div className="tpl-grid">
        {list.filter((t) => !q.trim() || nq(q).split(/\s+/).filter(Boolean).every((w) => nq([t.name, t.niche, t.style, t.headline].filter(Boolean).join(' ')).includes(w))).map((t) => (
          <div className="card tpl-card" key={t.id} style={{ opacity: t.active ? 1 : 0.6 }}>
            <div className="swatch" style={{ background: t.hero_image ? `linear-gradient(0deg, rgba(0,0,0,.45), rgba(0,0,0,.05)), url("${t.hero_image}") center/cover` : t.accent }}>
              {t.name}
            </div>
            <div className="chips" style={{ marginBottom: 8 }}>
              <span className="chip">{t.niche}</span>
              <span className="chip">{t.style}</span>
              {!t.active && <span className="chip">desligado</span>}
            </div>
            {t.example_url ? (
              <a className="extlink" href={t.example_url} target="_blank" rel="noreferrer" style={{ fontSize: 13, wordBreak: 'break-all' }}>
                {t.example_url}
              </a>
            ) : (
              <p className="muted" style={{ fontSize: 12.5 }}>Sem link de exemplo</p>
            )}
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button data-perm="modelos.editar" className="btn btn-g btn-sm" onClick={() => setEdit(t)}>
                Editar
              </button>
              <button data-perm="modelos.editar" className="btn btn-g btn-sm" onClick={() => remove(t)} aria-label={`Apagar ${t.name}`}>
                <Icon name="trash" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-h">
          <Ib name="eye" tone="ok" size="sm" />
          <h2>Prévias criadas</h2>
        </div>
        <div className="tablewrap">
          <table>
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Modelo</th>
                <th>Criada</th>
                <th>Enviada</th>
                <th style={{ textAlign: 'right' }}>Visitas</th>
                <th title="Desligado: o link mostra 'Página indisponível' para o cliente">Cliente vê</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {previews.length === 0 && (
                <tr>
                  <td colSpan={7} className="muted">
                    Nenhuma prévia ainda. Elas aparecem aqui quando a IA cria (ou quando você clica em "Gerar prévia" na ficha do lead).
                  </td>
                </tr>
              )}
              {previews.map((p) => (
                <tr key={p.slug}>
                  <td>
                    <b>{p.leads?.name || '—'}</b>
                    <div className="muted" style={{ fontSize: 12 }}>
                      {p.leads?.niche} · {p.created_by === 'ia' ? 'pela IA' : 'pela equipe'}
                    </div>
                  </td>
                  <td>
                    {p.kind === 'premium' ? (
                      <span className="chip" style={{ ['--t' as any]: 'var(--ai)' }}>
                        Premium · {p.tpl || 'modelo'}
                      </span>
                    ) : (
                      <span className="chip" style={{ ['--t' as any]: 'var(--warn)' }}>
                        Simples (antigo)
                      </span>
                    )}
                  </td>
                  <td className="muted">{new Date(p.created_at).toLocaleDateString('pt-BR')}</td>
                  <td className="muted">{p.sent_at ? new Date(p.sent_at).toLocaleDateString('pt-BR') : 'não'}</td>
                  <td style={{ textAlign: 'right' }}>{p.views}</td>
                  <td>
                    <span data-perm="previas.gerar" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }} title={p.visible === false ? 'Oculta: o cliente vê "Página indisponível"' : 'Visível para o cliente'}>
                      <Switch label={`Prévia de ${p.leads?.name || p.slug} visível para o cliente`} checked={p.visible !== false} onChange={(v) => setVisible(p, v)} />
                      <small className="muted">{p.visible === false ? 'Oculta' : 'Visível'}</small>
                    </span>
                  </td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <a className="btn btn-g btn-sm" href={`/previa/${p.slug}`} target="_blank" rel="noreferrer">
                      <Icon name="ext" />
                      Abrir
                    </a>{' '}
                    <button className="btn btn-g btn-sm" onClick={() => copyText(`${origin}/previa/${p.slug}`)} aria-label="Copiar link">
                      <Icon name="copy" />
                    </button>
                    {prem.length > 0 && p.lead_id && (
                      <span data-perm="previas.gerar" style={{ display: 'inline-flex', gap: 4, alignItems: 'center', marginLeft: 6 }}>
                        <select className="input" style={{ width: 170, height: 32, fontSize: 12.5 }} value={pick[p.slug] || ''} onChange={(e) => setPick({ ...pick, [p.slug]: e.target.value })} aria-label="Modelo premium">
                          <option value="">Modelo: o que mais combina</option>
                          {prem.map((t) => (
                            <option key={t.slug} value={t.slug}>
                              {t.name}
                            </option>
                          ))}
                        </select>
                        <button className="btn btn-sm btn-p" onClick={() => redo(p)} disabled={!!busyP} title="Refaz com o modelo premium e os dados da conversa (mesmo link)">
                          {busyP === p.slug ? <span className="spin" /> : <Icon name="refresh" />} {p.kind === 'premium' ? 'Refazer' : 'Trocar p/ premium'}
                        </button>
                      </span>
                    )}
                    {unlink === p.slug ? (
                      <span data-perm="previas.gerar" style={{ display: 'inline-flex', gap: 4, alignItems: 'center', marginLeft: 6 }}>
                        <small>Apagar este link?</small>
                        <button className="btn btn-sm" style={{ color: 'var(--bad)' }} onClick={() => doUnlink(p.slug)}>
                          Desvincular
                        </button>
                        <button className="btn btn-sm btn-g" onClick={() => setUnlink(null)}>
                          Não
                        </button>
                      </span>
                    ) : (
                      <button data-perm="previas.gerar" className="iconbtn" style={{ marginLeft: 4 }} onClick={() => setUnlink(p.slug)} aria-label="Desvincular prévia" title="Desvincular do cliente (apaga este link)">
                        <Icon name="trash" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
