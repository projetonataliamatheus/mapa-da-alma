'use client';
/* Vendas › Mapas e preços: preço da passagem da versão simples para a completa (com as pirâmides). */
import { useEffect, useState } from 'react';
import { Icon, Ib } from '@/components/Icon';
import { toast, api } from '@/components/ui';
import { UPGRADE_PADRAO, type ConfigUpgrade } from '@/lib/mapa-alma/upgrade';

export function ConfigUpgradeCard() {
  const [c, setC] = useState<ConfigUpgrade | null>(null);
  useEffect(() => {
    api('/api/settings', 'GET').then((s: any) => setC({ ...UPGRADE_PADRAO, ...(s.mapa_upgrade || {}) })).catch(() => setC(UPGRADE_PADRAO));
  }, []);
  if (!c) return null;
  async function salvar(n: ConfigUpgrade) {
    setC(n);
    try {
      await api('/api/settings', 'PATCH', { mapa_upgrade: n });
      toast('Passagem para a versão completa salva');
    } catch (e: any) {
      toast(e.message);
    }
  }
  const op = (m: ConfigUpgrade['modo'], t: string, d: string) => (
    <label className={'up-op' + (c.modo === m ? ' on' : '')}>
      <input type="radio" name="upmodo" checked={c.modo === m} onChange={() => salvar({ ...c, modo: m })} />
      <span><b>{t}</b><small>{d}</small></span>
    </label>
  );
  return (
    <div className="card">
      <div className="card-h">
        <Ib name="star" tone="ai" size="sm" />
        <h2>Passagem da versão simples para a completa</h2>
      </div>
      <p className="muted" style={{ fontSize: 13, marginTop: 0 }}>Quem comprou o mapa simples pode liberar depois as pirâmides do nome (versão completa), no mesmo link. Escolha quanto a IA cobra por essa passagem:</p>
      <div className="up-ops">
        {op('diferenca', 'Só a diferença', 'Preço da completa menos o que a pessoa já pagou na simples (mínimo R$ 5).')}
        {op('fixo', 'Valor fixo', 'Um valor que você define para todo mundo.')}
        {op('cheio', 'Preço cheio', 'Paga o preço normal da versão completa.')}
      </div>
      {c.modo === 'fixo' && (
        <div className="field" style={{ marginTop: 10, maxWidth: 220 }}>
          <label htmlFor="upv">Valor da passagem (R$)</label>
          <input id="upv" className="input" type="number" min={1} step="0.01" defaultValue={c.valor || 15} onBlur={(e) => salvar({ ...c, valor: Number(e.target.value) || 15 })} />
        </div>
      )}
      <style>{`.up-ops{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:8px}.up-op{display:flex;gap:10px;align-items:flex-start;border:1.5px solid var(--line);border-radius:12px;padding:10px 12px;cursor:pointer}.up-op.on{border-color:var(--ai);background:color-mix(in srgb,var(--ai) 7%,transparent)}.up-op b{display:block;font-size:14px}.up-op small{color:var(--muted);font-size:12px}`}</style>
    </div>
  );
}
