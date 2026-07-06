// Scheduler que envia un correo diario a todos los jugadores con
// los partidos del dia y las predicciones de cada uno.
//
// Se dispara cada 5 min. Si son las 08:00-08:04 hora Madrid Y no
// se ha enviado hoy, procesa. La marca de "enviado hoy" se persiste
// en /app/data/last-daily-email.txt para sobrevivir reinicios.

import fs from 'fs';
import path from 'path';
import prisma from '../../lib/prisma.js';
import { sendDailyPredictionsEmail } from '../../lib/email.js';

const MARKER_FILE = '/app/data/last-daily-email.txt';
const TARGET_HOUR_MADRID = 8;

let intervalId: ReturnType<typeof setInterval> | null = null;

function madridDateParts(now: Date): { yyyymmdd: string; hour: number; minute: number } {
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Madrid',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  });
  const parts = fmt.formatToParts(now);
  const p: Record<string, string> = {};
  for (const x of parts) p[x.type] = x.value;
  return {
    yyyymmdd: `${p.year}-${p.month}-${p.day}`,
    hour: parseInt(p.hour, 10),
    minute: parseInt(p.minute, 10),
  };
}

function readLastSent(): string | null {
  try {
    return fs.readFileSync(MARKER_FILE, 'utf8').trim();
  } catch { return null; }
}

function writeLastSent(yyyymmdd: string) {
  try {
    fs.mkdirSync(path.dirname(MARKER_FILE), { recursive: true });
    fs.writeFileSync(MARKER_FILE, yyyymmdd, 'utf8');
  } catch (err) {
    console.error('[DailyEmail] No se pudo escribir marker:', err);
  }
}

/**
 * Devuelve los partidos KO cuyo kickoffAt cae en el dia Madrid `yyyymmdd`
 * (con predicciones de todos los jugadores).
 */
async function getMatchesForDay(yyyymmdd: string) {
  const teams = await prisma.team.findMany();
  const tm = new Map(teams.map(t => [t.id, { code: t.code, name: t.name }]));

  const matches = await prisma.match.findMany({
    where: { stage: 'KNOCKOUT' },
    orderBy: { kickoffAt: 'asc' },
  });
  const matchesToday = matches.filter(m => {
    const { yyyymmdd: matchDay } = madridDateParts(m.kickoffAt);
    return matchDay === yyyymmdd;
  });

  const result = [];
  for (const m of matchesToday) {
    const preds = await prisma.bracketPrediction.findMany({
      where: { matchId: m.id },
      include: { user: { select: { name: true, alias: true } } },
      orderBy: { pointsEarned: 'desc' },
    });
    const kickoffFmt = new Intl.DateTimeFormat('es-ES', {
      timeZone: 'Europe/Madrid', hour: '2-digit', minute: '2-digit', hour12: false,
    });
    result.push({
      matchNumber: m.matchNumber,
      round: m.round,
      stage: m.stage,
      kickoffMadrid: kickoffFmt.format(m.kickoffAt) + ' h',
      homeTeam: m.homeTeamId ? tm.get(m.homeTeamId) ?? null : null,
      awayTeam: m.awayTeamId ? tm.get(m.awayTeamId) ?? null : null,
      predictions: preds.map(pr => ({
        userName: pr.user.alias || pr.user.name,
        homeGoals: pr.homeGoals,
        awayGoals: pr.awayGoals,
        winnerCode: pr.winnerTeamId ? tm.get(pr.winnerTeamId)?.code ?? null : null,
        wentToPenalties: pr.wentToPenalties,
      })),
    });
  }
  return result;
}

async function runDailyEmailJob(force = false, forceDate?: string): Promise<{ sent: number; matches: number }> {
  const yyyymmdd = forceDate || madridDateParts(new Date()).yyyymmdd;
  const matches = await getMatchesForDay(yyyymmdd);
  if (matches.length === 0) {
    console.log(`[DailyEmail] No hay partidos KO el ${yyyymmdd}, no se envia nada`);
    if (!force) writeLastSent(yyyymmdd);
    return { sent: 0, matches: 0 };
  }

  const dateLabel = new Intl.DateTimeFormat('es-ES', {
    timeZone: 'Europe/Madrid',
    weekday: 'long', day: 'numeric', month: 'long',
  }).format(new Date(yyyymmdd + 'T12:00:00Z'));

  const users = await prisma.user.findMany({
    where: { role: { not: 'ADMIN' }, email: { not: '' } },
    select: { email: true, name: true, alias: true },
  });

  let sent = 0;
  for (const u of users) {
    try {
      await sendDailyPredictionsEmail(u.email, u.alias || u.name, dateLabel, matches);
      sent++;
    } catch (err) {
      console.error(`[DailyEmail] Fallo enviando a ${u.email}:`, err instanceof Error ? err.message : err);
    }
  }

  if (!force) writeLastSent(yyyymmdd);
  console.log(`[DailyEmail] Enviados ${sent}/${users.length} correos para ${yyyymmdd} (${matches.length} partidos)`);
  return { sent, matches: matches.length };
}

export function startDailyEmailScheduler(intervalMinutes = 5) {
  console.log(`[DailyEmail] Scheduler activo, chequeando cada ${intervalMinutes} min. Envio programado ~08:00 Madrid.`);
  intervalId = setInterval(async () => {
    try {
      const { yyyymmdd, hour, minute } = madridDateParts(new Date());
      if (hour !== TARGET_HOUR_MADRID || minute >= intervalMinutes) return;
      const last = readLastSent();
      if (last === yyyymmdd) return;
      console.log(`[DailyEmail] Disparando envio para ${yyyymmdd}...`);
      await runDailyEmailJob();
    } catch (err) {
      console.error('[DailyEmail] Error en tick:', err);
    }
  }, intervalMinutes * 60 * 1000);
}

export function stopDailyEmailScheduler() {
  if (intervalId) { clearInterval(intervalId); intervalId = null; }
}

// Para el boton admin de envio manual
export async function triggerDailyEmailNow(forceDate?: string) {
  return runDailyEmailJob(true, forceDate);
}
