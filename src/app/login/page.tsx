'use client';
import { useState } from 'react';
import { sb } from '@/lib/supabase/browser';
import { ThemeToggle } from '@/components/Shell';
import { BrandBlock, useBrand } from '@/components/Brand';

/** Entrar no painel ou pedir o e-mail para criar uma senha nova. Contas novas só são criadas pelo administrador (Equipe). */
export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'entrar' | 'esqueci'>('entrar');
  const { brand } = useBrand();
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    setOk('');
    setBusy(true);
    if (mode === 'esqueci') {
      const r = await sb().auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/login/nova-senha` });
      setBusy(false);
      if (r.error && /rate|limit|seconds/i.test(r.error.message)) {
        setErr('Muitos pedidos seguidos. Espere alguns minutos e tente de novo.');
        return;
      }
      // mesma resposta exista ou não a conta (não revela quais e-mails estão cadastrados)
      setOk('Se este e-mail estiver cadastrado, você vai receber um link para criar uma senha nova. Confira também a caixa de spam.');
      return;
    }
    const r = await sb().auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (r.error) {
      setErr(r.error.message === 'Invalid login credentials' ? 'E-mail ou senha incorretos.' : r.error.message);
      return;
    }
    window.location.href = '/';
  }

  const forgot = mode === 'esqueci';
  return (
    <div className="login">
      <div className="login-theme">
        <ThemeToggle />
      </div>
      <form className="card" onSubmit={submit}>
        <BrandBlock />
        <div>
          <h1 style={{ fontSize: 22 }}>{forgot ? 'Recuperar a senha' : brand.login_title}</h1>
          <p className="muted" style={{ marginTop: 4 }}>
            {forgot ? 'Digite o e-mail cadastrado. Vamos enviar um link para você criar uma senha nova.' : brand.login_sub}
          </p>
        </div>
        <div className="field">
          <label htmlFor="email">E-mail</label>
          <input id="email" className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        </div>
        {!forgot && (
          <div className="field">
            <label htmlFor="pw" style={{ display: 'flex' }}>
              Senha
              <button type="button" className="linkbtn" style={{ marginLeft: 'auto', fontSize: 12.5 }} onClick={() => (setMode('esqueci'), setErr(''), setOk(''))}>
                Esqueci minha senha
              </button>
            </label>
            <input id="pw" className="input" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
          </div>
        )}
        {err && <p className="err">{err}</p>}
        {ok && (
          <p style={{ fontSize: 13, color: 'var(--ok)' }} role="status">
            {ok}
          </p>
        )}
        <button className="btn btn-p" disabled={busy} style={{ height: 42 }}>
          {busy ? 'Aguarde…' : forgot ? 'Enviar link por e-mail' : 'Entrar'}
        </button>
        {forgot ? (
          <p className="muted" style={{ fontSize: 12.5 }}>
            <button type="button" className="linkbtn" onClick={() => (setMode('entrar'), setErr(''), setOk(''))}>
              Voltar para o login
            </button>
          </p>
        ) : (
          <p className="muted" style={{ fontSize: 12.5 }}>Não tem acesso? Peça ao administrador para criar sua conta em Equipe.</p>
        )}
      </form>
    </div>
  );
}
