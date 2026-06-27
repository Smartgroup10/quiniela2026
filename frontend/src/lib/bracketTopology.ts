// Topologia del bracket: que partido recibe los ganadores/perdedores
// de qué partidos anteriores.
//
// Asignacion convencional 1-vs-2, 3-vs-4, etc. dentro de cada ronda.
// Los matchNumber de los partidos KO se asignan correlativos desde
// el bracketGen.ts: R32 va de #1..#16 dentro de KO, luego #17..#24
// (R16), #25..#28 (QF), #29..#30 (SF), #31 (THIRD_PLACE), #32 (FINAL).
//
// Importante: los matchNumber REALES en la BD pueden ser otros (porque
// arrancan despues de los partidos de grupo), pero aqui usamos el
// INDICE relativo dentro de cada ronda. La derivacion se hace por round
// + indice ordinal, NO por matchNumber absoluto.

export type Round = 'R32' | 'R16' | 'QF' | 'SF' | 'THIRD_PLACE' | 'FINAL';

export interface Slot {
  // Como se llena este slot (home o away de un partido R16+):
  //  - { type: 'winner', round, index } -> el ganador del partido `index`-esimo de `round`
  //  - { type: 'loser',  round, index } -> el perdedor   (solo se usa en THIRD_PLACE)
  type: 'winner' | 'loser';
  round: Round;
  index: number; // 0-based dentro de la ronda
}

/**
 * BRACKET_TREE[round][matchIndex] = { home: Slot, away: Slot }
 * Define de donde vienen los dos equipos de cada partido R16+.
 */
export const BRACKET_TREE: Record<Exclude<Round, 'R32'>, Array<{ home: Slot; away: Slot }>> = {
  R16: [
    { home: { type: 'winner', round: 'R32', index: 0 },  away: { type: 'winner', round: 'R32', index: 1 } },
    { home: { type: 'winner', round: 'R32', index: 2 },  away: { type: 'winner', round: 'R32', index: 3 } },
    { home: { type: 'winner', round: 'R32', index: 4 },  away: { type: 'winner', round: 'R32', index: 5 } },
    { home: { type: 'winner', round: 'R32', index: 6 },  away: { type: 'winner', round: 'R32', index: 7 } },
    { home: { type: 'winner', round: 'R32', index: 8 },  away: { type: 'winner', round: 'R32', index: 9 } },
    { home: { type: 'winner', round: 'R32', index: 10 }, away: { type: 'winner', round: 'R32', index: 11 } },
    { home: { type: 'winner', round: 'R32', index: 12 }, away: { type: 'winner', round: 'R32', index: 13 } },
    { home: { type: 'winner', round: 'R32', index: 14 }, away: { type: 'winner', round: 'R32', index: 15 } },
  ],
  QF: [
    { home: { type: 'winner', round: 'R16', index: 0 }, away: { type: 'winner', round: 'R16', index: 1 } },
    { home: { type: 'winner', round: 'R16', index: 2 }, away: { type: 'winner', round: 'R16', index: 3 } },
    { home: { type: 'winner', round: 'R16', index: 4 }, away: { type: 'winner', round: 'R16', index: 5 } },
    { home: { type: 'winner', round: 'R16', index: 6 }, away: { type: 'winner', round: 'R16', index: 7 } },
  ],
  SF: [
    { home: { type: 'winner', round: 'QF', index: 0 }, away: { type: 'winner', round: 'QF', index: 1 } },
    { home: { type: 'winner', round: 'QF', index: 2 }, away: { type: 'winner', round: 'QF', index: 3 } },
  ],
  THIRD_PLACE: [
    { home: { type: 'loser', round: 'SF', index: 0 }, away: { type: 'loser', round: 'SF', index: 1 } },
  ],
  FINAL: [
    { home: { type: 'winner', round: 'SF', index: 0 }, away: { type: 'winner', round: 'SF', index: 1 } },
  ],
};

export interface BracketMatchInfo {
  id: string;
  round: Round;
  index: number;
  homeTeamId: string | null; // real (de BD)
  awayTeamId: string | null;
  winnerTeamId: string | null; // real
  myPrediction: {
    predictedHomeTeamId: string | null;
    predictedAwayTeamId: string | null;
    winnerTeamId: string;
    homeGoals: number;
    awayGoals: number;
    wentToPenalties: boolean;
  } | null;
}

/**
 * Dado un partido R16+ y mis predicciones de rondas anteriores,
 * deriva los predictedHomeTeamId / predictedAwayTeamId que el
 * usuario "espera" que se enfrenten ahi.
 *
 * Devuelve null en el campo correspondiente si la prediccion del
 * partido anterior aun no esta hecha.
 */
export function deriveTeamsForMatch(
  round: Round,
  index: number,
  matchesByRoundIndex: (round: Round) => BracketMatchInfo[],
): { homeTeamId: string | null; awayTeamId: string | null } {
  if (round === 'R32') {
    // R32 toma los equipos reales del partido en BD
    const all = matchesByRoundIndex('R32');
    const m = all[index];
    return { homeTeamId: m?.homeTeamId ?? null, awayTeamId: m?.awayTeamId ?? null };
  }
  const def = BRACKET_TREE[round]?.[index];
  if (!def) return { homeTeamId: null, awayTeamId: null };

  const resolveSlot = (slot: Slot): string | null => {
    const fromRound = matchesByRoundIndex(slot.round);
    const fromMatch = fromRound[slot.index];
    if (!fromMatch) return null;
    if (slot.type === 'winner') {
      // Primero mi prediccion del ganador (si la hay)
      if (fromMatch.myPrediction?.winnerTeamId) return fromMatch.myPrediction.winnerTeamId;
      // Fallback al ganador real (si ya se jugo)
      return fromMatch.winnerTeamId ?? null;
    } else {
      // loser: el que NO gano
      const winner = fromMatch.myPrediction?.winnerTeamId ?? fromMatch.winnerTeamId ?? null;
      const predHome = fromMatch.myPrediction?.predictedHomeTeamId ?? fromMatch.homeTeamId ?? null;
      const predAway = fromMatch.myPrediction?.predictedAwayTeamId ?? fromMatch.awayTeamId ?? null;
      if (!winner || (!predHome && !predAway)) return null;
      if (winner === predHome) return predAway;
      if (winner === predAway) return predHome;
      return null;
    }
  };

  return {
    homeTeamId: resolveSlot(def.home),
    awayTeamId: resolveSlot(def.away),
  };
}
