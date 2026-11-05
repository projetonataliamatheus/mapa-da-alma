import { NextResponse } from 'next/server';
import os from 'os';
import fs from 'fs';
import { withUser } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

type Amostra = { t: number; cpu: number; mem: number; memPct: number; load: number };
const g = globalThis as any;
if (!g.__usoSistema) g.__usoSistema = { hist: [] as Amostra[], ultCpu: null as null | { u: number; t: number }, timer: null as any };
const S = g.__usoSistema;

const lerNum = (p: string) => { try { const v = fs.readFileSync(p, 'utf8').trim(); return v === 'max' ? NaN : Number(v); } catch { return NaN; } };
function cpuUsoUs() {
  try { const m = fs.readFileSync('/sys/fs/cgroup/cpu.stat', 'utf8').match(/usage_usec\s+(\d+)/); if (m) return Number(m[1]); } catch {}
  const n = lerNum('/sys/fs/cgroup/cpuacct/cpuacct.usage');
  return Number.isFinite(n) ? n / 1000 : NaN;
}
function amostrar(): Amostra {
  const agora = Date.now();
  const us = cpuUsoUs();
  let cpu = 0;
  const cores = os.cpus().length || 1;
  if (Number.isFinite(us)) {
    if (S.ultCpu) { const dt = (agora - S.ultCpu.t) * 1000; if (dt > 0) cpu = Math.max(0, Math.min(100 * cores, ((us - S.ultCpu.u) / dt) * 100)); }
    S.ultCpu = { u: us, t: agora };
  } else {
    const pc = process.cpuUsage(); const u = pc.user + pc.system;
    if (S.ultCpu) { const dt = (agora - S.ultCpu.t) * 1000; if (dt > 0) cpu = Math.max(0, ((u - S.ultCpu.u) / dt) * 100); }
    S.ultCpu = { u, t: agora };
  }
  const memCg = lerNum('/sys/fs/cgroup/memory.current');
  const limCg = lerNum('/sys/fs/cgroup/memory.max');
  const mem = Number.isFinite(memCg) ? memCg : process.memoryUsage().rss;
  const total = Number.isFinite(limCg) && limCg < os.totalmem() * 2 ? limCg : os.totalmem();
  const a = { t: agora, cpu: Math.round(cpu * 10) / 10, mem: Math.round(mem / 1048576), memPct: Math.round((mem / total) * 1000) / 10, load: Math.round(os.loadavg()[0] * 100) / 100 };
  S.hist.push(a);
  if (S.hist.length > 360) S.hist.shift();
  return a;
}
if (!S.timer) { S.timer = setInterval(amostrar, 10_000); S.timer.unref?.(); }

/** Uso do servidor onde o sistema roda (somente leitura): CPU, memória e carga, com histórico recente. */
export const GET = withUser(async () => {
  const agora = amostrar();
  const limCg = lerNum('/sys/fs/cgroup/memory.max');
  const memTotal = Math.round((Number.isFinite(limCg) && limCg < os.totalmem() * 2 ? limCg : os.totalmem()) / 1048576);
  return NextResponse.json({
    agora, hist: S.hist, cores: os.cpus().length, memTotalMB: memTotal, memLivreMB: Math.round(os.freemem() / 1048576),
    uptimeApp: Math.round(process.uptime()), uptimeServidor: Math.round(os.uptime()), node: process.version, geradoEm: new Date().toISOString(),
  });
}, { master: true });
