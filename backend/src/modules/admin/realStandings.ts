// Calculo de standings REALES (no predichos) a partir de partidos FINISHED.
// Marca realFinalPosition / realClassified / realBestThird en Team
// y opcionalmente asigna equipos a los partidos R32 cuando los 32 clasificados estan definidos.

import prisma from '../../lib/prisma.js';

const GROUPS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];

interface Standing {
  teamId: string;
  points: number;
  goalDifference: number;
  goalsFor: number;
  played: number;
}

interface ThirdEntry extends Standing {
  groupKey: string;
}

export interface RealStandingsResult {
  groupsProcessed: number;
  groupsCompleted: number;
  teamsAssignedPosition: number;
  bestThirdsComputed: boolean;
  bestThirdTeamIds: string[];
  r32SeededCount: number;
}

export interface SeedBracketResult {
  groupsCompleted: number;
  bestThirdsComputed: boolean;
  r32SeededCount: number;
  r32SlotsPending: number;
}

/**
 * Siembra el R32 leyendo standings AL VUELO desde matches FINISHED,
 * sin escribir realFinalPosition/realClassified/realBestThird en Team.
 * Esto evita que cambien los puntos de Fase 1 hasta que el admin
 * decida marcar los grupos oficialmente.
 */
export async function seedR32FromFinishedGroups(): Promise<SeedBracketResult> {
  const teams = await prisma.team.findMany({ where: { groupKey: { not: null } } });
  const matches = await prisma.match.findMany({ where: { stage: 'GROUP' } });

  const teamById = new Map(teams.map(t => [t.id, t]));
  const teamsByGroup = new Map<string, typeof teams>();
  for (const t of teams) {
    const arr = teamsByGroup.get(t.groupKey!) || [];
    arr.push(t);
    teamsByGroup.set(t.groupKey!, arr);
  }

  const groupStandings = new Map<string, Standing[]>();
  let groupsCompleted = 0;

  for (const g of GROUPS) {
    const gTeams = teamsByGroup.get(g) || [];
    if (gTeams.length === 0) continue;
    const gMatches = matches.filter(m => {
      const home = teamById.get(m.homeTeamId || '');
      return home?.groupKey === g;
    });
    const finished = gMatches.filter(m => m.status === 'FINISHED');
    if (finished.length !== 6 || gMatches.length !== 6) continue;

    const standings = computeGroupStandings(gTeams.map(t => t.id), finished as any);
    groupStandings.set(g, standings);
    groupsCompleted++;
  }

  // Mejores terceros solo cuando los 12 grupos terminen
  let bestThirds: ThirdEntry[] = [];
  const bestThirdsComputed = groupsCompleted === 12;
  if (bestThirdsComputed) {
    const thirds: ThirdEntry[] = [];
    for (const g of GROUPS) {
      const st = groupStandings.get(g);
      if (!st || st.length < 3) continue;
      thirds.push({ ...st[2], groupKey: g });
    }
    thirds.sort((a, b) =>
      b.points - a.points ||
      b.goalDifference - a.goalDifference ||
      b.goalsFor - a.goalsFor,
    );
    bestThirds = thirds.slice(0, 8);
  }

  // Construir lista de 32 slots: [1A..1L, 2A..2L, 3T1..3T8]
  // Cualquier slot que no este definido aun queda en null.
  const slots: (string | null)[] = new Array(32).fill(null);
  for (let i = 0; i < 12; i++) {
    const st = groupStandings.get(GROUPS[i]);
    if (st && st[0]) slots[i] = st[0].teamId;
    if (st && st[1]) slots[12 + i] = st[1].teamId;
  }
  for (let i = 0; i < bestThirds.length; i++) {
    slots[24 + i] = bestThirds[i].teamId;
  }

  // Aplicar a partidos R32 existentes
  const r32 = await prisma.match.findMany({
    where: { stage: 'KNOCKOUT', round: 'R32' },
    orderBy: { matchNumber: 'asc' },
  });

  let r32SeededCount = 0;
  let r32SlotsPending = 0;
  for (let i = 0; i < Math.min(r32.length, 16); i++) {
    const home = slots[i * 2];
    const away = slots[i * 2 + 1];
    const update: any = {};
    if (home && r32[i].homeTeamId !== home) update.homeTeamId = home;
    if (away && r32[i].awayTeamId !== away) update.awayTeamId = away;
    if (!home) r32SlotsPending++;
    if (!away) r32SlotsPending++;
    if (Object.keys(update).length > 0) {
      await prisma.match.update({ where: { id: r32[i].id }, data: update });
      r32SeededCount += Object.keys(update).length;
    }
  }

  return {
    groupsCompleted,
    bestThirdsComputed,
    r32SeededCount,
    r32SlotsPending,
  };
}

export async function updateRealStandings(): Promise<RealStandingsResult> {
  const teams = await prisma.team.findMany({ where: { groupKey: { not: null } } });
  const matches = await prisma.match.findMany({ where: { stage: 'GROUP' } });

  const teamById = new Map(teams.map(t => [t.id, t]));
  const teamsByGroup = new Map<string, typeof teams>();
  for (const t of teams) {
    const arr = teamsByGroup.get(t.groupKey!) || [];
    arr.push(t);
    teamsByGroup.set(t.groupKey!, arr);
  }

  const result: RealStandingsResult = {
    groupsProcessed: 0,
    groupsCompleted: 0,
    teamsAssignedPosition: 0,
    bestThirdsComputed: false,
    bestThirdTeamIds: [],
    r32SeededCount: 0,
  };

  // Por grupo: calcular standing solo si los 6 partidos del grupo terminaron
  const groupStandings = new Map<string, Standing[]>();
  for (const g of GROUPS) {
    const gTeams = teamsByGroup.get(g) || [];
    if (gTeams.length === 0) continue;
    result.groupsProcessed++;

    const gMatches = matches.filter(m => {
      const home = teamById.get(m.homeTeamId || '');
      return home?.groupKey === g;
    });
    const finished = gMatches.filter(m => m.status === 'FINISHED');
    if (finished.length !== 6 || gMatches.length !== 6) continue; // grupo no completo

    const standings = computeGroupStandings(gTeams.map(t => t.id), finished as any);
    groupStandings.set(g, standings);
    result.groupsCompleted++;

    // Marcar realFinalPosition y realClassified (top 2)
    for (let i = 0; i < standings.length; i++) {
      const pos = i + 1;
      const classified = pos <= 2;
      const teamId = standings[i].teamId;
      const existing = teamById.get(teamId);
      if (!existing) continue;
      if (existing.realFinalPosition === pos && existing.realClassified === classified) continue;
      await prisma.team.update({
        where: { id: teamId },
        data: { realFinalPosition: pos, realClassified: classified },
      });
      result.teamsAssignedPosition++;
    }
  }

  // Si los 12 grupos terminaron -> calcular 8 mejores terceros
  if (result.groupsCompleted === 12) {
    const thirds: ThirdEntry[] = [];
    for (const g of GROUPS) {
      const st = groupStandings.get(g);
      if (!st || st.length < 3) continue;
      thirds.push({ ...st[2], groupKey: g });
    }
    thirds.sort((a, b) =>
      b.points - a.points ||
      b.goalDifference - a.goalDifference ||
      b.goalsFor - a.goalsFor,
    );
    const bestEight = thirds.slice(0, 8);
    const bestSet = new Set(bestEight.map(t => t.teamId));

    // Marcar realBestThird en BD
    for (const g of GROUPS) {
      const st = groupStandings.get(g);
      if (!st || st.length < 3) continue;
      const thirdId = st[2].teamId;
      const isBest = bestSet.has(thirdId);
      const existing = teamById.get(thirdId);
      if (!existing || existing.realBestThird === isBest) continue;
      await prisma.team.update({
        where: { id: thirdId },
        data: { realBestThird: isBest },
      });
    }

    result.bestThirdsComputed = true;
    result.bestThirdTeamIds = bestEight.map(t => t.teamId);

    // Seedeo del R32 (si existen partidos R32)
    result.r32SeededCount = await seedR32(groupStandings, bestEight);
  }

  return result;
}

function computeGroupStandings(
  teamIds: string[],
  finishedMatches: { homeTeamId: string; awayTeamId: string; homeGoals: number; awayGoals: number }[],
): Standing[] {
  const map = new Map<string, Standing>();
  for (const id of teamIds) {
    map.set(id, { teamId: id, points: 0, goalDifference: 0, goalsFor: 0, played: 0 });
  }
  for (const m of finishedMatches) {
    const home = map.get(m.homeTeamId);
    const away = map.get(m.awayTeamId);
    if (!home || !away) continue;
    home.played++;
    away.played++;
    home.goalsFor += m.homeGoals;
    away.goalsFor += m.awayGoals;
    home.goalDifference += m.homeGoals - m.awayGoals;
    away.goalDifference += m.awayGoals - m.homeGoals;
    if (m.homeGoals > m.awayGoals) home.points += 3;
    else if (m.awayGoals > m.homeGoals) away.points += 3;
    else { home.points += 1; away.points += 1; }
  }
  return Array.from(map.values()).sort((a, b) =>
    b.points - a.points ||
    b.goalDifference - a.goalDifference ||
    b.goalsFor - a.goalsFor,
  );
}

async function seedR32(
  groupStandings: Map<string, Standing[]>,
  bestThirds: ThirdEntry[],
): Promise<number> {
  const r32 = await prisma.match.findMany({
    where: { stage: 'KNOCKOUT', round: 'R32' },
    orderBy: { matchNumber: 'asc' },
  });
  if (r32.length !== 16) return 0;

  // Lista de 32 clasificados: 1s, 2s, 8 terceros — orden simple
  // Esto NO sigue el esquema FIFA oficial (que aun no esta definido publicamente
  // para el formato de 12 grupos). El admin puede ajustar los enfrentamientos a mano.
  const firsts: string[] = [];
  const seconds: string[] = [];
  for (const g of GROUPS) {
    const st = groupStandings.get(g);
    if (!st || st.length < 2) continue;
    firsts.push(st[0].teamId);
    seconds.push(st[1].teamId);
  }
  const qualified: string[] = [...firsts, ...seconds, ...bestThirds.map(t => t.teamId)];
  if (qualified.length !== 32) return 0;

  let assigned = 0;
  for (let i = 0; i < 16; i++) {
    const home = qualified[i * 2];
    const away = qualified[i * 2 + 1];
    await prisma.match.update({
      where: { id: r32[i].id },
      data: { homeTeamId: home, awayTeamId: away },
    });
    assigned += 2;
  }
  return assigned;
}
