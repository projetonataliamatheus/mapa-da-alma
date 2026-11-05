'use client';
import { useEffect, useState } from 'react';
import { api, toast, copyText } from './ui';

type H = { host: string; nome: string; papel: string; tipo: string; valor: string; encontrado: string[]; dns_ok: boolean };

/** Domínios do Mapa (PT + ES): DNS esperado, estado do DNS e do HTTPS (conferido pelo navegador). */
export function DominiosMapa() {
  const [d, setD] = useState<any>(null);
  const [https, setHttps] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  async function load() {
    setBusy(true);
    try {
      const r = await api('/api/dominios-mapa', 'GET');
      setD(r);
      const hs: string[] = r.grupos.flatMap((g: any) => g.hosts.map((h: H) => h.host));
      const res: Record<string, boolean> = {};
      await Promise.all(
        hs.map(async (h) => {
          try {
            const ctl = new AbortController();
            const t = setTimeout(() => ctl.abort(), 8000);
            await fetch(`https://${h}/api/domain-check`, { mode: 'no-cors', signal: ctl.signal, cache: 'no-store' });
            clearTimeout(t);
            res[h] = true;
          } catch {
            res[h] = false;
          }
        }),
      );
      setHttps(res);
    } catch (e: any) {
      toast(e.message);
    }
    setBusy(false);
  }
  useEffect(() => {
    load();
  }, []);
  if (!d) return <div className="card muted">Carregando domínios…</div>;
  return (
    <div className="card" style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
        <h3 style={{ margin: 0, flex: 1 }}>Domínios do Mapa da Alma</h3>
        <button className="btn" onClick={load} disabled={busy}>
          {busy ? 'Atualizando…' : 'Atualizar'}
        </button>
      </div>
      <p className="muted" style={{ fontSize: 12.5, marginTop: 0 }}>
        Verde = DNS aponta para o servidor ({d.ip || 'IP não detectado'}) e o HTTPS responde. Vermelho = DNS errado ou site/SSL com problema. Cada endereço também precisa estar cadastrado no Easypanel (app → Domínios → https://host/ → porta 80).
      </p>
      {d.grupos.map((g: any) => (
        <div key={g.id} style={{ marginTop: 12 }}>
          <b>
            {g.ico} {g.nome} · {g.raiz || 'não configurado'} · pagamento {g.pagamento}
          </b>
          {g.hosts.map((h: H) => {
            const ok = h.dns_ok && https[h.host] !== false;
            const wait = h.dns_ok && https[h.host] === undefined;
            return (
              <div className="dm-row" key={h.host}>
                <span className={`dm-dot ${wait ? 'wait' : ok ? 'ok' : 'bad'}`} title={ok ? 'Conectado' : 'Com erro'} />
                <div>
                  <b>{h.host}</b> <small className="muted">· {h.papel}</small>
                  <div className="mono muted" style={{ fontSize: 12 }}>
                    DNS: {h.tipo} · nome <b>{h.nome}</b> → <b>{h.valor || '—'}</b>
                    {' '}· encontrado: {h.encontrado.length ? h.encontrado.join(', ') : 'nada'}
                    {!h.dns_ok ? ' · DNS incorreto' : https[h.host] === false ? ' · HTTPS/SSL com erro' : ''}
                  </div>
                </div>
                <button className="linkbtn" onClick={() => (copyText(h.valor), toast('IP copiado'))}>
                  copiar IP
                </button>
                <a href={`https://${h.host}`} target="_blank" rel="noopener noreferrer" className="linkbtn">
                  abrir
                </a>
              </div>
            );
          })}
        </div>
      ))}
      {d.painel && (
        <p className="muted" style={{ fontSize: 12.5 }}>
          Painel: {d.painel.host} → {d.painel.encontrado.join(', ') || 'sem DNS'}
        </p>
      )}
    </div>
  );
}
