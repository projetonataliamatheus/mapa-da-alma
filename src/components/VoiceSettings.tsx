'use client';
import { useEffect, useRef, useState } from 'react';
import { Icon, Ib } from './Icon';
import { Switch, api, toast } from './ui';

/** Vozes da equipe (ElevenLabs) e regras de quando a IA responde em áudio. Fica em Configurações. */
export function VoiceSettings({ s, set }: { s: any; set: (path: string, v: any) => void }) {
  const v = s.voice || {};
  const [info, setInfo] = useState<any>(null);
  const [name, setName] = useState('');
  const [member, setMember] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [consent, setConsent] = useState(false);
  const [denoise, setDenoise] = useState(false);
  const [addTo, setAddTo] = useState('');
  const [remote, setRemote] = useState<any[] | null>(null);
  const [remoteAll, setRemoteAll] = useState(false);
  const [remoteBusy, setRemoteBusy] = useState(false);
  async function loadRemote(all = remoteAll) {
    setRemoteBusy(true);
    try {
      const r = await api('/api/voices', 'PATCH', { action: 'remote', all });
      setRemote(r.voices || []);
    } catch (e: any) {
      toast(e.message);
    }
    setRemoteBusy(false);
  }
  async function importVoice(x: any) {
    try {
      await api('/api/voices', 'PATCH', { action: 'import', voice_id: x.voice_id, name: x.name });
      toast(`Voz "${x.name}" trazida para o painel`);
      setRemote((list) => (list || []).map((y) => (y.voice_id === x.voice_id ? { ...y, imported: true } : y)));
      load();
    } catch (e: any) {
      toast(e.message);
    }
  }
  const [busy, setBusy] = useState(false);
  const [rec, setRec] = useState<MediaRecorder | null>(null);
  const [secs, setSecs] = useState(0);
  const [testText, setTestText] = useState('');
  const [playing, setPlaying] = useState<string | null>(null);
  const [delId, setDelId] = useState<string | null>(null);
  const timer = useRef<any>(null);

  async function load() {
    try {
      setInfo(await api('/api/voices', 'GET'));
    } catch (e: any) {
      toast(e.message);
    }
  }
  useEffect(() => {
    load();
  }, []);

  async function startRec() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const type = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm'].find((t) => (window as any).MediaRecorder?.isTypeSupported?.(t)) || '';
      const r = new MediaRecorder(stream, type ? { mimeType: type } : undefined);
      const parts: Blob[] = [];
      r.ondataavailable = (e) => e.data.size && parts.push(e.data);
      r.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        clearInterval(timer.current);
        const mt = r.mimeType || 'audio/webm';
        const ext = mt.includes('mp4') ? 'm4a' : 'webm';
        setFiles((f) => [...f, new File([new Blob(parts, { type: mt })], `gravacao-${f.length + 1}.${ext}`, { type: mt })]);
        setRec(null);
      };
      r.start();
      setRec(r);
      setSecs(0);
      timer.current = setInterval(() => setSecs((x) => (x >= 150 ? (r.stop(), x) : x + 1)), 1000);
    } catch {
      toast('Não consegui acessar o microfone. Libere o microfone no navegador ou envie um arquivo de áudio.');
    }
  }

  async function create() {
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('name', name);
      fd.append('member', member);
      fd.append('consent', String(consent));
      fd.append('denoise', String(denoise));
      if (addTo) fd.append('voice', addTo);
      files.forEach((f) => fd.append('files', f));
      await api('/api/voices', 'POST', fd);
      toast(addTo ? 'Gravações adicionadas: a voz ficou mais fiel. Clique em Ouvir para comparar' : `Voz "${name}" criada`);
      setAddTo('');
      setName('');
      setMember('');
      setFiles([]);
      setConsent(false);
      load();
    } catch (e: any) {
      toast(e.message);
    }
    setBusy(false);
  }

  async function test(id: string) {
    setPlaying(id);
    try {
      // usa os ajustes da tela (mesmo antes de salvar) para comparar
      const r = await api('/api/voices', 'PATCH', { id, action: 'test', text: testText || undefined, override: { mode: v.mode || 'narracao', narr_stability: v.narr_stability, model: v.model, stability: v.stability, similarity: v.similarity, style: v.style, speed: v.speed } });
      await new Audio(r.audio).play();
    } catch (e: any) {
      toast(e.message);
    }
    setPlaying(null);
  }
  async function toggle(id: string, active: boolean) {
    try {
      await api('/api/voices', 'PATCH', { id, action: 'active', active });
      load();
    } catch (e: any) {
      toast(e.message);
    }
  }
  async function remove(id: string) {
    try {
      await api('/api/voices', 'DELETE', { id });
      setDelId(null);
      if (v.default_voice === id) set('voice.default_voice', null);
      load();
    } catch (e: any) {
      toast(e.message);
    }
  }

  const voices: any[] = info?.voices || [];
  return (
    <div className="card">
      <div className="card-h">
        <Ib name="mic" tone="ai" size="sm" />
        <h2>Respostas em áudio (voz da equipe)</h2>
      </div>
      {info && !info.configured && (
        <div className="alert" style={{ marginBottom: 10, borderColor: 'var(--warn)' }}>
          <Icon name="alert" className="status-warn" />
          <div style={{ fontSize: 13 }}>
            Falta a chave da ElevenLabs: crie em elevenlabs.io › Developers › API Keys e cole como <b className="mono">ELEVENLABS_API_KEY</b> no Easypanel (radar › painel › Ambiente) e clique em Implantar.
          </div>
        </div>
      )}
      {info?.missingTable && <p className="err" style={{ fontSize: 12.5, marginBottom: 8 }}>Rode a migração 015_vozes.sql no Supabase.</p>}

      <div className="setrow">
        <div className="tx">
          <b>Responder em áudio</b>
          <small>A IA manda áudio com a voz da conversa só em momentos especiais. Cada conversa fica com a mesma voz do começo ao fim.</small>
        </div>
        <div className="ctl">
          <Switch label="Ligado" checked={!!v.enabled} onChange={(x) => set('voice.enabled', x)} />
        </div>
      </div>
      <div className="setrow">
        <div className="tx">
          <b>Teto de áudios</b>
          <small>% das mensagens da IA (últimos 30 dias) e máximo por conversa</small>
        </div>
        <div className="ctl" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <input className="input num" style={{ width: 64 }} type="number" min={0} max={50} value={v.max_pct ?? 10} onChange={(e) => set('voice.max_pct', Number(e.target.value))} aria-label="Porcentagem máxima" />
          <span className="muted">%</span>
          <input className="input num" style={{ width: 64 }} type="number" min={0} max={10} value={v.max_per_conversation ?? 3} onChange={(e) => set('voice.max_per_conversation', Number(e.target.value))} aria-label="Máximo por conversa" />
          <span className="muted">por conversa</span>
        </div>
      </div>
      <div className="setrow">
        <div className="tx">
          <b>Voz padrão</b>
          <small>Para conversas que ainda não têm voz</small>
        </div>
        <div className="ctl">
          <select className="input" style={{ width: 180 }} value={v.default_voice || ''} onChange={(e) => set('voice.default_voice', e.target.value || null)} aria-label="Voz padrão">
            <option value="">A primeira ativa</option>
            {voices.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <p className="muted" style={{ fontSize: 12, margin: '6px 0 12px' }}>
        Lembre de clicar em <b>Salvar</b> depois de mudar estas opções. Uso do mês: {info?.month?.audios || 0} áudio(s), {(info?.month?.chars || 0).toLocaleString('pt-BR')} caracteres (~US$ {(info?.month?.usd || 0).toFixed(2)}). O Starter cobre ~30 mil caracteres no Multilingual v2 (~60 mil no Flash).
      </p>

      <div className="sect">
        <h3>Momentos em que a IA fala por áudio</h3>
      </div>
      <p className="muted" style={{ fontSize: 12.5, marginBottom: 8 }}>
        Áudios rápidos e fáceis, cada um uma vez por conversa. As frases fixas não gastam IA, e o mesmo áudio é reaproveitado (não gasta crédito de voz de novo). Uma frase por linha: o sistema sorteia uma. Use {'{atendente}'} para o nome da voz.
      </p>
      {(
        [
          ['boas_vindas', 'Boas-vindas a quem chega', 'Primeira resposta para quem mandou mensagem: um áudio curto dizendo que o atendimento está corrido e que pode ir deixando as dúvidas. Depois segue tudo em texto.', true],
          ['link_pagamento', 'Link de pagamento', 'Antes do link: "vou deixar o link aqui embaixo, assim que finalizar é só me avisar".', true],
          ['pagamento_confirmado', 'Pagamento confirmado', 'Agradecimento e próximo passo (logo e fotos) quando o pagamento cai.', true],
          ['fechamento', 'Fechamento', 'A IA escreve na hora um áudio curto do tipo "ficou com alguma dúvida? entendeu tudo certinho? bora fechar então?" (só uma vez, sem insistir).', false],
          ['cliente_audio', 'Cliente mandou áudio', 'A IA pode responder em áudio quando o cliente fala por áudio.', false],
        ] as [string, string, string, boolean][]
      ).map(([k, t, d, scripted]) => {
        const m = v.moments?.[k] || {};
        const on = typeof m.on === 'boolean' ? m.on : true;
        return (
          <div key={k} style={{ borderTop: '1px solid var(--line, #eee)', padding: '10px 0' }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <Switch label={t} checked={on} onChange={(x) => set(`voice.moments.${k}`, { ...m, on: x })} />
              <div style={{ flex: 1 }}>
                <b style={{ fontSize: 13.5 }}>{t}</b>
                <p className="muted" style={{ fontSize: 12.5 }}>{d}</p>
              </div>
            </div>
            {scripted && on && (
              <textarea
                className="input"
                style={{ minHeight: 80, fontSize: 13, marginTop: 6 }}
                value={(m.scripts || []).join('\n')}
                onChange={(e) => set(`voice.moments.${k}`, { ...m, on, scripts: e.target.value.split('\n') })}
                aria-label={`Frases de ${t}`}
              />
            )}
          </div>
        );
      })}

      <div className="sect">
        <h3>Qualidade e semelhança da voz</h3>
      </div>
      <p className="muted" style={{ fontSize: 12.5, marginBottom: 6 }}>Mude, clique em <b>Ouvir</b> na voz para comparar na hora e, quando gostar, clique em <b>Salvar</b>.</p>
      <div className="setrow">
        <div className="tx">
          <b>Modo de geração</b>
          <small>Narração (estilo audiobook) gera frase a frase mantendo o mesmo tom: não trava nem gagueja em respostas longas. Texto para fala é o modo rápido de antes. Ouça os dois e escolha.</small>
        </div>
        <div className="ctl">
          <div className="seg" role="group" aria-label="Modo de geração">
            <button type="button" aria-pressed={(v.mode || 'narracao') === 'narracao'} onClick={() => set('voice.mode', 'narracao')}>
              Narração (audiobook)
            </button>
            <button type="button" aria-pressed={v.mode === 'tts'} onClick={() => set('voice.mode', 'tts')}>
              Texto para fala
            </button>
          </div>
        </div>
      </div>
      <div className="setrow">
        <div className="tx">
          <b>Modelo</b>
          <small>Multilingual v2 é o mais fiel à voz clonada. Flash custa metade, mas parece menos com a pessoa.</small>
        </div>
        <div className="ctl">
          <select className="input" style={{ width: 220 }} value={v.model || 'eleven_multilingual_v2'} onChange={(e) => set('voice.model', e.target.value)} aria-label="Modelo de voz">
            <option value="eleven_multilingual_v2">Multilingual v2 (mais fiel) ★</option>
            <option value="eleven_v3">Eleven v3 (mais expressivo)</option>
            <option value="eleven_flash_v2_5">Flash v2.5 (mais barato)</option>
          </select>
        </div>
      </div>
      {(
        [
          ['similarity', 'Semelhança', 'Mais alto = mais parecido com a gravação (se ficar com chiado, baixe um pouco).', 0, 1, 0.05, 0.9],
          ['stability', 'Estabilidade', 'Mais baixo = mais emoção e variação; mais alto = mais constante (pode ficar monótono).', 0, 1, 0.05, 0.45],
          ['style', 'Estilo / exagero', 'Realça o jeito de falar da pessoa. Use pouco (0 a 0,3).', 0, 1, 0.05, 0.1],
          ['speed', 'Velocidade', '1 = normal. 0,9 mais calmo; 1,1 mais rápido.', 0.7, 1.2, 0.05, 1],
        ] as [string, string, string, number, number, number, number][]
      ).map(([k, t, d, min, max, step, def]) => (
        <div className="setrow" key={k}>
          <div className="tx">
            <b>{t}</b>
            <small>{d}</small>
          </div>
          <div className="ctl" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input type="range" min={min} max={max} step={step} value={v[k] ?? def} onChange={(e) => set('voice.' + k, Number(e.target.value))} aria-label={t} style={{ width: 150 }} />
            <b className="num" style={{ width: 36 }}>{Number(v[k] ?? def).toFixed(2)}</b>
          </div>
        </div>
      ))}

      <div className="sect" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <h3 style={{ flex: 1 }}>Trazer da ElevenLabs (Minhas vozes)</h3>
        <label style={{ display: 'inline-flex', gap: 6, alignItems: 'center', fontSize: 12.5 }}>
          <input
            type="checkbox"
            checked={remoteAll}
            onChange={(e) => {
              setRemoteAll(e.target.checked);
              if (remote) loadRemote(e.target.checked);
            }}
          />
          incluir vozes prontas da ElevenLabs
        </label>
        <button className="btn btn-sm" onClick={() => loadRemote()} disabled={remoteBusy || !info?.configured}>
          {remoteBusy ? <span className="spin" /> : <Icon name="refresh" />}
          {remote ? 'Atualizar lista' : 'Buscar minhas vozes'}
        </button>
      </div>
      {remote && (
        <div className="grid" style={{ gap: 6, marginBottom: 12, maxHeight: 320, overflow: 'auto' }}>
          {remote.length === 0 && <p className="muted" style={{ fontSize: 13 }}>Nenhuma voz sua na ElevenLabs ainda.</p>}
          {remote.map((x) => (
            <div key={x.voice_id} style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <b style={{ flex: 1, minWidth: 120 }}>
                {x.name} <small className="muted">· {x.category === 'cloned' ? 'clonada' : x.category === 'professional' ? 'profissional' : x.category === 'generated' ? 'criada' : x.category === 'premade' ? 'pronta' : x.category}</small>
              </b>
              {x.preview_url && (
                <button className="btn btn-sm btn-g" onClick={() => new Audio(x.preview_url).play().catch(() => toast('Não consegui tocar a amostra'))}>
                  <Icon name="play" /> Amostra
                </button>
              )}
              {x.imported ? (
                <span className="chip" style={{ ['--t' as any]: 'var(--ok)' }}>
                  no painel
                </span>
              ) : (
                <button className="btn btn-sm btn-p" onClick={() => importVoice(x)}>
                  <Icon name="plus" /> Trazer
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="sect">
        <h3>Vozes cadastradas</h3>
      </div>
      {voices.length === 0 ? (
        <p className="muted" style={{ fontSize: 13 }}>Nenhuma voz ainda. Grave ou envie 10 a 30 segundos abaixo.</p>
      ) : (
        <div className="grid" style={{ gap: 8, marginBottom: 10 }}>
          <input className="input" placeholder="Frase para testar (opcional)" value={testText} onChange={(e) => setTestText(e.target.value)} aria-label="Frase de teste" />
          {voices.map((x) => (
            <div key={x.id} style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <b style={{ flex: 1, minWidth: 120 }}>
                {x.name}
                {x.member ? <small className="muted"> · {x.member}</small> : null}
              </b>
              <button className="btn btn-sm" onClick={() => test(x.id)} disabled={playing === x.id || !info?.configured}>
                {playing === x.id ? <span className="spin" /> : <Icon name="play" />}
                Ouvir
              </button>
              <Switch label="Ativa" checked={x.active} onChange={(a) => toggle(x.id, a)} />
              {delId === x.id ? (
                <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                  <small>{x.provider === 'elevenlabs_import' ? 'Tirar do painel? (continua na ElevenLabs)' : 'Excluir a voz? (sai da ElevenLabs também)'}</small>
                  <button className="btn btn-sm" style={{ color: 'var(--bad)' }} onClick={() => remove(x.id)}>
                    Excluir
                  </button>
                  <button className="btn btn-sm btn-g" onClick={() => setDelId(null)}>
                    Não
                  </button>
                </span>
              ) : (
                <button className="iconbtn" aria-label={`Excluir ${x.name}`} onClick={() => setDelId(x.id)}>
                  <Icon name="trash" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="sect">
        <h3>Nova voz</h3>
      </div>
      <div className="grid" style={{ gap: 8 }}>
        <select className="input" value={addTo} onChange={(e) => setAddTo(e.target.value)} aria-label="Criar ou melhorar">
          <option value="">Criar uma voz nova</option>
          {voices.map((x) => (
            <option key={x.id} value={x.id}>
              Melhorar a voz {x.name} (adicionar mais gravações)
            </option>
          ))}
        </select>
        <div style={{ display: addTo ? 'none' : 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input className="input" style={{ flex: 1, minWidth: 140 }} placeholder="Nome da voz (ex.: Natália)" value={name} onChange={(e) => setName(e.target.value)} aria-label="Nome da voz" />
          <input className="input" style={{ flex: 1, minWidth: 140 }} placeholder="Quem gravou (opcional)" value={member} onChange={(e) => setMember(e.target.value)} aria-label="Quem gravou" />
        </div>
        <p className="muted" style={{ fontSize: 12.5 }}>
          Para ficar parecida de verdade: <b>1 a 3 minutos no total</b> (pode ser em vários áudios), lugar silencioso e sem eco, celular a um palmo da boca, falando do jeito que atende cliente (animado, com perguntas e pausas). Grave no gravador do celular (m4a/mp3/wav); o áudio do WhatsApp é muito comprimido e piora o resultado.
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          {rec ? (
            <button className="btn btn-sm" style={{ color: 'var(--bad)' }} onClick={() => rec.stop()}>
              <Icon name="pause" /> Parar ({secs}s)
            </button>
          ) : (
            <button className="btn btn-sm" onClick={startRec}>
              <Icon name="mic" /> Gravar agora
            </button>
          )}
          <label className="btn btn-sm" style={{ cursor: 'pointer' }}>
            <Icon name="upload" /> Enviar arquivo
            <input type="file" accept="audio/*" multiple hidden onChange={(e) => setFiles((f) => [...f, ...Array.from(e.target.files || [])].slice(0, 10))} />
          </label>
          {files.map((f, i) => (
            <span key={i} className="chip">
              {f.name}
              <button className="linkbtn" aria-label="Remover" onClick={() => setFiles((x) => x.filter((_, k) => k !== i))}>
                ×
              </button>
            </span>
          ))}
        </div>
        <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 13 }}>
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
          <span>A pessoa dona desta voz autorizou usar a voz dela nos atendimentos.</span>
        </label>
        <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 13 }}>
          <input type="checkbox" checked={denoise} onChange={(e) => setDenoise(e.target.checked)} />
          <span>Tirar barulho de fundo (só marque se a gravação tiver ruído; em gravação limpa deixa a voz menos parecida).</span>
        </label>
        <div>
          <button className="btn btn-p btn-sm" onClick={create} disabled={busy || (!addTo && !name.trim()) || !files.length || !consent || !info?.configured}>
            {busy ? <span className="spin" /> : <Icon name="check" />}
            {busy ? 'Enviando para a ElevenLabs…' : addTo ? 'Adicionar gravações' : 'Criar voz'}
          </button>
        </div>
      </div>
    </div>
  );
}
