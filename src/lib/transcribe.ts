/** Transcrição de áudios (Groq Whisper) com detecção automática do idioma (português × espanhol). */
export type Transcricao = { texto: string; idioma: 'pt' | 'es' | null }

async function chamar(base64: string, type: string, language?: string): Promise<{ text: string; language: string } | null> {
  const key = process.env.GROQ_API_KEY
  if (!key || !base64) return null
  const ext = type.includes('mp4') ? 'm4a' : type.includes('mpeg') ? 'mp3' : type.includes('wav') ? 'wav' : 'ogg'
  const fd = new FormData()
  fd.append('file', new Blob([Buffer.from(base64, 'base64')], { type }), 'audio.' + ext)
  fd.append('model', 'whisper-large-v3')
  if (language) fd.append('language', language)
  fd.append('response_format', 'verbose_json')
  const r = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', { method: 'POST', headers: { Authorization: `Bearer ${key}` }, body: fd, signal: AbortSignal.timeout(60_000) })
  if (!r.ok) { console.error('Transcrição falhou', r.status, (await r.text()).slice(0, 200)); return null }
  const j = await r.json()
  return { text: String(j.text || '').trim(), language: String(j.language || '').toLowerCase() }
}

const LANG: Record<string, 'pt' | 'es'> = { portuguese: 'pt', pt: 'pt', spanish: 'es', es: 'es', castilian: 'es' }

/**
 * Transcreve SEM forçar idioma: o próprio áudio decide (um áudio em espanhol vira texto em espanhol; em português, em português).
 * `dica` (idioma do contato/fluxo) só entra se a detecção sair em outro idioma que não pt/es (ruído, áudio curto).
 */
export async function transcribeIdioma(base64: string, mimetype = 'audio/ogg', dica: 'pt' | 'es' = 'pt'): Promise<Transcricao | null> {
  try {
    const type = mimetype.split(';')[0] || 'audio/ogg'
    const a = await chamar(base64, type)
    if (!a) return null
    const det = LANG[a.language] || null
    if (det && a.text) return { texto: a.text, idioma: det }
    const b = await chamar(base64, type, dica)
    if (!b || !b.text) return a.text ? { texto: a.text, idioma: null } : null
    return { texto: b.text, idioma: dica }
  } catch (e) {
    console.error('Transcrição falhou', e)
    return null
  }
}

export async function transcribe(base64: string, mimetype = 'audio/ogg', dica: 'pt' | 'es' | string = 'pt'): Promise<string | null> {
  return (await transcribeIdioma(base64, mimetype, dica === 'es' ? 'es' : 'pt'))?.texto || null
}
