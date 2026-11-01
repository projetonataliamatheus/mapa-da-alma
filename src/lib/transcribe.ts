/** Transcrição de áudios do WhatsApp (Groq Whisper). */
export async function transcribe(base64: string, mimetype = 'audio/ogg'): Promise<string | null> {
  const key = process.env.GROQ_API_KEY;
  if (!key || !base64) return null;
  try {
    const type = mimetype.split(';')[0] || 'audio/ogg';
    const ext = type.includes('mp4') ? 'm4a' : type.includes('mpeg') ? 'mp3' : 'ogg';
    const fd = new FormData();
    fd.append('file', new Blob([Buffer.from(base64, 'base64')], { type }), 'audio.' + ext);
    fd.append('model', 'whisper-large-v3');
    fd.append('language', 'pt');
    fd.append('response_format', 'json');
    const r = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    signal: AbortSignal.timeout(60_000),
      method: 'POST',
      headers: { Authorization: `Bearer ${key}` },
      body: fd,
    });
    if (!r.ok) {
      console.error('Transcrição falhou', r.status, (await r.text()).slice(0, 200));
      return null;
    }
    const j = await r.json();
    return (j.text || '').trim() || null;
  } catch (e) {
    console.error('Transcrição falhou', e);
    return null;
  }
}
