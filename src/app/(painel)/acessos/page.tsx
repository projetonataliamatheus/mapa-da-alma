'use client';
/* Acessos: banco de usuários e senhas compartilhado pela equipe. Senhas criptografadas no servidor. */
import { useEffect, useMemo, useRef, useState } from 'react';
import { PageHead } from '@/components/PageHead';
import { Icon } from '@/components/Icon';
import { api, toast, timeLabel } from '@/components/ui';
import { useCan } from '@/components/Shell';
import { norm } from '@/lib/util';

type Acesso = { id: string; nome: string; categoria: string; url: string | null; usuario: string | null; notas: string | null; tem_senha: boolean; updated_at: string; updated_by_name?: string | null };

const HUES = [12, 28, 145, 168, 200, 222, 262, 290, 330];
const hue = (t: string) => HUES[Array.from(t || '?').reduce((a, c) => a + c.charCodeAt(0), 0) % HUES.length];
const byName = (a: string, b: string) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' });
const href = (u: string) => (/^https?:\/\//i.test(u) ? u : 'https://' + u);
const host = (u: string) => {
  try {
    return new URL(href(u)).host.replace(/^www\./, '');
  } catch {
    return u;
  }
};

/** Copia sem mostrar o texto na tela (nunca aparece em aviso). Funciona também no iPhone com texto que vem do servidor. */
async function copySecret(get: () => Promise<string>, label: string) {
  try {
    if (typeof window !== 'undefined' && (window as any).ClipboardItem && navigator.clipboard?.write) {
      const p = get();
      await navigator.clipboard.write([new (window as any).ClipboardItem({ 'text/plain': p.then((t) => new Blob([t], { type: 'text/plain' })) })]);
    } else await navigator.clipboard.writeText(await get());
    toast(`${label} copiado`);
  } catch (e: any) {
    try {
      await navigator.clipboard.writeText(await get());
      toast(`${label} copiado`);
    } catch {
      toast(e?.message && !/clipboard|document|permission/i.test(e.message) ? e.message : 'O navegador bloqueou a cópia. Clique de novo.');
    }
  }
}

function genPassword(n = 16) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*?';
  const a = new Uint32Array(n);
  crypto.getRandomValues(a);
  return Array.from(a, (x) => chars[x % chars.length]).join('');
}

function Editor({ item, cats, onClose, onSaved }: { item: Partial<Acesso> | null; cats: string[]; onClose: () => void; onSaved: () => void }) {
  const isNew = !item?.id;
  const [f, setF] = useState({ nome: item?.nome || '', categoria: item?.categoria || '', url: item?.url || '', usuario: item?.usuario || '', senha: '', notas: item?.notas || '' });
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (isNew) await api('/api/acessos', 'POST', f);
      else await api(`/api/acessos/${item!.id}`, 'PATCH', f);
      toast(isNew ? 'Acesso cadastrado' : 'Acesso atualizado');
      onSaved();
    } catch (err: any) {
      toast(err.message);
    }
    setBusy(false);
  }
  return (
    <>
      <div className="scrim" onClick={onClose} />
      <form className="modal vault-modal" role="dialog" aria-label={isNew ? 'Novo acesso' : 'Editar acesso'} onSubmit={save}>
        <h2 style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <Icon name="key" /> {isNew ? 'Novo acesso' : 'Editar acesso'}
        </h2>
        <div className="field">
          <label htmlFor="v-nome">Plataforma ou acesso</label>
          <input id="v-nome" className="input" autoFocus value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} placeholder="Ex.: Instagram da agência, Hostinger, Canva" required />
        </div>
        <div className="formgrid" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <div className="field">
            <label htmlFor="v-cat">Classificação</label>
            <input id="v-cat" className="input" list="v-cats" value={f.categoria} onChange={(e) => setF({ ...f, categoria: e.target.value })} placeholder="Ex.: Redes sociais, Hospedagem, Cliente X" />
            <datalist id="v-cats">
              {cats.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>
          <div className="field">
            <label htmlFor="v-url">Link de acesso</label>
            <input id="v-url" className="input" value={f.url} onChange={(e) => setF({ ...f, url: e.target.value })} placeholder="hpanel.hostinger.com" inputMode="url" />
          </div>
        </div>
        <div className="field">
          <label htmlFor="v-user">Usuário, e-mail ou login</label>
          <input id="v-user" className="input" value={f.usuario} onChange={(e) => setF({ ...f, usuario: e.target.value })} autoComplete="off" spellCheck={false} />
        </div>
        <div className="field">
          <label htmlFor="v-pass">Senha {!isNew && <small className="muted">(deixe em branco para manter a atual)</small>}</label>
          <div className="vault-pass-in">
            <input id="v-pass" className="input" type={show ? 'text' : 'password'} value={f.senha} onChange={(e) => setF({ ...f, senha: e.target.value })} autoComplete="new-password" spellCheck={false} placeholder={isNew ? '' : '••••••••'} />
            <button type="button" className="iconbtn" onClick={() => setShow(!show)} aria-label={show ? 'Esconder senha' : 'Mostrar senha'} title={show ? 'Esconder' : 'Mostrar'}>
              <Icon name={show ? 'eye_off' : 'eye'} />
            </button>
            <button
              type="button"
              className="btn btn-sm btn-g"
              onClick={() => {
                setF({ ...f, senha: genPassword() });
                setShow(true);
              }}
              title="Cria uma senha forte de 16 caracteres"
            >
              Gerar senha
            </button>
          </div>
        </div>
        <div className="field">
          <label htmlFor="v-notas">Observações</label>
          <textarea id="v-notas" className="input" rows={3} value={f.notas} onChange={(e) => setF({ ...f, notas: e.target.value })} placeholder="Ex.: código de 2 fatores vai para o celular do Alan" />
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-g" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn btn-p" disabled={busy}>
            <Icon name="check" />
            {busy ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      </form>
    </>
  );
}

function Card({ a, onEdit, onDelete, editable }: { a: Acesso; onEdit: () => void; onDelete: () => void; editable: boolean }) {
  const [shown, setShown] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [askDel, setAskDel] = useState(false);
  const timer = useRef<any>(null);
  useEffect(() => () => clearTimeout(timer.current), []);
  const reveal = (action: 'ver' | 'copiar') => api(`/api/acessos/${a.id}`, 'POST', { action }).then((j: any) => String(j.senha || ''));
  async function toggle() {
    if (shown !== null) {
      setShown(null);
      return;
    }
    setBusy(true);
    try {
      setShown(await reveal('ver'));
      // volta a esconder sozinha depois de 30 s
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setShown(null), 30_000);
    } catch (e: any) {
      toast(e.message);
    }
    setBusy(false);
  }
  const h = hue(a.nome);
  return (
    <article className="vault-card" style={{ ['--h' as any]: h }}>
      <header>
        <span className="vault-av" aria-hidden="true">
          {a.nome.trim().slice(0, 1).toUpperCase()}
        </span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <b title={a.nome}>{a.nome}</b>
          {a.url ? (
            <a href={href(a.url)} target="_blank" rel="noopener noreferrer" className="vault-link" title={a.url}>
              {host(a.url)} <Icon name="ext" />
            </a>
          ) : (
            <small className="muted">Sem link</small>
          )}
        </div>
        {editable &&
          (askDel ? (
            <span className="vault-del">
              <button className="btn btn-sm" style={{ color: 'var(--bad)', borderColor: 'var(--bad)' }} onClick={onDelete}>
                Apagar
              </button>
              <button className="btn btn-sm btn-g" onClick={() => setAskDel(false)}>
                Não
              </button>
            </span>
          ) : (
            <span className="vault-acts">
              <button className="iconbtn" onClick={onEdit} aria-label={`Editar ${a.nome}`} title="Editar">
                <Icon name="sliders" />
              </button>
              <button className="iconbtn" onClick={() => setAskDel(true)} aria-label={`Apagar ${a.nome}`} title="Apagar">
                <Icon name="trash" />
              </button>
            </span>
          ))}
      </header>

      <div className="vault-row">
        <small>Usuário / e-mail</small>
        <div className="vault-val">
          <code title={a.usuario || ''}>{a.usuario || '—'}</code>
          {a.usuario && (
            <button className="iconbtn" onClick={() => copySecret(async () => a.usuario || '', 'Usuário')} aria-label="Copiar usuário" title="Copiar usuário">
              <Icon name="copy" />
            </button>
          )}
        </div>
      </div>

      <div className="vault-row">
        <small>Senha</small>
        <div className="vault-val">
          <code className={shown === null ? 'dots' : ''}>{!a.tem_senha ? '—' : shown === null ? '••••••••••' : shown}</code>
          {a.tem_senha && (
            <>
              <button className="iconbtn" onClick={toggle} disabled={busy} aria-label={shown === null ? 'Mostrar senha' : 'Esconder senha'} title={shown === null ? 'Mostrar senha' : 'Esconder senha'}>
                {busy ? <span className="spin" /> : <Icon name={shown === null ? 'eye' : 'eye_off'} />}
              </button>
              <button className="iconbtn" onClick={() => copySecret(() => (shown !== null ? Promise.resolve(shown) : reveal('copiar')), 'Senha')} aria-label="Copiar senha" title="Copiar senha">
                <Icon name="copy" />
              </button>
            </>
          )}
        </div>
      </div>

      {a.notas && <p className="vault-notes">{a.notas}</p>}
      <footer>
        Atualizado {timeLabel(a.updated_at)}
        {a.updated_by_name ? ` por ${a.updated_by_name}` : ''}
      </footer>
    </article>
  );
}

export default function Acessos() {
  const can = useCan();
  const editable = can('acessos.editar');
  const [list, setList] = useState<Acesso[] | null>(null);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('');
  const [edit, setEdit] = useState<Partial<Acesso> | null | false>(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    try {
      setList(await api('/api/acessos', 'GET'));
    } catch (e: any) {
      toast(e.message);
      setList([]);
    }
  };
  useEffect(() => {
    load();
    const k = (e: KeyboardEvent) => {
      if (e.key === '/' && !(e.target as HTMLElement)?.closest('input,textarea')) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, []);

  const cats = useMemo(() => Array.from(new Set((list || []).map((a) => a.categoria || 'Geral'))).sort(byName), [list]);
  const shown = useMemo(() => {
    const n = norm(q);
    return (list || []).filter((a) => (!cat || (a.categoria || 'Geral') === cat) && (!n || norm([a.nome, a.categoria, a.usuario, a.url, a.notas].filter(Boolean).join(' ')).includes(n)));
  }, [list, q, cat]);
  const columns = useMemo(() => {
    const m = new Map<string, Acesso[]>();
    for (const a of shown) {
      const k = a.categoria || 'Geral';
      m.set(k, [...(m.get(k) || []), a]);
    }
    return Array.from(m.entries())
      .sort((x, y) => byName(x[0], y[0]))
      .map(([k, items]) => [k, items.sort((x, y) => byName(x.nome, y.nome))] as const);
  }, [shown]);

  async function remove(a: Acesso) {
    try {
      await api(`/api/acessos/${a.id}`, 'DELETE');
      toast('Acesso apagado');
      load();
    } catch (e: any) {
      toast(e.message);
    }
  }

  return (
    <>
      <PageHead title="Acessos" sub="Usuários, senhas e links da equipe, num lugar só e protegidos" icon="key" help="acessos">
        {editable && (
          <button className="btn btn-p btn-sm" onClick={() => setEdit(null)}>
            <Icon name="plus" />
            Novo acesso
          </button>
        )}
      </PageHead>

      <div className="vault-top">
        <div className="vault-search">
          <Icon name="search" />
          <input ref={searchRef} className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar plataforma, usuário, link ou classificação…  ( / )" aria-label="Buscar acessos" />
        </div>
        <div className="chips">
          <button className="chip" onClick={() => setCat('')} style={{ cursor: 'pointer', ['--t' as any]: !cat ? 'var(--accent)' : 'var(--muted)', background: !cat ? undefined : 'transparent' }}>
            Todas · {(list || []).length}
          </button>
          {cats.map((c) => (
            <button key={c} className="chip" onClick={() => setCat(cat === c ? '' : c)} style={{ cursor: 'pointer', ['--t' as any]: cat === c ? 'var(--accent)' : 'var(--muted)', background: cat === c ? undefined : 'transparent' }}>
              {c} · {(list || []).filter((a) => (a.categoria || 'Geral') === c).length}
            </button>
          ))}
        </div>
      </div>

      {list === null ? (
        <p className="muted">Carregando…</p>
      ) : list.length === 0 ? (
        <div className="card vault-empty">
          <Icon name="key" />
          <h2>Nenhum acesso cadastrado ainda</h2>
          <p className="muted">Guarde aqui os logins da agência (Instagram, Canva, Hostinger, Google…) para toda a equipe usar sem ficar pedindo senha no WhatsApp.</p>
          {editable && (
            <button className="btn btn-p" onClick={() => setEdit(null)}>
              <Icon name="plus" />
              Cadastrar o primeiro
            </button>
          )}
        </div>
      ) : columns.length === 0 ? (
        <p className="muted">Nada encontrado para “{q}”.</p>
      ) : (
        <div className="vault-board">
          {columns.map(([c, items]) => (
            <section key={c} className="vault-col" aria-label={c}>
              <h3>
                {c} <span>{items.length}</span>
              </h3>
              {items.map((a) => (
                <Card key={a.id} a={a} editable={editable} onEdit={() => setEdit(a)} onDelete={() => remove(a)} />
              ))}
            </section>
          ))}
        </div>
      )}
      <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>
        🔒 As senhas ficam criptografadas no servidor e só aparecem quando alguém clica no olhinho ou em copiar. Fica registrado quem viu.
      </p>

      {edit !== false && (
        <Editor
          item={edit}
          cats={cats}
          onClose={() => setEdit(false)}
          onSaved={() => {
            setEdit(false);
            load();
          }}
        />
      )}
    </>
  );
}
