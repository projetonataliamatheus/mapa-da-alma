'use client';
import { useEffect, useState } from 'react';
import { PageHead } from '@/components/PageHead';
import { Icon, Ib } from '@/components/Icon';
import { api, toast, timeLabel, copyText } from '@/components/ui';

export default function Dominios() {
  const [d, setD] = useState<any>(null);
  const [host, setHost] = useState('');
  const [roles, setRoles] = useState<string[]>(['checkout', 'previa']);
  const [busy, setBusy] = useState('');
  const [del, setDel] = useState<string | null>(null);
  async function load() {
    try {
      setD(await api('/api/domains', 'GET'));
    } catch (e: any) {
      toast(e.message);
    }
  }
  useEffect(() => {
    load();
  }, []);
  async function add() {
    setBusy('add');
    try {
      await api('/api/domains', 'POST', { host, roles });
      setHost('');
      toast('Domínio adicionado. Crie os registros DNS abaixo no site onde comprou o domínio');
      load();
    } catch (e: any) {
      toast(e.message);
    }
    setBusy('');
  }
  async function check(h: string) {
    setBusy('c' + h);
    try {
      let r = await api('/api/domains', 'PATCH', { action: 'check', host: h });
      // o servidor às vezes não consegue chamar o próprio domínio (rede da VPS); o navegador confirma por fora
      if (r.dns_ok && !r.https_ok) {
        try {
          const j = await fetch(`https://${h}/api/domain-check`, { cache: 'no-store' }).then((x) => x.json());
          if (j?.radar) r = await api('/api/domains', 'PATCH', { action: 'confirm', host: h });
        } catch {}
      }
      toast(r.https_ok ? `${h} funcionando! Já está sendo usado.` : r.dns_ok ? 'DNS certo. Falta o passo do Easypanel' : 'DNS ainda não aponta para a VPS');
      load();
    } catch (e: any) {
      toast(e.message);
    }
    setBusy('');
  }
  async function setR(h: string, r: string[]) {
    try {
      await api('/api/domains', 'PATCH', { action: 'roles', host: h, roles: r });
      load();
    } catch (e: any) {
      toast(e.message);
    }
  }
  async function remove(h: string) {
    try {
      await api('/api/domains', 'DELETE', { host: h });
      setDel(null);
      toast('Domínio removido');
      load();
    } catch (e: any) {
      toast(e.message);
    }
  }
  if (!d) return <div className="spin" />;
  const roleList: [string, string, string, string?][] = d.roles || [];
  const active = d.active || {};
  return (
    <>
      <PageHead title="Domínios" sub="Os endereços de cada produto: painel, checkout, prévias, link na bio, packs e catálogo" icon="globe" tone="mut" help="horarios" />
      {d.missingTable && (
        <div className="alert" style={{ marginBottom: 12, borderColor: 'var(--bad)' }}>
          <Icon name="alert" className="status-bad" />
          <div style={{ fontSize: 13 }}>Rode a migração <b>018_dominios.sql</b> no Supabase.</div>
        </div>
      )}

      <div className="card dmap">
        <div className="card-h">
          <Ib name="target" tone="ai" size="sm" />
          <h2>Mapa dos endereços</h2>
          <span className="sp muted" style={{ fontSize: 12 }}>Cada produto e o endereço que ele usa agora</span>
        </div>
        <div className="dmap-list">
          {roleList.map(([k, l, desc, ic]) => {
            const mine = (d.domains || []).filter((x: any) => (x.roles || []).includes(k));
            const on = active[k];
            const def = k === 'bio' ? `${d.target?.baseHost ? 'https://' + d.target.baseHost : ''}/l` : d.target?.baseHost ? 'https://' + d.target.baseHost : '—';
            return (
              <div key={k} className={`dmap-row ${on ? 'ok' : mine.length ? 'wait' : ''}`}>
                <span className="dmap-ic">
                  <Icon name={ic || 'globe'} />
                </span>
                <div className="dmap-tx">
                  <b>{l}</b>
                  <small className="muted">{desc}</small>
                </div>
                <div className="dmap-url mono">
                  {on ? (
                    <a href={`https://${on}`} target="_blank" rel="noopener noreferrer">
                      https://{on}
                    </a>
                  ) : (
                    <span className="muted">{def} (padrão)</span>
                  )}
                </div>
                <div className="dmap-st">
                  {on ? (
                    <span className="chip" style={{ ['--t' as any]: 'var(--ok)' }}>
                      ✓ no ar
                    </span>
                  ) : mine.length ? (
                    <span className="chip" style={{ ['--t' as any]: 'var(--warn)' }} title={mine.map((x: any) => x.host).join(', ')}>
                      configurando {mine[0].host}
                    </span>
                  ) : (
                    <button className="linkbtn" onClick={() => (setRoles([k]), document.getElementById('dom-add')?.focus())}>
                      usar domínio próprio
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>
          Um domínio só entra em uso depois que o sistema confirma que ele abre com HTTPS. Os links antigos continuam funcionando.
        </p>
      </div>

      <div className="card" style={{ marginBottom: 14 }}>
        <div className="card-h">
          <Ib name="plus" tone="acc" size="sm" />
          <h2>Adicionar domínio</h2>
        </div>
        <div className="grid" style={{ gap: 10 }}>
          <input id="dom-add" className="input" placeholder="ex.: olinks.com.br, packs.suaagencia.com.br, pagar.suaempresa.com.br" value={host} onChange={(e) => setHost(e.target.value)} aria-label="Domínio" />
          <div className="dom-roles">
            <small className="muted">Para que serve:</small>
            {roleList.map(([k, l, desc]) => (
              <button key={k} type="button" className={`dom-role ${roles.includes(k) ? 'on' : ''}`} title={desc} onClick={() => setRoles(roles.includes(k) ? roles.filter((x) => x !== k) : [...roles, k])}>
                {roles.includes(k) ? '✓ ' : ''}
                {l}
              </button>
            ))}
          </div>
          <div>
            <button className="btn btn-p btn-sm" onClick={add} disabled={!host.trim() || !roles.length || !!busy}>
              {busy === 'add' ? <span className="spin" /> : <Icon name="plus" />} Adicionar e ver o DNS
            </button>
          </div>
          <p className="muted" style={{ fontSize: 12.5 }}>
            Domínio principal (ex.: <b>olinks.com.br</b>) ou subdomínio (ex.: <b>packs.</b>agenciafenixads.com.br). Um mesmo domínio pode servir para mais de uma função.
          </p>
        </div>
      </div>

      {(d.domains || []).length > 0 && <h3 className="dom-sect">Seus domínios</h3>}
      {(d.domains || []).map((x: any) => (
        <div key={x.host} className="card" style={{ marginBottom: 12 }}>
          <div className="card-h" style={{ flexWrap: 'wrap' }}>
            <Ib name="globe" tone={x.https_ok ? 'ok' : x.dns_ok ? 'warn' : 'mut'} size="sm" />
            <h2 style={{ flex: 1 }} className="mono">
              {x.host}
            </h2>
            <span className="chip" style={{ ['--t' as any]: x.dns_ok ? 'var(--ok)' : 'var(--muted)' }}>
              DNS {x.dns_ok ? '✓' : '…'}
            </span>
            <span className="chip" style={{ ['--t' as any]: x.https_ok ? 'var(--ok)' : 'var(--muted)' }}>
              HTTPS {x.https_ok ? '✓' : '…'}
            </span>
            <button className="btn btn-sm" onClick={() => check(x.host)} disabled={!!busy}>
              {busy === 'c' + x.host ? <span className="spin" /> : <Icon name="refresh" />} Verificar agora
            </button>
            {del === x.host ? (
              <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                <small>Remover?</small>
                <button className="btn btn-sm" style={{ color: 'var(--bad)' }} onClick={() => remove(x.host)}>
                  Remover
                </button>
                <button className="btn btn-sm btn-g" onClick={() => setDel(null)}>
                  Não
                </button>
              </span>
            ) : (
              <button className="iconbtn" aria-label={`Remover ${x.host}`} onClick={() => setDel(x.host)}>
                <Icon name="trash" />
              </button>
            )}
          </div>
          <div className="dom-roles" style={{ marginBottom: 10 }}>
            <small className="muted">Serve para:</small>
            {roleList.map(([k, l, desc]) => {
              const on = (x.roles || []).includes(k);
              return (
                <button key={k} type="button" className={`dom-role ${on ? 'on' : ''}`} title={desc} onClick={() => setR(x.host, on ? (x.roles || []).filter((y: string) => y !== k) : [...(x.roles || []), k])}>
                  {on ? '✓ ' : ''}
                  {l}
                </button>
              );
            })}
          </div>
          {x.error && <p className="err" style={{ fontSize: 12.5, marginBottom: 8 }}>{x.error}</p>}
          {x.https_ok && <p style={{ fontSize: 12.5, color: 'var(--ok)', marginBottom: 8 }}>Funcionando: https://{x.host}</p>}

          <div className="sect">
            <h3>1. No site onde você comprou o domínio (Registro.br, Hostinger, GoDaddy, Cloudflare…)</h3>
          </div>
          <div className="tablewrap">
            <table>
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Nome / Host</th>
                  <th>Valor / Aponta para</th>
                  <th>TTL</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {(x.records || []).map((r: any, i: number) => (
                  <tr key={i}>
                    <td>
                      <b>{r.tipo}</b>
                    </td>
                    <td className="mono">{r.nome}</td>
                    <td className="mono">
                      {r.valor}
                      {r.obs && <small className="muted" style={{ display: 'block', fontFamily: 'inherit' }}>{r.obs}</small>}
                    </td>
                    <td className="mono">3600</td>
                    <td>
                      <button className="linkbtn" onClick={() => copyText(r.valor)}>
                        copiar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="muted" style={{ fontSize: 12, margin: '6px 0 10px' }}>Se usar Cloudflare, deixe a nuvem cinza (somente DNS) até o HTTPS ficar ✓.</p>

          <div className="sect">
            <h3>2. No Easypanel</h3>
          </div>
          <ol style={{ fontSize: 13, paddingLeft: 18, lineHeight: 1.7 }}>
            <li>
              Easypanel › <b>radar › painel › Domínios</b> › <b>Adicionar domínio</b>.
            </li>
            <li>
              Host: <b className="mono">{x.host}</b>{' '}
              <button className="linkbtn" onClick={() => copyText(x.host)}>
                copiar
              </button>{' '}
              · Caminho: <b className="mono">/</b> · Porta: <b className="mono">3000</b> · HTTPS: <b>ligado</b> → Salvar.
            </li>
            <li>Volte aqui e clique em <b>Verificar agora</b>. Quando DNS e HTTPS ficarem ✓, o domínio passa a ser usado sozinho.</li>
          </ol>
          {x.last_check && <small className="muted">Última verificação {timeLabel(x.last_check)}{x.dns_found ? ` · DNS encontrado: ${x.dns_found}` : ''}</small>}
        </div>
      ))}
    </>
  );
}
