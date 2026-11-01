'use client';
/* Área do cliente: entra com usuário e senha e vê/edita o que é dele (Link na bio, Catálogo…). */
import { useEffect, useState } from 'react';
import { ClientLogin, clientLogout } from '@/components/ClientLogin';
import { LineChart } from '@/components/ClientWidgets';

type Me = {
  name: string;
  username: string;
  bioBase: string;
  catBase: string;
  bios: { slug: string; name: string; token: string; views: number; clicks: number; on: boolean }[];
  catalogs: { slug: string; name: string; token: string; views: number; on: boolean }[];
  instagram: any[];
  payments: { num: number; service: string; amount: number; paid_at: string }[];
  renewals: { title: string; amount: number; cycle: string; next_due: string; pay: string | null }[];
};
const brl = (v: any) => 'R$ ' + Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtD = (d?: string | null) => (d ? new Date(d.length === 10 ? d + 'T12:00:00' : d).toLocaleDateString('pt-BR') : '—');
const num = (v: any) => (v == null ? '—' : Number(v).toLocaleString('pt-BR'));

function IgBlock({ p }: { p: any }) {
  const s = p.snapshots || [];
  const last = s[s.length - 1];
  const diff = (days: number) => {
    const lim = Date.now() - days * 86400_000;
    const old = [...s].reverse().find((x: any) => Date.parse(x.day + 'T12:00:00') <= lim) || s[0];
    return last && old && old !== last && last.followers != null && old.followers != null ? last.followers - old.followers : null;
  };
  const sign = (v: number | null) => (v == null ? '—' : `${v >= 0 ? '+' : ''}${num(v)}`);
  return (
    <div className="card cli-ig">
      <div className="ig-h">
        <span className="avatar cl-av" style={p.pic_url ? { background: `url("${p.pic_url}") center/cover` } : undefined}>
          {!p.pic_url && '@'}
        </span>
        <div>
          <b>@{p.username}</b>
          <small className="muted" style={{ display: 'block' }}>
            Atualizado {fmtD(p.last_fetch_at)}
          </small>
        </div>
      </div>
      <div className="ig-kpis">
        <div>
          <small>Seguidores</small>
          <b>{num(last?.followers)}</b>
        </div>
        <div>
          <small>Últimos 7 dias</small>
          <b className={(diff(7) || 0) >= 0 ? 'up' : 'down'}>{sign(diff(7))}</b>
        </div>
        <div>
          <small>Últimos 30 dias</small>
          <b className={(diff(30) || 0) >= 0 ? 'up' : 'down'}>{sign(diff(30))}</b>
        </div>
        <div>
          <small>Curtidas (posts recentes)</small>
          <b>{num(last?.likes)}</b>
        </div>
        <div>
          <small>Comentários</small>
          <b>{num(last?.comments)}</b>
        </div>
        <div>
          <small>Posts</small>
          <b>{num(last?.posts)}</b>
        </div>
      </div>
      <small className="muted">Crescimento de seguidores</small>
      <LineChart label="Seguidores por dia" points={s.map((x: any) => ({ x: x.day, y: x.followers }))} />
    </div>
  );
}

function ChangePassword({ onClose }: { onClose: () => void }) {
  const [atual, setAtual] = useState('');
  const [nova, setNova] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg('');
    const r = await fetch('/api/cliente/senha', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ atual, nova }) });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) return setMsg(j.error || 'Não consegui trocar a senha.');
    setMsg('ok');
  }
  return (
    <form className="card cli-pw" onSubmit={submit}>
      <b>Trocar minha senha</b>
      {msg === 'ok' ? (
        <>
          <p style={{ color: 'var(--ok)', fontSize: 13.5 }}>Senha trocada! Use a nova da próxima vez que entrar.</p>
          <button type="button" className="btn" onClick={onClose}>
            Fechar
          </button>
        </>
      ) : (
        <>
          <input className="input" type="password" placeholder="Senha atual" autoComplete="current-password" required value={atual} onChange={(e) => setAtual(e.target.value)} />
          <input className="input" type="password" placeholder="Senha nova (mínimo 8 caracteres)" autoComplete="new-password" minLength={8} required value={nova} onChange={(e) => setNova(e.target.value)} />
          {msg && <p className="err">{msg}</p>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-p" disabled={busy}>
              {busy ? 'Salvando…' : 'Salvar senha'}
            </button>
            <button type="button" className="btn btn-g" onClick={onClose}>
              Cancelar
            </button>
          </div>
        </>
      )}
    </form>
  );
}

export default function ClientArea() {
  const [me, setMe] = useState<Me | null | 'login'>(null);
  const [pw, setPw] = useState(false);
  const [n, setN] = useState(0);
  useEffect(() => {
    fetch('/api/cliente/me', { cache: 'no-store' })
      .then(async (r) => (r.ok ? setMe(await r.json()) : setMe('login')))
      .catch(() => setMe('login'));
  }, [n]);
  if (me === null) return <div className="be-client-msg">Carregando…</div>;
  if (me === 'login') return <ClientLogin title="Área do cliente" sub="Entre com o usuário e a senha que você recebeu para ver e editar suas páginas." onDone={() => setN((x) => x + 1)} />;
  const empty = !me.bios.length && !me.catalogs.length && !me.instagram?.length && !me.payments?.length;
  return (
    <div className="cli-area">
      <header className="cli-area-h">
        <div>
          <small className="muted">Área do cliente</small>
          <h1>Olá, {me.name.split(' ')[0]}!</h1>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-g btn-sm" onClick={() => setPw(!pw)}>
            Trocar senha
          </button>
          <button className="btn btn-sm" onClick={async () => (await clientLogout(), setMe('login'))}>
            Sair
          </button>
        </div>
      </header>
      {pw && <ChangePassword onClose={() => setPw(false)} />}
      {empty && <div className="card cli-empty">Ainda não há nenhuma página ligada ao seu acesso. Fale com quem te atendeu.</div>}
      {me.instagram?.length > 0 && (
        <section>
          <h2>Seu Instagram</h2>
          <div className="cli-grid" style={{ gridTemplateColumns: '1fr' }}>
            {me.instagram.map((p: any) => (
              <IgBlock key={p.username} p={p} />
            ))}
          </div>
        </section>
      )}
      {me.renewals?.length > 0 && (
        <section>
          <h2>Próximos vencimentos</h2>
          <div className="cli-grid">
            {me.renewals.map((r, i) => (
              <div key={i} className="card cli-item">
                <b>{r.title}</b>
                <span className="muted">
                  {brl(r.amount)} · {r.cycle === 'anual' ? 'anual' : 'mensal'} · vence {fmtD(r.next_due)}
                </span>
                {r.pay && (
                  <a className="btn btn-p btn-sm" href={r.pay} target="_blank" rel="noopener noreferrer">
                    Pagar agora
                  </a>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
      {me.bios.length > 0 && (
        <section>
          <h2>Link na bio</h2>
          <div className="cli-grid">
            {me.bios.map((b) => (
              <div key={b.slug} className="card cli-item">
                <b>{b.name}</b>
                <a href={`${me.bioBase}/${b.slug}`} target="_blank" rel="noopener noreferrer" className="muted">
                  {me.bioBase.replace(/^https?:\/\//, '')}/{b.slug} ↗
                </a>
                <span className="muted">
                  {b.views} visitas · {b.clicks} cliques {b.on ? '' : '· fora do ar'}
                </span>
                <a className="btn btn-p btn-sm" href={`/l/editar/${b.token}`}>
                  Editar
                </a>
              </div>
            ))}
          </div>
        </section>
      )}
      {me.catalogs.length > 0 && (
        <section>
          <h2>Catálogo digital</h2>
          <div className="cli-grid">
            {me.catalogs.map((c) => (
              <div key={c.slug} className="card cli-item">
                <b>{c.name}</b>
                <a href={`${me.catBase}/${c.slug}`} target="_blank" rel="noopener noreferrer" className="muted">
                  {me.catBase.replace(/^https?:\/\//, '')}/{c.slug} ↗
                </a>
                <span className="muted">
                  {c.views} visitas {c.on ? '' : '· fora do ar'}
                </span>
                <a className="btn btn-p btn-sm" href={`/c/editar/${c.token}`}>
                  Editar
                </a>
              </div>
            ))}
          </div>
        </section>
      )}
      {me.payments?.length > 0 && (
        <section>
          <h2>Seus pagamentos</h2>
          <div className="card" style={{ padding: 0 }}>
            <div className="tablewrap">
              <table>
                <tbody>
                  {me.payments.map((p) => (
                    <tr key={p.num}>
                      <td className="muted">Pedido {String(p.num).padStart(5, '0')}</td>
                      <td>{fmtD(p.paid_at)}</td>
                      <td>{p.service || 'Pagamento'}</td>
                      <td style={{ textAlign: 'right', fontWeight: 650 }}>{brl(p.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
