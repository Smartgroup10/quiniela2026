import { env } from '../../config/env.js';
import prisma from '../../lib/prisma.js';
import { recalculateAll } from '../scoring/recalculate.js';

const API_BASE = 'https://api.football-data.org/v4';

interface FootballApiMatch {
  id: number;
  matchday: number;
  status: 'SCHEDULED' | 'TIMED' | 'IN_PLAY' | 'PAUSED' | 'FINISHED' | 'POSTPONED' | 'CANCELLED';
  utcDate: string;
  homeTeam: { name: string; tla: string };
  awayTeam: { name: string; tla: string };
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

  // Recalculate scores if anything changed
  if (result.matchesUpdated > 0) {
    await recalculateAll();
  }

  return result;
}
