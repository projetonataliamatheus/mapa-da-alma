'use client';
/* Verificação em 2 etapas (Google Authenticator). Obrigatória para todos da equipe: sem ela o painel não abre. */
import { useEffect, useRef, useState } from 'react';
import { sb } from '@/lib/supabase/browser';
import { ThemeToggle } from '@/components/Shell';
import { BrandBlock } from '@/components/Brand';

type Step = { kind: 'loading' } | { kind: 'enroll'; factorId: string; qr: string; secret: string } | { kind: 'verify'; factorId: string } | { kind: 'error'; msg: string };

export default function TwoFactor() {
  const [step, setStep] = useState<Step>({ kind: 'loading' });
  const [code, setCode] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    (async () => {
      const s = sb();
      const { data: sess } = await s.auth.getSession();
      if (!sess.session) return void (window.location.href = '/login');
      const { data: lvl } = await s.auth.mfa.getAuthenticatorAssuranceLevel();
      if (lvl?.currentLevel === 'aal2') return void (window.location.href = '/');
      const { data: f, error } = await s.auth.mfa.listFactors();
      if (error) return setStep({ kind: 'error', msg: error.message });
      const ok = (f?.totp || []).find((x: any) => x.status === 'verified');
      if (ok) return setStep({ kind: 'verify', factorId: ok.id });
      // cadastros que ficaram pela metade: apaga e começa de novo
      for (const x of (f?.all || []).filter((x: any) => x.status !== 'verified')) await s.auth.mfa.unenroll({ factorId: x.id }).catch(() => {});
      const { data: en, error: e2 } = await s.auth.mfa.enroll({ factorType: 'totp', friendlyName: `Autenticador ${new Date().toLocaleDateString('pt-BR')}` });
      if (e2 || !en) return setStep({ kind: 'error', msg: e2?.message || 'Não consegui iniciar a configuração.' });
      setStep({ kind: 'enroll', factorId: en.id, qr: en.totp.qr_code, secret: en.totp.secret });
    })().catch((e) => setStep({ kind: 'error', msg: String(e?.message || e) }));
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (step.kind !== 'enroll' && step.kind !== 'verify') return;
    setErr('');
    setBusy(true);
    const { error } = await sb().auth.mfa.challengeAndVerify({ factorId: step.factorId, code: code.replace(/\D/g, '') });
    if (error) {
      setBusy(false);
      setCode('');
      setErr(/invalid|expired/i.test(error.message) ? 'Código incorreto ou vencido. Digite o código que está aparecendo agora no aplicativo.' : error.message);
      return;
    }
    window.location.href = '/';
  }
  async function logout() {
    await sb().auth.signOut();
    window.location.href = '/login';
  }

  return (
    <div className="login">
      <div className="login-theme">
        <ThemeToggle />
      </div>
      <form className="card" onSubmit={submit} style={{ maxWidth: 440 }}>
        <BrandBlock />
        {step.kind === 'loading' && <p className="muted">Carregando…</p>}
        {step.kind === 'error' && (
          <>
            <h1 style={{ fontSize: 20 }}>Não foi possível abrir a verificação</h1>
            <p className="err">{step.msg}</p>
          </>
        )}
        {step.kind === 'enroll' && (
          <>
            <div>
              <h1 style={{ fontSize: 21 }}>Ative a verificação em 2 etapas</h1>
              <p className="muted" style={{ marginTop: 4, fontSize: 13.5 }}>
                Por segurança, o acesso ao painel exige um código do Google Authenticator além da senha. Faça isso uma vez só:
              </p>
            </div>
            <ol className="tfa-steps">
              <li>
                Instale o <b>Google Authenticator</b> no celular (Play Store ou App Store).
              </li>
              <li>
                No aplicativo, toque em <b>+</b> e em <b>Ler código QR</b>, e aponte para o código abaixo.
              </li>
              <li>Digite o código de 6 números que aparecer no aplicativo.</li>
            </ol>
            <div className="tfa-qr">
              <img src={step.qr} alt="Código QR para o Google Authenticator" width={190} height={190} />
            </div>
            <button type="button" className="linkbtn" style={{ fontSize: 12.5 }} onClick={() => setShowKey(!showKey)}>
              {showKey ? 'Esconder a chave' : 'Não consegue ler o QR? Digite a chave'}
            </button>
            {showKey && <code className="tfa-key">{step.secret.replace(/(.{4})/g, '$1 ').trim()}</code>}
          </>
        )}
        {step.kind === 'verify' && (
          <div>
            <h1 style={{ fontSize: 21 }}>Verificação em 2 etapas</h1>
            <p className="muted" style={{ marginTop: 4, fontSize: 13.5 }}>
              Abra o <b>Google Authenticator</b> no celular e digite o código de 6 números do painel.
            </p>
          </div>
        )}
        {(step.kind === 'enroll' || step.kind === 'verify') && (
          <>
            <div className="field">
              <label htmlFor="tfa">Código do aplicativo</label>
              <input
                id="tfa"
                className="input tfa-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9 ]{6,7}"
                maxLength={7}
                autoFocus
                required
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/[^\d ]/g, ''))}
                placeholder="000 000"
              />
            </div>
            {err && <p className="err">{err}</p>}
            <button className="btn btn-p" disabled={busy || code.replace(/\D/g, '').length !== 6} style={{ height: 42 }}>
              {busy ? 'Conferindo…' : step.kind === 'enroll' ? 'Ativar e entrar' : 'Entrar'}
            </button>
            {step.kind === 'verify' && <p className="muted" style={{ fontSize: 12.5 }}>Perdeu o celular? Peça ao Master para redefinir sua verificação em Equipe.</p>}
          </>
        )}
        <p className="muted" style={{ fontSize: 12.5 }}>
          <button type="button" className="linkbtn" onClick={logout}>
            Sair e entrar com outra conta
          </button>
        </p>
      </form>
    </div>
  );
}
