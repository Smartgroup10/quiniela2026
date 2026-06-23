// Generador del bracket de eliminatorias (Fase 2)
// Crea los 32 partidos de KO (R32, R16, QF, SF, 3er puesto, Final).

import prisma from '../../lib/prisma.js';

const GROUPS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];

interface RoundSpec {
  round: 'R32' | 'R16' | 'QF' | 'SF' | 'THIRD_PLACE' | 'FINAL';
  count: number;
  daysOffsetFromKickoff: number; // dias desde la fecha inicial
}

const STRUCTURE: RoundSpec[] = [
  { round: 'R32', count: 16, daysOffsetFromKickoff: 0 },
  { round: 'R16', count: 8, daysOffsetFromKickoff: 4 },
  { round: 'QF', count: 4, daysOffsetFromKickoff: 8 },
  { round: 'SF', count: 2, daysOffsetFromKickoff: 12 },
  { round: 'THIRD_PLACE', count: 1, daysOffsetFromKickoff: 15 },
  { round: 'FINAL', count: 1, daysOffsetFromKickoff: 16 },
];

export interface GenerateResult {
  created: number;
  deleted: number;
  matchesByRound: Record<string, number>;
  teamsAssigned: number;
  testDataUsed: boolean;
}

export async function generateKnockoutBracket(opts: {
  startKickoff: Date;
  withTestData?: boolean;
}): Promise<GenerateResult> {
  const { startKickoff, withTestData = false } = opts;

  // 1. Borrar bracketPredictions existentes y luego los partidos KO
  const existingKo = await prisma.match.findMany({ where: { stage: 'KNOCKOUT' }, select: { id: true } });
  let deleted = 0;
  if (existingKo.length > 0) {
    await prisma.bracketPrediction.deleteMany({ where: { matchId: { in: existingKo.map(m => m.id) } } });
    const d = await prisma.match.deleteMany({ where: { stage: 'KNOCKOUT' } });
    deleted = d.count;
  }

  // 2. Determinar matchNumber inicial (siguiente al ultimo)
  const last = await prisma.match.findFirst({ orderBy: { matchNumber: 'desc' }, select: { matchNumber: true } });
  let nextMatchNum = (last?.matchNumber ?? 0) + 1;

  // 3. Preparar equipos clasificados (si los hay)
  // Si withTestData=true, los inventamos a partir del orden alfabetico de equipos por grupo.
  let qualified: string[] = []; // 32 teamIds en orden de seed
  const teams = await prisma.team.findMany();
  if (withTestData) {
    const byGroup = new Map<string, typeof teams>();
    for (const t of teams) {
      if (!t.groupKey) continue;
      const arr = byGroup.get(t.groupKey) || [];
      arr.push(t);
      byGroup.set(t.groupKey, arr);
    }
    // Top 2 de cada grupo (alfabetico) -> 24 equipos
    const firsts: string[] = [];
    const seconds: string[] = [];
    for (const g of GROUPS) {
      const ts = (byGroup.get(g) || []).sort((a, b) => a.code.localeCompare(b.code));
      if (ts[0]) firsts.push(ts[0].id);
      if (ts[1]) seconds.push(ts[1].id);
    }
    // 8 mejores terceros (orden alfabetico de grupos: A..H)
    const thirds: string[] = [];
    for (const g of GROUPS.slice(0, 8)) {
      const ts = (byGroup.get(g) || []).sort((a, b) => a.code.localeCompare(b.code));
      if (ts[2]) thirds.push(ts[2].id);
    }
    qualified = [...firsts, ...seconds, ...thirds].slice(0, 32);
  } else {
    const clasificadosFinal = teams
      .filter(t => t.realFinalPosition === 1 || t.realFinalPosition === 2)
      .sort((a, b) => (a.groupKey || '').localeCompare(b.groupKey || '') ||
                       (a.realFinalPosition ?? 0) - (b.realFinalPosition ?? 0));
    const mejoresTerceros = teams
      .filter(t => t.realBestThird)
      .sort((a, b) => (a.groupKey || '').localeCompare(b.groupKey || ''));
    qualified = [...clasificadosFinal.map(t => t.id), ...mejoresTerceros.map(t => t.id)].slice(0, 32);
  }

  const teamsAssigned = qualified.length;

  // 4. Crear partidos
  const matchesByRound: Record<string, number> = {};
  let totalCreated = 0;

  for (const spec of STRUCTURE) {
    matchesByRound[spec.round] = spec.count;
    const baseDate = new Date(startKickoff.getTime() + spec.daysOffsetFromKickoff * 24 * 60 * 60 * 1000);

    for (let i = 0; i < spec.count; i++) {
      const kickoffAt = new Date(baseDate.getTime() + (i % 4) * 3 * 60 * 60 * 1000); // 4 partidos por dia, cada 3h

      let homeTeamId: string | null = null;
      let awayTeamId: string | null = null;

      // Solo R32 puede tener equipos asignados desde el principio (si hay 32 clasificados)
      if (spec.round === 'R32' && qualified.length === 32) {
        // Esquema simple: pareja por orden 0vs1, 2vs3, ..., 30vs31
        homeTeamId = qualified[i * 2];
        awayTeamId = qualified[i * 2 + 1];
      }

      await prisma.match.create({
        data: {
          stage: 'KNOCKOUT',
          round: spec.round,
          matchNumber: nextMatchNum++,
          kickoffAt,
          homeTeamId,
          awayTeamId,
          status: 'SCHEDULED',
        },
      });
      totalCreated++;
    }
  }

  return {
    created: totalCreated,
    deleted,
    matchesByRound,
    // Solo R32 lleva equipos en el seedeo inicial; si hay 32 clasificados, los 32 estan asignados.
    teamsAssigned: qualified.length === 32 ? 32 : 0,
    testDataUsed: withTestData,
  };
}
