import { env } from '../../config/env.js';
import prisma from '../../lib/prisma.js';
import { recalculateAll } from '../scoring/recalculate.js';
// seedR32FromFinishedGroups NO se importa aqui a proposito: no debe
// ejecutarse automaticamente porque sobrescribe cruces del bracket.

const API_BASE = 'https://api.football-data.org/v4';

interface FootballApiMatch {
  id: number;
  matchday: number;
  // stage: GROUP_STAGE | LAST_32 | LAST_16 | QUARTER_FINALS | SEMI_FINALS | THIRD_PLACE_FINAL | FINAL
  stage?: string;
  status: 'SCHEDULED' | 'TIMED' | 'IN_PLAY' | 'PAUSED' | 'FINISHED' | 'POSTPONED' | 'CANCELLED';
  utcDate: string;
  homeTeam: { name: string; tla: string | null };
  awayTeam: { name: string; tla: string | null };
  venue?: string;
  score: {
    fullTime: { home: number | null; away: number | null };
    halfTime: { home: number | null; away: number | null };
    penalties?: { home: number | null; away: number | null };
    winner: 'HOME_TEAM' | 'AWAY_TEAM' | 'DRAW' | null;
  };
}

export interface SyncResult {
  matchesChecked: number;
  matchesUpdated: number;
  matchesSkipped: number;
  errors: string[];
  updatedMatches: { matchNumber: number; home: string; away: string; homeGoals: number; awayGoals: number }[];
}

// Override map for TLA codes that differ between football-data.org and our DB
const TLA_OVERRIDES: Record<string, string> = {
  // Add entries here if football-data.org uses different codes than ours
  // e.g. 'SAU': 'KSA'
};

function normalizeCode(tla: string): string {
  return TLA_OVERRIDES[tla] || tla;
}

export async function syncResults(): Promise<SyncResult> {
  if (!env.FOOTBALL_API_KEY) {
    throw new Error('FOOTBALL_API_KEY no configurada');
  }

  const result: SyncResult = {
    matchesChecked: 0,
    matchesUpdated: 0,
    matchesSkipped: 0,
    errors: [],
    updatedMatches: [],
  };

  const response = await fetch(`${API_BASE}/competitions/WC/matches`, {
    headers: { 'X-Auth-Token': env.FOOTBALL_API_KEY },
  });

  if (!response.ok) {
    throw new Error(`football-data.org respondio ${response.status}: ${response.statusText}`);
  }

  const data = (await response.json()) as { matches?: FootballApiMatch[] };
  const apiMatches = data.matches || [];

  // Get our teams indexed by code
  const teams = await prisma.team.findMany();
  const teamByCode = new Map(teams.map((t) => [t.code, t]));

  // Get our matches that are NOT yet FINISHED
  const ourMatches = await prisma.match.findMany({
    where: { status: { not: 'FINISHED' } },
  });

  const finishedApiMatches = apiMatches.filter((m) => m.status === 'FINISHED');
  result.matchesChecked = finishedApiMatches.length;

  for (const apiMatch of finishedApiMatches) {
    if (!apiMatch.homeTeam.tla || !apiMatch.awayTeam.tla) {
      result.matchesSkipped++;
      continue;
    }
    const homeCode = normalizeCode(apiMatch.homeTeam.tla);
    const awayCode = normalizeCode(apiMatch.awayTeam.tla);

    const homeTeam = teamByCode.get(homeCode);
    const awayTeam = teamByCode.get(awayCode);

    if (!homeTeam || !awayTeam) {
      result.matchesSkipped++;
      continue;
    }

    // Find our match by homeTeamId + awayTeamId
    const ourMatch = ourMatches.find(
      (m) => m.homeTeamId === homeTeam.id && m.awayTeamId === awayTeam.id,
    );

    if (!ourMatch) {
      result.matchesSkipped++;
      continue;
    }

    const homeGoals = apiMatch.score.fullTime.home;
    const awayGoals = apiMatch.score.fullTime.away;

    if (homeGoals === null || awayGoals === null) {
      result.matchesSkipped++;
      continue;
    }

    // Determine winner for knockout matches
    let winnerTeamId: string | null = null;
    let wentToPenalties = false;

    if (ourMatch.stage === 'KNOCKOUT') {
      if (apiMatch.score.penalties?.home != null && apiMatch.score.penalties?.away != null) {
        wentToPenalties = true;
      }
      if (apiMatch.score.winner === 'HOME_TEAM') winnerTeamId = homeTeam.id;
      else if (apiMatch.score.winner === 'AWAY_TEAM') winnerTeamId = awayTeam.id;
    }

    await prisma.match.update({
      where: { id: ourMatch.id },
      data: {
        homeGoals,
        awayGoals,
        status: 'FINISHED',
        winnerTeamId,
        wentToPenalties,
      },
    });

    result.matchesUpdated++;
    result.updatedMatches.push({
      matchNumber: ourMatch.matchNumber,
      home: homeCode,
      away: awayCode,
      homeGoals,
      awayGoals,
    });
  }

  // Recalculate scores if anything changed.
  // NO se llama a seedR32FromFinishedGroups() automaticamente porque
  // sobrescribiria los cruces del bracket (que ya vienen importados
  // desde football-data.org con los cruces reales del Mundial). Si un
  // admin quiere resembrar el bracket desde grupos, usa el boton
  // "Cargar Equipos en Bracket" del panel manualmente.
  if (result.matchesUpdated > 0) {
    await recalculateAll();
  }

  return result;
}

const STAGE_TO_ROUND: Record<string, string> = {
  LAST_32: 'R32',
  LAST_16: 'R16',
  QUARTER_FINALS: 'QF',
  SEMI_FINALS: 'SF',
  THIRD_PLACE_FINAL: 'THIRD_PLACE',
  FINAL: 'FINAL',
};

export interface ImportKnockoutResult {
  matchesChecked: number;
  matchesCreated: number;
  matchesUpdated: number;
  matchesSkipped: number;
  byRound: Record<string, number>;
  unknownStages: string[];
}

/**
 * Importa los partidos KO desde football-data.org. Crea los que no
 * existen, actualiza los existentes con kickoff/teams/venue. NO toca
 * homeGoals/awayGoals/status (eso lo hace syncResults).
 *
 * Si la API aun no expone los partidos KO (porque la fase de grupos
 * esta en marcha), devuelve 0 importados sin error.
 */
export async function importKnockoutMatches(): Promise<ImportKnockoutResult> {
  if (!env.FOOTBALL_API_KEY) {
    throw new Error('FOOTBALL_API_KEY no configurada');
  }

  const result: ImportKnockoutResult = {
    matchesChecked: 0,
    matchesCreated: 0,
    matchesUpdated: 0,
    matchesSkipped: 0,
    byRound: {},
    unknownStages: [],
  };

  const response = await fetch(`${API_BASE}/competitions/WC/matches`, {
    headers: { 'X-Auth-Token': env.FOOTBALL_API_KEY },
  });
  if (!response.ok) {
    throw new Error(`football-data.org respondio ${response.status}: ${response.statusText}`);
  }

  const data = (await response.json()) as { matches?: FootballApiMatch[] };
  const apiMatches = data.matches || [];

  const koMatches = apiMatches.filter((m) => m.stage && m.stage !== 'GROUP_STAGE');
  result.matchesChecked = koMatches.length;

  const teams = await prisma.team.findMany();
  const teamByCode = new Map(teams.map((t) => [t.code, t]));

  // Necesitamos el siguiente matchNumber libre
  const lastMatch = await prisma.match.findFirst({
    orderBy: { matchNumber: 'desc' },
    select: { matchNumber: true },
  });
  let nextMatchNumber = (lastMatch?.matchNumber ?? 0) + 1;

  for (const apiMatch of koMatches) {
    const round = apiMatch.stage ? STAGE_TO_ROUND[apiMatch.stage] : undefined;
    if (!round) {
      if (apiMatch.stage && !result.unknownStages.includes(apiMatch.stage)) {
        result.unknownStages.push(apiMatch.stage);
      }
      result.matchesSkipped++;
      continue;
    }

    const homeTeamId = apiMatch.homeTeam.tla
      ? teamByCode.get(normalizeCode(apiMatch.homeTeam.tla))?.id ?? null
      : null;
    const awayTeamId = apiMatch.awayTeam.tla
      ? teamByCode.get(normalizeCode(apiMatch.awayTeam.tla))?.id ?? null
      : null;
    const kickoffAt = new Date(apiMatch.utcDate);

    // Buscar partido existente: misma round y mismas TLAs (en cualquier orden)
    // o, si los equipos aun no estan, mismo round + matchday + kickoff.
    let existing = null;
    if (homeTeamId && awayTeamId) {
      existing = await prisma.match.findFirst({
        where: {
          stage: 'KNOCKOUT',
          round,
          OR: [
            { homeTeamId, awayTeamId },
            { homeTeamId: awayTeamId, awayTeamId: homeTeamId },
          ],
        },
      });
    }
    if (!existing) {
      // fallback por kickoff exacto + round
      existing = await prisma.match.findFirst({
        where: { stage: 'KNOCKOUT', round, kickoffAt },
      });
    }

    if (existing) {
      const update: Record<string, any> = {};
      if (homeTeamId && existing.homeTeamId !== homeTeamId) update.homeTeamId = homeTeamId;
      if (awayTeamId && existing.awayTeamId !== awayTeamId) update.awayTeamId = awayTeamId;
      if (existing.kickoffAt.getTime() !== kickoffAt.getTime()) update.kickoffAt = kickoffAt;
      if (apiMatch.venue && existing.venue !== apiMatch.venue) update.venue = apiMatch.venue;
      if (Object.keys(update).length > 0) {
        await prisma.match.update({ where: { id: existing.id }, data: update });
        result.matchesUpdated++;
      } else {
        result.matchesSkipped++;
      }
    } else {
      await prisma.match.create({
        data: {
          stage: 'KNOCKOUT',
          round,
          matchNumber: nextMatchNumber++,
          kickoffAt,
          venue: apiMatch.venue ?? null,
          homeTeamId,
          awayTeamId,
          status: 'SCHEDULED',
        },
      });
      result.matchesCreated++;
    }

    result.byRound[round] = (result.byRound[round] ?? 0) + 1;
  }

  return result;
}
