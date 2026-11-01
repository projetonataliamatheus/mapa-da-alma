'use client';
import { useState } from 'react';
import { PageHead } from '@/components/PageHead';
import { Icon, Ib } from '@/components/Icon';
import { toast } from '@/components/ui';
import { sb } from '@/lib/supabase/browser';
import { useMe } from '@/components/Shell';
import { TeamActivity } from '@/components/TeamActivity';

/** Minha conta: qualquer membro troca a própria senha e vê o que fez no painel. */
export default function MinhaConta() {
  const me = useMe();
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [busy, setBusy] = useState(false);
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
    toast('Senha alterada');
  }
  return (
    <>
      <PageHead title="Minha conta" sub={me ? `${me.member?.name || me.email} · ${me.email}` : 'Seu acesso ao painel'} icon="user" tone="gg" help="equipe" />
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
            <Ib name="clock" tone="ai" size="sm" />
            <h2>O que eu fiz</h2>
          </div>
          {me?.id ? <TeamActivity actor={me.id} limit={40} /> : <span className="spin" />}
        </div>
      </div>
    </>
  );
}
