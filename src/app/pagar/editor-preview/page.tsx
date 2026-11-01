'use client';
/* Prévia ao vivo usada dentro do Editor visual (recebe o design por mensagem do painel). */
import { useEffect, useState } from 'react';
import { Checkout, CheckoutData, DemoView } from '../[slug]/Checkout';
import '../checkout.css';

export default function EditorPreview() {
  const [state, setState] = useState<{ data: CheckoutData; demo: DemoView; sel: string | null } | null>(null);

  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (e.origin !== window.location.origin || e.data?.type !== 'ck-state') return;
      setState({ data: e.data.data, demo: e.data.demo, sel: e.data.sel });
    };
    window.addEventListener('message', onMsg);
    window.parent?.postMessage({ type: 'ck-ready' }, window.location.origin);
    return () => window.removeEventListener('message', onMsg);
  }, []);

  if (!state) return <div style={{ padding: 40, fontFamily: 'system-ui', color: '#6b7484' }}>Carregando prévia…</div>;
  const post = (msg: any) => window.parent?.postMessage(msg, window.location.origin);
  return (
    <Checkout
      key={state.demo}
      data={state.data}
      demo={state.demo}
      edit={{
        sel: state.sel,
        onSel: (k) => post({ type: 'ck-select', k }),
        onText: (k, v) => post({ type: 'ck-text', k, v }),
        onMove: (from, to) => post({ type: 'ck-move', from, to }),
      }}
    />
  );
}
