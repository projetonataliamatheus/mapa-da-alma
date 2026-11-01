'use client';
import { useEffect, useState } from 'react';
import { Icon } from './Icon';
import { api, toast, copyText } from './ui';
import { useCan } from './Shell';

/**
 * Na conversa: modelos premium que servem para este cliente (do nicho dele ou parecidos),
 * em cards com miniatura. Ver o modelo cru, escolher, gerar a prévia personalizada e mandar.
 */
export function PremiumPicker({ lead }: { lead: any }) {
  const can = useCan();
  const [d, setD] = useState<any>(null);
  const [busy, setBusy] = useState('');
  const [made, setMade] = useState<{ url: string; slug: string } | null>(null);
  const [all, setAll] = useState(false);
  async function load() {
    try {
      setD(await api(`/api/premium?lead=${lead.id}`, 'GET'));
    } catch {
      setD({ templates: [] });
    }
  }
  useEffect(() => {
    setMade(null);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lead.id, lead.niche]);
  if (!can('modelos')) return null;
  const full: any[] = d?.templates || [];
  const chosen = d?.chosen || lead.premium_template;
  // só os que fazem sentido para o cliente (+ o escolhido); o resto fica em "ver outros"
  const rel = full.filter((t) => t.relevant || t.slug === chosen);
  const list: any[] = all ? full : rel;
  const hidden = full.length - list.length;
  async function choose(slug: string) {
    setBusy('c' + slug);
    try {
      await api('/api/premium', 'PATCH', { action: 'choose', lead: lead.id, slug });
      setD({ ...d, chosen: slug });
      toast('Modelo escolhido para este cliente. A próxima prévia sai com ele');
    } catch (e: any) {
      toast(e.message);
    }
    setBusy('');
  }
  async function generate(slug: string, send = false) {
    setBusy((send ? 's' : 'g') + slug);
    try {
      // enviar: manda a prévia que já foi gerada (sem gastar IA de novo)
      const r = await api('/api/previews', 'POST', send ? { lead_id: lead.id, send: true, reuse: true } : { lead_id: lead.id, template: slug });
      setMade({ url: r.url, slug: r.slug });
      setD({ ...d, chosen: slug });
      toast(send ? 'Prévia enviada no WhatsApp' : 'Prévia pronta com os dados do cliente');
    } catch (e: any) {
      toast(e.message);
    }
    setBusy('');
  }
  return (
    <div className="sect">
      <h3 style={{ display: 'flex', alignItems: 'center' }}>
        Modelos para este cliente
        <a className="linkbtn" href="/modelos-premium" style={{ marginLeft: 'auto', fontSize: 12, textTransform: 'none', letterSpacing: 0 }}>
          todos
        </a>
      </h3>
      {!d ? (
        <span className="spin" />
      ) : list.length === 0 ? (
        <p className="muted" style={{ fontSize: 12.5 }}>Nenhum modelo premium pronto ainda. Envie em Modelos premium.</p>
      ) : (
        <>
          <p className="muted" style={{ fontSize: 12, marginBottom: 6 }}>
            {lead.niche || lead.memory?.negocio ? `Nicho: ${lead.niche || lead.memory?.negocio}. ` : 'Nicho ainda não informado: a lista melhora quando o cliente contar o que faz. '}
            {rel.length === 0 ? 'Ainda não há modelo do ramo dele: veja os outros abaixo ou envie um modelo novo em Sites.' : full[0]?.match === 'mesmo nicho' ? `${rel.length} modelo(s) do ramo dele.` : `${rel.length} modelo(s) que combinam com o ramo dele.`}
          </p>
          <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 6, scrollSnapType: 'x mandatory' }}>
            {list.map((t) => {
              const isChosen = chosen === t.slug;
              return (
                <div
                  key={t.slug}
                  style={{ flex: '0 0 210px', scrollSnapAlign: 'start', border: `1px solid ${isChosen ? 'var(--accent)' : 'var(--line)'}`, borderRadius: 12, overflow: 'hidden', background: 'var(--surface)', display: 'flex', flexDirection: 'column' }}
                >
                  <a href={`/modelo/${t.slug}`} target="_blank" rel="noreferrer" title="Ver o modelo como ele é" style={{ display: 'block', aspectRatio: '16/10', background: 'var(--surface-2)', overflow: 'hidden' }}>
                    {t.thumb_url ? <img src={t.thumb_url} alt={`Modelo ${t.name}`} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} loading="lazy" /> : null}
                  </a>
                  <div style={{ padding: 8, display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
                    <b style={{ fontSize: 12.5, lineHeight: 1.25 }}>{t.name}</b>
                    <span className="chip" style={{ fontSize: 10.5, alignSelf: 'flex-start', ['--t' as any]: t.match === 'mesmo nicho' || t.match === 'mesmo ramo' ? 'var(--ok)' : t.match === 'combina' ? 'var(--ai)' : 'var(--muted)' }}>
                      {isChosen ? '✓ escolhido · ' : ''}
                      {t.match}
                    </span>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 'auto' }}>
                      <a className="btn btn-sm btn-g" style={{ fontSize: 11.5, padding: '4px 8px' }} href={`/modelo/${t.slug}`} target="_blank" rel="noreferrer">
                        Ver
                      </a>
                      {!isChosen && (
                        <button data-perm="previas.gerar" className="btn btn-sm btn-g" style={{ fontSize: 11.5, padding: '4px 8px' }} onClick={() => choose(t.slug)} disabled={!!busy}>
                          {busy === 'c' + t.slug ? <span className="spin" /> : 'Escolher'}
                        </button>
                      )}
                      <button data-perm="previas.gerar" className="btn btn-sm btn-p" style={{ fontSize: 11.5, padding: '4px 8px' }} onClick={() => generate(t.slug)} disabled={!!busy} title="Gera a prévia com o nome, cores e dados do cliente (não envia)">
                        {busy === 'g' + t.slug ? <span className="spin" /> : 'Gerar prévia'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {(hidden > 0 || all) && (
            <button type="button" className="linkbtn" style={{ fontSize: 12 }} onClick={() => setAll(!all)}>
              {all ? 'Mostrar só os que combinam' : `Ver outros ${hidden} modelos`}
            </button>
          )}
          {made && (
            <div className="alert" style={{ marginTop: 8, padding: 10 }}>
              <Icon name="check" className="status-ok" />
              <div style={{ fontSize: 12.5, minWidth: 0 }}>
                Prévia pronta.{' '}
                <a className="linkbtn" href={made.url} target="_blank" rel="noreferrer">
                  Abrir
                </a>{' '}
                ·{' '}
                <button className="linkbtn" onClick={() => copyText(made.url)}>
                  copiar link
                </button>{' '}
                ·{' '}
                <button data-perm="previas.gerar" className="linkbtn" onClick={() => generate(chosen || made.slug, true)} disabled={!!busy}>
                  enviar no WhatsApp
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
