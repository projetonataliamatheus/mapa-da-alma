'use client';
/* Login da área do cliente (Link na bio, Catálogo e área do cliente). */
import { useState } from 'react';

export function ClientLogin({ title = 'Entrar para editar', sub, onDone }: { title?: string; sub?: string; onDone: () => void }) {
  const [u, setU] = useState('');
  const [p, setP] = useState('');
  const [show, setShow] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    setBusy(true);
    try {
      const r = await fetch('/api/cliente/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: u, password: p }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || 'Não consegui entrar.');
      onDone();
    } catch (e: any) {
      setErr(e.message);
      setBusy(false);
    }
  }
  return (
    <div className="cli-login">
      <form className="card cli-login-card" onSubmit={submit}>
        <div className="cli-lock" aria-hidden>
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="4" y="11" width="16" height="10" rx="2" />
            <path d="M8 11V7a4 4 0 0 1 8 0v4" />
          </svg>
        </div>
        <h1>{title}</h1>
        <p className="muted">{sub || 'Por segurança, só você consegue mexer na sua página. Use o usuário e a senha que você recebeu.'}</p>
        <div className="field">
          <label htmlFor="cu">Usuário</label>
          <input id="cu" className="input" autoComplete="username" autoCapitalize="none" required value={u} onChange={(e) => setU(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="cp" style={{ display: 'flex' }}>
            Senha
            <button type="button" className="linkbtn" style={{ marginLeft: 'auto', fontSize: 12.5 }} onClick={() => setShow(!show)}>
              {show ? 'Esconder' : 'Mostrar'}
            </button>
          </label>
          <input id="cp" className="input" type={show ? 'text' : 'password'} autoComplete="current-password" required value={p} onChange={(e) => setP(e.target.value)} />
        </div>
        {err && <p className="err">{err}</p>}
        <button className="btn btn-p" disabled={busy} style={{ height: 42 }}>
          {busy ? 'Entrando…' : 'Entrar'}
        </button>
        <p className="muted" style={{ fontSize: 12.5 }}>Esqueceu a senha? Peça uma nova para quem te atendeu.</p>
      </form>
    </div>
  );
}

export async function clientLogout() {
  await fetch('/api/cliente/logout', { method: 'POST' }).catch(() => {});
}
