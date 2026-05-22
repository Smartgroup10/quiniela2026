// Pure functions to derive group standings and best thirds from match predictions.
// No DB access — used both server-side (post-save) and could be shared with frontend.

interface PredictedMatch {
  homeTeamId: string;
  awayTeamId: string;
  homeGoals: number;
  awayGoals: number;
}

interface TeamStanding {
  teamId: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
}

export interface GroupStanding {
  groupKey: string;
  standings: (TeamStanding & { position: number })[];
}

/**
 * Compute head-to-head stats for a subset of tied teams.
 * Returns a map of teamId -> { h2hPoints, h2hGD, h2hGF }
 */
function computeH2H(
  tiedTeamIds: Set<string>,
  matches: PredictedMatch[],
): Map<string, { h2hPoints: number; h2hGD: number; h2hGF: number }> {
  const h2h = new Map<string, { h2hPoints: number; h2hGD: number; h2hGF: number }>();
  for (const id of tiedTeamIds) {
    h2h.set(id, { h2hPoints: 0, h2hGD: 0, h2hGF: 0 });
  }

  for (const m of matches) {
    if (!tiedTeamIds.has(m.homeTeamId) || !tiedTeamIds.has(m.awayTeamId)) continue;
    const home = h2h.get(m.homeTeamId)!;
    const away = h2h.get(m.awayTeamId)!;

    home.h2hGF += m.homeGoals;
    home.h2hGD += m.homeGoals - m.awayGoals;
    away.h2hGF += m.awayGoals;
    away.h2hGD += m.awayGoals - m.homeGoals;

    if (m.homeGoals > m.awayGoals) {
      home.h2hPoints += 3;
    } else if (m.homeGoals < m.awayGoals) {
      away.h2hPoints += 3;
    } else {
      home.h2hPoints += 1;
      away.h2hPoints += 1;
    }
  }

  return h2h;
}

/**
 * Sort teams applying FIFA tiebreaker:
 * 1. Points
 * 2. Head-to-head (points > GD > GF) among tied teams
 * 3. Overall GD
 * 4. Overall GF
 */
function sortWithH2H(teams: TeamStanding[], matches: PredictedMatch[]): TeamStanding[] {
  // First sort by points descending
  const byPoints = [...teams].sort((a, b) => b.points - a.points);

  // Group consecutive teams with equal points
  const result: TeamStanding[] = [];
  let i = 0;
  while (i < byPoints.length) {
    let j = i + 1;
    while (j < byPoints.length && byPoints[j].points === byPoints[i].points) j++;

    const tiedGroup = byPoints.slice(i, j);
    if (tiedGroup.length === 1) {
      result.push(tiedGroup[0]);
    } else {
      // Apply head-to-head among tied teams
      const tiedIds = new Set(tiedGroup.map((t) => t.teamId));
      const h2h = computeH2H(tiedIds, matches);

      tiedGroup.sort((a, b) => {
        const ha = h2h.get(a.teamId)!;
        const hb = h2h.get(b.teamId)!;
        // H2H points
        if (hb.h2hPoints !== ha.h2hPoints) return hb.h2hPoints - ha.h2hPoints;
        // H2H goal difference
        if (hb.h2hGD !== ha.h2hGD) return hb.h2hGD - ha.h2hGD;
        // H2H goals for
        if (hb.h2hGF !== ha.h2hGF) return hb.h2hGF - ha.h2hGF;
        // Overall GD
        if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
        // Overall GF
        return b.goalsFor - a.goalsFor;
      });

      result.push(...tiedGroup);
    }
    i = j;
  }

  return result;
}

/**
 * Derive standings for a single group from predicted match results.
 * Uses FIFA tiebreaker: points > head-to-head > GD > GF.
 */
export function deriveGroupStandings(
  groupKey: string,
  teamIds: string[],
  predictions: PredictedMatch[],
): GroupStanding {
  const map = new Map<string, TeamStanding>();

  for (const id of teamIds) {
    map.set(id, {
      teamId: id,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      points: 0,
    });
  }

  for (const m of predictions) {
    const home = map.get(m.homeTeamId);
    const away = map.get(m.awayTeamId);
    if (!home || !away) continue;

    home.played++;
    away.played++;
    home.goalsFor += m.homeGoals;
    home.goalsAgainst += m.awayGoals;
    away.goalsFor += m.awayGoals;
    away.goalsAgainst += m.homeGoals;

    if (m.homeGoals > m.awayGoals) {
      home.won++;
      home.points += 3;
      away.lost++;
    } else if (m.homeGoals < m.awayGoals) {
      away.won++;
      away.points += 3;
      home.lost++;
    } else {
      home.drawn++;
      away.drawn++;
      home.points += 1;
      away.points += 1;
    }
  }

  for (const t of map.values()) {
    t.goalDifference = t.goalsFor - t.goalsAgainst;
  }

  const sorted = sortWithH2H([...map.values()], predictions);

  return {
    groupKey,
    standings: sorted.map((t, idx) => ({ ...t, position: idx + 1 })),
  };
}

/**
 * From all 12 group standings, determine the best 8 third-place teams.
 * FIFA criteria for third-place ranking: points > GD > GF.
 * (No head-to-head since they're from different groups.)
 */
export function deriveBestThirds(
  allGroupStandings: GroupStanding[],
): { groupKey: string; teamId: string; qualifies: boolean; points: number; goalDifference: number; goalsFor: number }[] {
  const thirds = allGroupStandings.map((gs) => {
    const third = gs.standings.find((s) => s.position === 3);
    return {
      groupKey: gs.groupKey,
      teamId: third?.teamId ?? '',
      points: third?.points ?? 0,
      goalDifference: third?.goalDifference ?? 0,
      goalsFor: third?.goalsFor ?? 0,
      qualifies: false,
    };
  });

  const sorted = [...thirds].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
    return b.goalsFor - a.goalsFor;
  });

  const qualifyingGroups = new Set(sorted.slice(0, 8).map((t) => t.groupKey));

  return thirds.map((t) => ({
    ...t,
    qualifies: qualifyingGroups.has(t.groupKey),
  }));
}
