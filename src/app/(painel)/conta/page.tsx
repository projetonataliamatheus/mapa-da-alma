'use client';
import { useEffect, useState } from 'react';
import { PageHead } from '@/components/PageHead';
import { Icon, Ib } from '@/components/Icon';
import { toast, api } from '@/components/ui';
import { sb } from '@/lib/supabase/browser';
import { useMe } from '@/components/Shell';
import { TeamActivity } from '@/components/TeamActivity';

/** Minha conta: qualquer membro troca a própria senha e vê o que fez no painel. */
export default function MinhaConta() {
  const me = useMe();
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [busy, setBusy] = useState(false);
  const [primeiro, setPrimeiro] = useState(false);
  const [mfa, setMfa] = useState<{ ok: boolean; nome?: string; desde?: string } | null>(null);
  useEffect(() => {
    setPrimeiro(new URLSearchParams(window.location.search).get('primeiro') === '1' || !!me?.member?.trocar_senha);
  }, [me?.member?.trocar_senha]);
  useEffect(() => {
    sb().auth.mfa.listFactors().then(({ data }) => {
      const f: any = (data?.totp || []).find((x: any) => x.status === 'verified');
      setMfa(f ? { ok: true, nome: f.friendly_name, desde: f.created_at } : { ok: false });
    }).catch(() => setMfa({ ok: false }));
  }, []);
  async function changePw(e: React.FormEvent) {
    e.preventDefault();
    if (pw.length < 8) return toast('A senha precisa ter pelo menos 8 caracteres.');
    if (pw !== pw2) return toast('As duas senhas não são iguais.');
    setBusy(true);
    const { error } = await sb().auth.updateUser({ password: pw });
    setBusy(false);
    if (error) return toast(/different|same/i.test(error.message) ? 'A senha nova precisa ser diferente da atual.' : error.message);
    setPw('');
    setPw2('');
    await api('/api/conta', 'POST', { acao: 'senha_trocada' }).catch(() => {});
    toast('Senha alterada');
    if (primeiro) window.location.href = '/';
  }
  return (
    <>
      <PageHead title="Minha conta" sub={me ? `${me.member?.name || me.email} · ${me.email}` : 'Seu acesso ao painel'} icon="user" tone="gg" help="equipe" />
      {primeiro && (
        <div className="card" style={{ borderColor: 'var(--warn)', background: 'color-mix(in srgb, var(--warn) 8%, var(--surface))', marginBottom: 14 }}>
          <b>🔐 Bem-vindo(a)! Antes de começar, crie a sua senha pessoal.</b>
          <p className="muted" style={{ margin: '4px 0 0', fontSize: 13.5 }}>A senha que você recebeu foi criada pela equipe. Troque por uma só sua (mínimo 8 caracteres). Depois disso o painel é liberado.</p>
        </div>
      )}
      <div className="grid g-2">
        <form className="card" onSubmit={changePw}>
          <div className="card-h">
            <Ib name="shield" tone="gg" size="sm" />
            <h2>Trocar minha senha</h2>
          </div>
          <div className="field">
            <label htmlFor="npw">Nova senha (mínimo 8 caracteres)</label>
            <input id="npw" type="password" className="input" value={pw} onChange={(e) => setPw(e.target.value)} minLength={8} autoComplete="new-password" />
          </div>
          <div className="field" style={{ marginTop: 8 }}>
            <label htmlFor="npw2">Repita a nova senha</label>
            <input id="npw2" type="password" className="input" value={pw2} onChange={(e) => setPw2(e.target.value)} minLength={8} autoComplete="new-password" />
          </div>
          <div style={{ marginTop: 12 }}>
            <button className="btn btn-p" disabled={busy}>
              {busy ? <span className="spin" /> : <Icon name="check" />}
              Salvar nova senha
            </button>
          </div>
          <p className="muted" style={{ fontSize: 12.5, marginTop: 10 }}>Esqueceu a senha? Na tela de login use "Esqueci minha senha".</p>
        </form>
        <div className="card">
          <div className="card-h">
            <Ib name="shield" tone={mfa?.ok ? 'gg' : 'warn'} size="sm" />
            <h2>Verificação em 2 etapas</h2>
          </div>
          {!mfa ? <span className="spin" /> : mfa.ok ? (
            <p style={{ margin: 0 }}>✅ <b>Ativa</b> no seu aplicativo autenticador{mfa.desde ? ` desde ${new Date(mfa.desde).toLocaleDateString('pt-BR')}` : ''}. Todo login pede a senha e o código de 6 dígitos.</p>
          ) : (
            <p style={{ margin: 0 }}>⚠️ Ainda não configurada. No próximo login o painel pede para você configurar o Google Authenticator (obrigatório).</p>
          )}
          <p className="muted" style={{ fontSize: 12.5, marginTop: 10 }}>Trocou de celular ou perdeu o aplicativo? Peça ao Master para redefinir a verificação em Sistema › Equipe.</p>
        </div>
        <div className="card">
          <div className="card-h">
            <Ib name="clock" tone="ai" size="sm" />
            <h2>O que eu fiz</h2>
          </div>
          {me?.id ? <TeamActivity actor={me.id} limit={40} /> : <span className="spin" />}
        </div>
      </div>
    </>
  );
}
