/** Fase de aquecimento e limite diário de cada número (usado pelo robô e pelo painel). */
export function phaseOf(number: { phase_started_at: string }) {
  const days = (Date.now() - new Date(number.phase_started_at).getTime()) / 86400000;
  if (days < 7) return { key: 'week1', label: 'Aquecimento (semana 1)' };
  if (days < 21) return { key: 'week2', label: 'Semanas 2 e 3' };
  return { key: 'mature', label: 'Maduro' };
}

export function dailyLimit(number: { phase_started_at: string }, limits: { week1: number; week2: number; mature: number }) {
  return (limits as any)[phaseOf(number).key] as number;
}
