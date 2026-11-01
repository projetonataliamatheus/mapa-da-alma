'use client';
import { useEffect, useState } from 'react';
import { PageHead } from '@/components/PageHead';
import { Icon, Ib } from '@/components/Icon';
import { Switch, api, toast } from '@/components/ui';
import { sb } from '@/lib/supabase/browser';

const ICON: Record<string, [string, string]> = { calma: ['chat', 'gg'], direta: ['bolt', 'bad'], aida: ['eye', 'ai'], pas: ['target', 'acc'] };
const pct = (a: number, b: number) => (b ? Math.round((a / b) * 1000) / 10 : 0);

function Card({ a, i, best, onSaved }: { a: any; i: number; best: boolean; onSaved: () => void }) {
  const [f, setF] = useState({ name: a.name, description: a.description || '', opening_example: a.opening_example || '', followup_example: a.followup_example || '', active: a.active, weight: a.weight });
  async function save(patch: any = {}) {
    const g = { ...f, ...patch };
    const { error } = await sb().from('approaches').update(g).eq('id', a.id);
    if (error) toast(error.message);
    else {
      toast('Salvo');
      onSaved();
    }
  }
  const ic = ICON[a.slug] || ['spark', 'acc'];
  return (
    <div className="card appr">
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <Ib name={ic[0]} tone={ic[1]} delay={i * 0.3} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2>{f.name}</h2>
          {best && <span className="lead-badge">Melhor conversão até agora</span>}
        </div>
        <Switch
          label={`Ativar ${f.name}`}
          checked={f.active}
          onChange={(v) => {
            setF({ ...f, active: v });
            save({ active: v });
          }}
        />
      </div>
      <div className="field">
        <label>Como a IA deve conduzir</label>
        <textarea className="input" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
      </div>
      <div className="field">
        <label>Exemplo de abertura</label>
        <textarea className="input" value={f.opening_example} onChange={(e) => setF({ ...f, opening_example: e.target.value })} />
      </div>
      <div className="field">
        <label>Exemplo de follow-up</label>
        <textarea className="input" value={f.followup_example} onChange={(e) => setF({ ...f, followup_example: e.target.value })} />
      </div>
      <div className="stat">
        <span>
          <b className="num">{a.sends}</b>envios
        </span>
        <span>
          <b className="num">{pct(a.replies, a.sends)}%</b>respondem
        </span>
        <span>
          <b className="num">{pct(a.sales, a.sends)}%</b>compram
        </span>
      </div>
      <div className="row-actions">
        <div className="field" style={{ width: 130 }}>
          <label>Peso manual (%)</label>
          <input className="input num" type="number" min={0} max={100} value={f.weight} onChange={(e) => setF({ ...f, weight: Number(e.target.value) })} />
        </div>
        <button data-perm="abordagens.editar" className="btn btn-p" style={{ alignSelf: 'end' }} onClick={() => save()}>
          <Icon name="check" />
          Salvar
        </button>
      </div>
    </div>
  );
}

export default function Abordagens() {
  const [list, setList] = useState<any[]>([]);
  const [auto, setAuto] = useState(true);
  const load = async () => {
    const [{ data }, { data: s }] = await Promise.all([sb().from('approaches').select('*').order('name'), sb().from('settings').select('data').eq('id', 1).maybeSingle()]);
    setList(data || []);
    setAuto(s?.data?.ab_auto !== false);
  };
  useEffect(() => {
    load();
  }, []);
  const best = list.filter((a) => a.sends >= 20).sort((a, b) => b.sales / b.sends - a.sales / a.sends)[0];
  async function toggleAuto(v: boolean) {
    setAuto(v);
    await api('/api/settings', 'PATCH', { ab_auto: v });
    toast(v ? 'Distribuição automática ligada' : 'Usando os pesos manuais');
  }
  return (
    <>
      <PageHead title="Abordagens" sub="Estilos de conversa em teste A/B. O sistema usa mais o que vende mais" icon="spark" tone="ai" help="abordagens" />
      <div data-perm="abordagens.editar" className="card" style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
        <Ib name="chat" tone="acc" size="lg" />
        <div style={{ flex: 1, minWidth: 220 }}>
          <h2>Regras de toda mensagem</h2>
          <p className="muted">No máximo 2 linhas, sempre terminando em pergunta, tom caloroso e atencioso. Nada de link na primeira mensagem. Se perguntarem se é robô, a IA diz que é a assistente da equipe.</p>
        </div>
        <label className="check">
          <Switch label="Distribuição automática" checked={auto} onChange={toggleAuto} />
          Distribuição automática
        </label>
      </div>
      <div className="grid g-3">
        {list.map((a, i) => (
          <Card key={a.id} a={a} i={i} best={best?.id === a.id} onSaved={load} />
        ))}
      </div>
    </>
  );
}
