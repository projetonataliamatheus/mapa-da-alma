'use client';
/* Visível para o cliente + acesso do cliente (usuário e senha) de um Link na bio ou Catálogo. */
import { useEffect, useState } from 'react';
import { Icon } from '@/components/Icon';
import { Switch, api, toast, copyText, timeLabel } from '@/components/ui';

export function VisibleSwitch({ kind, id, value, onChange, name }: { kind: 'bio' | 'catalogo' | 'previa'; id: string; value: boolean; onChange: (v: boolean) => void; name: string }) {
  async function set(v: boolean) {
    onChange(v);
    try {
      await api('/api/visibilidade', 'POST', { kind, id, visible: v });
      toast(v ? 'Visível para o cliente' : 'Oculta: o link mostra "Página indisponível"');
    } catch (e: any) {
      onChange(!v);
      toast(e.message);
    }
  }
  return (
    <label className="vis-sw" title={value ? 'Visível para o cliente' : 'Oculta: o link mostra "Página indisponível"'}>
      <Switch label={`${name} visível para o cliente`} checked={value} onChange={set} />
      <small>{value ? 'Visível' : 'Oculta'}</small>
    </label>
  );
}

export function ClientAccessButton({ kind, id, name }: { kind: 'bio' | 'catalogo'; id: string; name: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className="btn btn-sm btn-g" onClick={() => setOpen(true)} title="Usuário e senha para o cliente editar">
        <Icon name="key" /> Acesso
      </button>
      {open && <ClientAccessModal kind={kind} id={id} name={name} onClose={() => setOpen(false)} />}
    </>
  );
}

function ClientAccessModal({ kind, id, name, onClose }: { kind: 'bio' | 'catalogo'; id: string; name: string; onClose: () => void }) {
  const [acc, setAcc] = useState<any | null | undefined>(undefined);
  const [username, setUsername] = useState('');
  const [shown, setShown] = useState<{ username: string; password: string | null; message: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const load = () =>
    api(`/api/clientes-acesso?kind=${kind}&id=${id}`, 'GET')
      .then((r) => setAcc(r.account))
      .catch((e) => (toast(e.message), setAcc(null)));
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  async function run(fn: () => Promise<any>) {
    setBusy(true);
    try {
      await fn();
    } catch (e: any) {
      toast(e.message);
    }
    setBusy(false);
  }
  const create = () =>
    run(async () => {
      const r = await api('/api/clientes-acesso', 'POST', { kind, id, username: username.trim() || undefined });
      setShown(r);
      load();
    });
  const reset = () =>
    run(async () => {
      if (!window.confirm('Gerar uma senha nova? A senha antiga para de funcionar na hora.')) return;
      setShown(await api('/api/clientes-acesso', 'PATCH', { kind, id, action: 'reset' }));
      load();
    });
  const toggle = (on: boolean) => run(async () => (await api('/api/clientes-acesso', 'PATCH', { kind, id, action: on ? 'enable' : 'disable' }), load()));
  const unlink = () =>
    run(async () => {
      if (!window.confirm('Tirar o acesso do cliente desta página? Ele não consegue mais editar até você criar outro.')) return;
      await api('/api/clientes-acesso', 'PATCH', { kind, id, action: 'unlink' });
      setShown(null);
      load();
    });

  return (
    <>
      <div className="scrim" onClick={onClose} />
      <div className="modal" role="dialog" aria-label="Acesso do cliente" style={{ textAlign: 'left', alignItems: 'stretch', width: 'min(520px, calc(100vw - 32px))' }}>
        <h2 style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <Icon name="key" /> Acesso do cliente
        </h2>
        <p className="muted" style={{ fontSize: 13 }}>
          {name}: para editar, o cliente entra com usuário e senha. Só o link de edição não abre mais nada.
        </p>
        {acc === undefined ? (
          <p className="muted">Carregando…</p>
        ) : shown ? (
          <div className="ca-shown">
            <div>
              Usuário: <b>{shown.username}</b>
            </div>
            {shown.password ? (
              <div>
                Senha: <b className="ca-pw">{shown.password}</b>
              </div>
            ) : (
              <div className="muted" style={{ fontSize: 13 }}>
                O cliente já tinha acesso (mesmo usuário e senha de antes). Se ele esqueceu, gere uma senha nova.
              </div>
            )}
            {shown.password && <small className="muted">Esta senha aparece só agora. Copie e mande para o cliente.</small>}
            <textarea className="input" readOnly rows={6} value={shown.message} style={{ fontSize: 12.5 }} />
            <button className="btn btn-p" onClick={() => copyText(shown.message)}>
              <Icon name="copy" /> Copiar mensagem para o cliente
            </button>
          </div>
        ) : acc ? (
          <div className="ca-info">
            <div>
              Usuário: <b>{acc.username}</b>
            </div>
            <div className="muted" style={{ fontSize: 13 }}>
              {acc.last_login_at ? `Último acesso ${timeLabel(acc.last_login_at)}` : 'Ainda não entrou'}
              {acc.locked_until && new Date(acc.locked_until) > new Date() ? ' · bloqueado por senhas erradas (libera em 15 min ou gere senha nova)' : ''}
            </div>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13.5 }}>
              <Switch label="Acesso ativo" checked={acc.active} disabled={busy} onChange={toggle} /> Acesso {acc.active ? 'ativo' : 'desativado'}
            </label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button className="btn btn-sm" onClick={reset} disabled={busy}>
                <Icon name="refresh" /> Gerar senha nova
              </button>
              <button className="btn btn-sm btn-g" style={{ color: 'var(--bad)' }} onClick={unlink} disabled={busy}>
                Tirar acesso desta página
              </button>
            </div>
          </div>
        ) : (
          <div className="ca-info">
            <label className="field">
              <span>Usuário (opcional)</span>
              <input className="input" value={username} onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ''))} placeholder="em branco: usa o endereço da página" />
            </label>
            <small className="muted">Se este cliente já tem acesso em outra página, o mesmo usuário é reaproveitado.</small>
            <button className="btn btn-p" onClick={create} disabled={busy}>
              {busy ? 'Criando…' : 'Criar acesso e gerar senha'}
            </button>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn-g" onClick={onClose}>
            Fechar
          </button>
        </div>
      </div>
    </>
  );
}
