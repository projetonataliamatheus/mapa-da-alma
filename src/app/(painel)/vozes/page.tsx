'use client';
import { useEffect, useState } from 'react';
import { PageHead } from '@/components/PageHead';
import { Icon } from '@/components/Icon';
import { api, toast } from '@/components/ui';
import { VoiceSettings } from '@/components/VoiceSettings';

/** Vozes da equipe: cada áudio enviado aqui vira uma voz na ElevenLabs (pela API), com o nome do atendente. */
export default function Vozes() {
  const [s, setS] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    api('/api/settings', 'GET').then(setS).catch((e) => toast(e.message));
  }, []);
  if (!s) return <div className="spin" />;
  const set = (path: string, v: any) => {
    const next = JSON.parse(JSON.stringify(s));
    const keys = path.split('.');
    let o = next;
    keys.slice(0, -1).forEach((k) => (o = o[k] = o[k] || {}));
    o[keys[keys.length - 1]] = v;
    setS(next);
  };
  async function save() {
    setBusy(true);
    try {
      setS(await api('/api/settings', 'PATCH', { voice: s.voice }));
      toast('Configurações de voz salvas');
    } catch (e: any) {
      toast(e.message);
    }
    setBusy(false);
  }
  return (
    <>
      <PageHead title="Vozes (ElevenLabs)" sub="Grave ou envie o áudio de cada atendente: a voz é criada direto na ElevenLabs com o nome dele" icon="mic" tone="ai" help="horarios">
        <button className="btn btn-p" onClick={save} disabled={busy}>
          <Icon name="check" />
          {busy ? 'Salvando…' : 'Salvar'}
        </button>
      </PageHead>
      <div style={{ maxWidth: 820 }}>
        <VoiceSettings s={s} set={set} />
      </div>
    </>
  );
}
