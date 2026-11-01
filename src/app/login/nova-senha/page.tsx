'use client';
import { useEffect, useState } from 'react';
import { sb } from '@/lib/supabase/browser';
import { ThemeToggle } from '@/components/Shell';
import { BrandBlock } from '@/components/Brand';

/**
 * Link do e-mail "recuperar senha". Aceita os 3 formatos do Supabase:
 *  ?token_hash=…&type=recovery (funciona em qualquer aparelho), ?code=… e #access_token=…
 */
export default function NovaSenha() {
  const [state, setState] = useState<'checando' | 'pronto' | 'invalido' | 'feito'>('checando');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const q = new URLSearchParams(window.location.search);
      const h = new URLSearchParams(window.location.hash.slice(1));
      const c = sb();
      try {
        if (q.get('error_description') || h.get('error_description')) throw new Error();
        if (q.get('token_hash')) {
          const r = await c.auth.verifyOtp({ token_hash: q.get('token_hash'), type: 'recovery' });
          if (r.error) throw r.error;
        } else if (q.get('code')) {
          const r = await c.auth.exchangeCodeForSession(q.get('code'));
          if (r.error) throw r.error;
        } else if (h.get('access_token') && h.get('refresh_token')) {
          const r = await c.auth.setSession({ access_token: h.get('access_token'), refresh_token: h.get('refresh_token') });
          if (r.error) throw r.error;
        }
        const { data } = await c.auth.getSession();
        if (!data?.session) throw new Error();
        // tira o código do endereço (não fica no histórico)
        window.history.replaceState(null, '', '/login/nova-senha');
        setState('pronto');
      } catch {
        setState('invalido');
      }
    })();
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    if (pw.length < 8) return setErr('A senha precisa ter pelo menos 8 caracteres.');
    if (pw !== pw2) return setErr('As duas senhas não são iguais.');
    setBusy(true);
    const r = await sb().auth.updateUser({ password: pw });
    setBusy(false);
    if (r.error) {
      setErr(/different|same/i.test(r.error.message) ? 'A senha nova precisa ser diferente da antiga.' : r.error.message);
      return;
    }
    setState('feito');
    setTimeout(() => (window.location.href = '/'), 1500);
  }

  return (
    <div className="login">
      <div className="login-theme">
        <ThemeToggle />
      </div>
      <form className="card" onSubmit={save}>
        <BrandBlock />
        <div>
          <h1 style={{ fontSize: 22 }}>Criar senha nova</h1>
        </div>
        {state === 'checando' && <span className="spin" />}
        {state === 'invalido' && (
          <>
            <p className="err">Este link expirou ou já foi usado. Peça um novo na tela de login, em “Esqueci minha senha”.</p>
            <a className="btn btn-p" href="/login" style={{ height: 42, justifyContent: 'center' }}>
              Voltar para o login
            </a>
          </>
        )}
        {state === 'feito' && (
          <p style={{ color: 'var(--ok)' }} role="status">
            Senha alterada! Entrando no painel…
          </p>
        )}
        {state === 'pronto' && (
          <>
            <div className="field">
              <label htmlFor="pw">Senha nova (mínimo 8 caracteres)</label>
              <input id="pw" className="input" type="password" required minLength={8} value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" autoFocus />
            </div>
            <div className="field">
              <label htmlFor="pw2">Repita a senha nova</label>
              <input id="pw2" className="input" type="password" required minLength={8} value={pw2} onChange={(e) => setPw2(e.target.value)} autoComplete="new-password" />
            </div>
            {err && <p className="err">{err}</p>}
            <button className="btn btn-p" disabled={busy} style={{ height: 42 }}>
              {busy ? 'Salvando…' : 'Salvar senha nova'}
            </button>
          </>
        )}
      </form>
    </div>
  );
}
