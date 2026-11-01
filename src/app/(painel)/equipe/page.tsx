'use client';
import { useEffect, useMemo, useState } from 'react';
import { PageHead } from '@/components/PageHead';
import { TeamActivity } from '@/components/TeamActivity';
import { Icon, Ib } from '@/components/Icon';
import { api, toast, initials, timeLabel, Switch } from '@/components/ui';
import { useMe } from '@/components/Shell';
import { sb } from '@/lib/supabase/browser';
import { PERMS, ROLES, PRESETS, MASTER_ONLY, SECTIONS, PARENT, can, isMaster, permsOf, roleLabel } from '@/lib/perms';

const MASTER_KEYS = new Set(MASTER_ONLY.map((m) => m[0]));
const actionsOf = (menu: string) => PERMS.filter((p) => PARENT[p[0]] === menu);
const LOOSE = PERMS.filter((p) => p[2] === 'Ações' && !PARENT[p[0]]);

/**
 * Permissões organizadas como o menu lateral: Operação, Vendas e Sistema.
 * Marque a seção inteira ou item por item; as ações de cada menu ficam logo abaixo dele.
 * Só fica marcável o que quem está editando também tem.
 */
function PermGrid({ value, onChange, granter }: { value: string[]; onChange: (v: string[]) => void; granter: any }) {
  const set = new Set(value);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const apply = (n: Set<string>) => onChange(Array.from(n));
  const toggleMenu = (k: string, on: boolean) => {
    const n = new Set(set);
    if (on) n.add(k);
    else {
      n.delete(k);
      // sem o menu, as ações dele não fazem sentido
      actionsOf(k).forEach(([a]) => n.delete(a));
    }
    apply(n);
  };
  const toggleAction = (k: string, on: boolean) => {
    const n = new Set(set);
    if (on) {
      n.add(k);
      if (PARENT[k] && can(granter, PARENT[k])) n.add(PARENT[k]);
    } else n.delete(k);
    apply(n);
  };
  const toggleSection = (items: [string, string][], on: boolean) => {
    const n = new Set(set);
    for (const [k] of items) {
      if (MASTER_KEYS.has(k) || !can(granter, k)) continue;
      if (on) n.add(k);
      else {
        n.delete(k);
        actionsOf(k).forEach(([a]) => n.delete(a));
      }
    }
    apply(n);
  };
  const withActions = (on: boolean, menu: string) => {
    const n = new Set(set);
    actionsOf(menu).forEach(([a]) => can(granter, a) && (on ? n.add(a) : n.delete(a)));
    if (on) n.add(menu);
    apply(n);
  };

  return (
    <div className="permsec-wrap">
      {SECTIONS.map(([sec, items]) => {
        const editable = items.filter(([k]) => !MASTER_KEYS.has(k));
        const onCount = editable.filter(([k]) => set.has(k)).length;
        const all = onCount === editable.length && editable.length > 0;
        const some = onCount > 0 && !all;
        return (
          <section key={sec} className={`permsec ${onCount ? '' : 'none'}`}>
            <header className="permsec-h">
              <label className="permsec-all">
                <input type="checkbox" checked={all} ref={(el) => {
                  if (el) el.indeterminate = some;
                }} onChange={(e) => toggleSection(items, e.target.checked)} />
                <b>{sec}</b>
              </label>
              <small className="muted">
                {onCount ? `${onCount} de ${editable.length} menus liberados` : 'Seção inteira bloqueada'}
              </small>
              <span className="sp" />
              <button type="button" className="btn btn-sm btn-g" onClick={() => toggleSection(items, true)}>
                Liberar tudo
              </button>
              <button type="button" className="btn btn-sm btn-g" onClick={() => toggleSection(items, false)}>
                Bloquear tudo
              </button>
            </header>
            <div className="permsec-items">
              {items.map(([k, label]) => {
                if (MASTER_KEYS.has(k))
                  return (
                    <div key={k} className="permrow off" title="Só o Master acessa">
                      <input type="checkbox" disabled checked={false} />
                      <span>
                        {label}
                        <small>Exclusivo do Master</small>
                      </span>
                    </div>
                  );
                const acts = actionsOf(k);
                const allowed = can(granter, k);
                const desc = PERMS.find((p) => p[0] === k)?.[3];
                const actOn = acts.filter(([a]) => set.has(a)).length;
                const isOpen = open[k] ?? (set.has(k) && acts.length > 0);
                return (
                  <div key={k} className={`permrow-wrap ${set.has(k) ? 'on' : ''}`}>
                    <div className="permrow">
                      <label className={allowed ? '' : 'off'} title={allowed ? desc : 'Você não tem esta permissão para repassar'}>
                        <input type="checkbox" checked={set.has(k)} disabled={!allowed} onChange={(e) => toggleMenu(k, e.target.checked)} />
                        <span>
                          {label}
                          <small>{desc}</small>
                        </span>
                      </label>
                      {acts.length > 0 && (
                        <button type="button" className="permacts-t" onClick={() => setOpen({ ...open, [k]: !isOpen })} aria-expanded={isOpen}>
                          {actOn}/{acts.length} ações <Icon name="chevron" className={isOpen ? 'up' : ''} />
                        </button>
                      )}
                    </div>
                    {acts.length > 0 && isOpen && (
                      <div className="permacts">
                        {acts.map(([a, al, , ad]) => {
                          const ok = can(granter, a);
                          return (
                            <label key={a} className={`perm ${ok ? '' : 'off'}`} title={ok ? ad : 'Você não tem esta permissão para repassar'}>
                              <input type="checkbox" checked={set.has(a)} disabled={!ok} onChange={(e) => toggleAction(a, e.target.checked)} />
                              <span>
                                {al}
                                <small>{ad}</small>
                              </span>
                            </label>
                          );
                        })}
                        {acts.length > 1 && (
                          <span className="permacts-q">
                            <button type="button" className="linkbtn" onClick={() => withActions(true, k)}>
                              marcar todas
                            </button>
                            ·
                            <button type="button" className="linkbtn" onClick={() => withActions(false, k)}>
                              desmarcar
                            </button>
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
      {LOOSE.length > 0 && (
        <section className="permsec">
          <header className="permsec-h">
            <b>Outras ações</b>
          </header>
          <div className="permsec-items">
            {LOOSE.map(([k, label, , desc]) => (
              <label key={k} className={`perm ${can(granter, k) ? '' : 'off'}`}>
                <input type="checkbox" checked={set.has(k)} disabled={!can(granter, k)} onChange={(e) => toggleAction(k, e.target.checked)} />
                <span>
                  {label}
                  <small>{desc}</small>
                </span>
              </label>
            ))}
          </div>
        </section>
      )}
      <p className="muted" style={{ fontSize: 12 }}>
        Ajuda e Manuais fica sempre liberado. O que não estiver marcado some do menu e a pessoa não consegue abrir nem pelo endereço.
      </p>
    </div>
  );
}

export default function Equipe() {
  const me = useMe();
  const mine = me?.member;
  const manager = can(mine, 'equipe.gerenciar');
  const master = isMaster(mine);
  const [list, setList] = useState<any[]>([]);
  const [f, setF] = useState<any>({ name: '', email: '', password: '', role: 'vendedor', perms: PRESETS.vendedor });
  const [edit, setEdit] = useState<any>(null);
  const [pw, setPw] = useState('');
  const [confirm, setConfirm] = useState<string | null>(null);
  const roles = useMemo(() => ROLES.filter((r) => r[0] !== 'master' && (master || r[0] !== 'gerente')), [master]);

  const load = async () => {
    const { data } = await sb().from('team_members').select('*').order('created_at');
    setList(data || []);
  };
  useEffect(() => {
    load();
  }, []);

  const manageable = (p: any) => manager && p.id !== mine?.id && !isMaster(p) && (master || (p.role !== 'gerente' && p.created_by === mine?.id));

  async function create(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api('/api/team', 'POST', f);
      toast(`Acesso criado. Envie o e-mail e a senha para ${f.name || f.email}`);
      setF({ name: '', email: '', password: '', role: 'vendedor', perms: PRESETS.vendedor });
      load();
    } catch (e: any) {
      toast(e.message);
    }
  }
  async function saveEdit() {
    try {
      await api('/api/team', 'PATCH', { id: edit.id, role: edit.role, perms: edit.perms, name: edit.name });
      toast('Acesso atualizado');
      setEdit(null);
      load();
    } catch (e: any) {
      toast(e.message);
    }
  }
  async function setActive(p: any, active: boolean) {
    try {
      await api('/api/team', 'PATCH', { id: p.id, active });
      toast(active ? 'Acesso reativado' : 'Acesso desativado');
      load();
    } catch (e: any) {
      toast(e.message);
    }
  }
  async function reset2fa(p: any) {
    if (!window.confirm(`Redefinir a verificação em 2 etapas de ${p.name}? A pessoa vai precisar ler um QR Code novo no Google Authenticator no próximo acesso.`)) return;
    try {
      await api('/api/team', 'PATCH', { id: p.id, reset_2fa: true });
      toast('Verificação redefinida. No próximo acesso a pessoa configura de novo.');
    } catch (e: any) {
      toast(e.message);
    }
  }
  async function remove(id: string) {
    try {
      await api('/api/team', 'DELETE', { id });
      toast('Acesso removido');
      setConfirm(null);
      load();
    } catch (e: any) {
      toast(e.message);
    }
  }
  async function changePw(e: React.FormEvent) {
    e.preventDefault();
    if (pw.length < 8) return toast('A senha precisa ter pelo menos 8 caracteres.');
    const { error } = await sb().auth.updateUser({ password: pw });
    if (error) toast(error.message);
    else {
      setPw('');
      toast('Senha alterada');
    }
  }

  return (
    <>
      <PageHead title="Equipe" sub="Quem acessa o painel e o que cada pessoa pode ver e fazer" icon="users" tone="gg" help="equipe" />
      <div className="card">
        <div className="tablewrap">
          <table>
            <thead>
              <tr>
                <th>Pessoa</th>
                <th>Perfil</th>
                <th>Acessos</th>
                <th>Desde</th>
                <th>Ativo</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {list.map((p) => (
                <tr key={p.id} style={{ opacity: p.active === false ? 0.55 : 1 }}>
                  <td>
                    <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
                      <span className="avatar">{initials(p.name || p.email)}</span>
                      <span>
                        <b>{p.name}</b>
                        {p.id === me?.id && <span className="chip" style={{ marginLeft: 6 }}>você</span>}
                        <div className="muted" style={{ fontSize: 12 }}>
                          {p.email}
                        </div>
                      </span>
                    </span>
                  </td>
                  <td>
                    <span className="chip" style={{ ['--t' as any]: isMaster(p) ? 'var(--accent)' : p.role === 'gerente' ? 'var(--ai)' : 'var(--gg)' }}>
                      {roleLabel(p.role)}
                    </span>
                  </td>
                  <td className="muted" style={{ fontSize: 12.5 }}>
                    {isMaster(p) ? 'Tudo' : `${permsOf(p).length} itens`}
                  </td>
                  <td className="muted">{timeLabel(p.created_at)}</td>
                  <td>{manageable(p) ? <Switch label={`Acesso de ${p.name}`} checked={p.active !== false} onChange={(v) => setActive(p, v)} /> : <span className="muted">—</span>}</td>
                  <td style={{ whiteSpace: 'nowrap', textAlign: 'right' }}>
                    {manageable(p) && (
                      <>
                        <button className="btn btn-sm btn-g" onClick={() => setEdit({ ...p, perms: permsOf(p) })}>
                          Permissões
                        </button>{' '}
                        <button className="btn btn-sm btn-g" title="Perdeu o celular? Apaga o autenticador para configurar de novo" onClick={() => reset2fa(p)}>
                          Redefinir 2FA
                        </button>{' '}
                        {confirm === p.id ? (
                          <button className="btn btn-sm" style={{ color: 'var(--bad)' }} onClick={() => remove(p.id)}>
                            Confirmar
                          </button>
                        ) : (
                          <button className="iconbtn" onClick={() => setConfirm(p.id)} aria-label={`Remover ${p.name}`}>
                            <Icon name="trash" />
                          </button>
                        )}
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {edit && (
        <div className="card">
          <div className="card-h">
            <Ib name="shield" tone="acc" size="sm" />
            <h2>Permissões de {edit.name}</h2>
          </div>
          <div className="formgrid">
            <div className="field">
              <label>Perfil</label>
              <select className="input" value={edit.role} onChange={(e) => setEdit({ ...edit, role: e.target.value, perms: PRESETS[e.target.value] || edit.perms })}>
                {roles.map((r) => (
                  <option key={r[0]} value={r[0]}>
                    {r[1]}
                  </option>
                ))}
              </select>
              <small className="muted">{ROLES.find((r) => r[0] === edit.role)?.[2]} Mudar o perfil aplica o padrão; depois ajuste item por item.</small>
            </div>
          </div>
          <PermGrid value={edit.perms} granter={mine} onChange={(perms) => setEdit({ ...edit, perms, role: edit.role === 'gerente' ? 'gerente' : 'personalizado' })} />
          <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
            <button className="btn btn-p" onClick={saveEdit}>
              <Icon name="check" />
              Salvar permissões
            </button>
            <button className="btn btn-g" onClick={() => setEdit(null)}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div className="grid g-2">
        {manager ? (
          <form className="card" onSubmit={create}>
            <div className="card-h">
              <Ib name="plus" tone="acc" size="sm" />
              <h2>Criar acesso</h2>
            </div>
            <div className="formgrid">
              <div className="field">
                <label htmlFor="n">Nome</label>
                <input id="n" className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required />
              </div>
              <div className="field">
                <label htmlFor="e">E-mail</label>
                <input id="e" type="email" className="input" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} required />
              </div>
              <div className="field">
                <label htmlFor="p">Senha inicial</label>
                <input id="p" className="input" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} minLength={8} required />
              </div>
              <div className="field">
                <label htmlFor="r">Perfil</label>
                <select id="r" className="input" value={f.role} onChange={(e) => setF({ ...f, role: e.target.value, perms: PRESETS[e.target.value] || f.perms })}>
                  {roles.map((r) => (
                    <option key={r[0]} value={r[0]}>
                      {r[1]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <p className="muted" style={{ fontSize: 12.5, margin: '10px 0' }}>
              {ROLES.find((r) => r[0] === f.role)?.[2]} {!master && 'Você só consegue liberar o que você mesmo tem.'}
            </p>
            <details>
              <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: 13.5 }}>Ajustar permissões item por item</summary>
              <PermGrid value={f.perms} granter={mine} onChange={(perms) => setF({ ...f, perms, role: f.role === 'gerente' ? 'gerente' : 'personalizado' })} />
            </details>
            <button className="btn btn-p" style={{ marginTop: 14 }}>
              <Icon name="plus" />
              Criar acesso
            </button>
          </form>
        ) : (
          <div className="card empty">
            <Ib name="shield" tone="mut" size="lg" />
            <div>
              <h2>Você não cria acessos</h2>
              <p>Peça ao Master se precisar liberar alguém.</p>
            </div>
          </div>
        )}
        <div className="card" style={{ gridColumn: '1 / -1' }}>
          <div className="card-h">
            <Ib name="clock" tone="ai" size="sm" />
            <h2>Atividade da equipe</h2>
          </div>
          <p className="muted" style={{ fontSize: 12.5, marginBottom: 8 }}>Quem fez o quê: aprovações, conversas assumidas, mensagens, arquivamentos, prévias… com o nome e o e-mail de quem estava logado.</p>
          <TeamActivity limit={100} />
        </div>
        <form className="card" onSubmit={changePw}>
          <div className="card-h">
            <Ib name="shield" tone="gg" size="sm" />
            <h2>Trocar minha senha</h2>
          </div>
          <div className="field">
            <label htmlFor="npw">Nova senha</label>
            <input id="npw" type="password" className="input" value={pw} onChange={(e) => setPw(e.target.value)} minLength={8} autoComplete="new-password" />
          </div>
          <div style={{ marginTop: 12 }}>
            <button className="btn">
              <Icon name="check" />
              Salvar nova senha
            </button>
          </div>
        </form>
      </div>
      {master && <AccessLog />}
    </>
  );
}

/** Registro de acessos: quem entrou, quando, de qual aparelho e rede. Aparelho/rede novos ficam destacados. */
function AccessLog() {
  const [items, setItems] = useState<any[] | null>(null);
  const [q, setQ] = useState('');
  useEffect(() => {
    fetch('/api/acesso', { cache: 'no-store' })
      .then((r) => r.json())
      .then((j) => setItems(j.items || []))
      .catch(() => setItems([]));
  }, []);
  const list = (items || []).filter((x) => !q || `${x.name} ${x.email} ${x.device} ${x.ip}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="card">
      <div className="card-h">
        <Icon name="shield" />
        <h2>Registro de acessos</h2>
        <input className="input" style={{ marginLeft: 'auto', maxWidth: 260, height: 32 }} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar pessoa, aparelho ou IP" />
      </div>
      <p className="muted" style={{ fontSize: 12.5, margin: '0 0 8px' }}>
        Quando alguém entra de um aparelho ou rede nova, o aviso vai para o WhatsApp do relatório semanal (Configurações).
      </p>
      <div className="tablewrap">
        <table>
          <thead>
            <tr>
              <th>Quando</th>
              <th>Pessoa</th>
              <th>Aparelho</th>
              <th>IP</th>
            </tr>
          </thead>
          <tbody>
            {items === null && (
              <tr>
                <td colSpan={4} className="muted">
                  Carregando…
                </td>
              </tr>
            )}
            {items && !list.length && (
              <tr>
                <td colSpan={4} className="muted">
                  Nenhum acesso registrado ainda.
                </td>
              </tr>
            )}
            {list.map((x) => (
              <tr key={x.id}>
                <td style={{ whiteSpace: 'nowrap' }}>{new Date(x.created_at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}</td>
                <td>
                  <b>{x.name}</b>
                  <div className="muted" style={{ fontSize: 12 }}>
                    {x.email}
                  </div>
                </td>
                <td>
                  {x.device}
                  {x.new_device && (
                    <span className="chip" style={{ ['--t' as any]: 'var(--warn)', marginLeft: 6 }}>
                      novo
                    </span>
                  )}
                </td>
                <td className="muted">{x.ip}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
