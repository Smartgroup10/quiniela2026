// Scoring engine — pure functions, no DB access.
// Source of truth: quiniela 2.md spec. DO NOT modify scoring logic.

export function scoreMatchPrediction(
  pred: { homeGoals: number; awayGoals: number },
  real: { homeGoals: number; awayGoals: number },
  rules: { matchExactScore: number; matchCorrectResult: number },
): number {
  // Exact score
  if (pred.homeGoals === real.homeGoals && pred.awayGoals === real.awayGoals) {
    return rules.matchExactScore;
  }

  // Correct result (1X2)
  const predSign = Math.sign(pred.homeGoals - pred.awayGoals);
  const realSign = Math.sign(real.homeGoals - real.awayGoals);
  if (predSign === realSign) {
    return rules.matchCorrectResult;
  }

  return 0;
}

export function scoreGroupPrediction(
  pred: { firstTeamId: string; secondTeamId: string; thirdTeamId: string; fourthTeamId: string },
  realTeams: { teamId: string; finalPosition: 1 | 2 | 3 | 4; classified: boolean }[],
  rules: { groupExactPosition: number; groupClassifiedOtherPos: number },
): number {
  const predList = [pred.firstTeamId, pred.secondTeamId, pred.thirdTeamId, pred.fourthTeamId];
  let pts = 0;

  predList.forEach((teamId, idx) => {
    const predictedPos = idx + 1;
    const real = realTeams.find((r) => r.teamId === teamId);
    if (!real) return;

    if (real.finalPosition === predictedPos) {
      pts += rules.groupExactPosition; // 2 pts
    } else if (real.finalPosition <= 2 && predictedPos <= 2) {
      // +1 solo si la inversión es dentro del top 2 (1º <-> 2º).
      // OJO: NO usamos `real.classified` porque incluye a los mejores
      // terceros (clasifican a octavos sin ser top-2 del grupo).
      pts += rules.groupClassifiedOtherPos; // 1 pt
    }
  });

  return pts;
}

export function scoreBestThirdPrediction(
  pred: { thirdTeamId: string; willPass: boolean },
  realTeams: { teamId: string; realBestThird: boolean }[],
  rules: { bestThirdCorrect: number },
): number {
  const real = realTeams.find((r) => r.teamId === pred.thirdTeamId);
  if (!real) return 0;
  // Only score positive predictions: correctly identifying a third that WILL qualify
  if (pred.willPass && real.realBestThird) return rules.bestThirdCorrect;
  return 0;
}

export function scoreBracketMatch(
  pred: {
    predictedHomeTeamId?: string | null;
    predictedAwayTeamId?: string | null;
    homeGoals: number;
    awayGoals: number;
    winnerTeamId: string;
    wentToPenalties: boolean;
  },
  real: {
    homeTeamId: string;
    awayTeamId: string;
    homeGoals: number;
    awayGoals: number;
    winnerTeamId: string;
    wentToPenalties: boolean;
  },
  rules: {
    knockoutWinner: number;
    knockoutExactScore: number;
    knockoutPenalties: number;
  },
): number {
  let pts = 0;

  const winnerCorrect = pred.winnerTeamId === real.winnerTeamId;

  // ¿El cruce predicho coincide con el real?
  const pairingMatches =
    pred.predictedHomeTeamId &&
    pred.predictedAwayTeamId &&
    ((pred.predictedHomeTeamId === real.homeTeamId && pred.predictedAwayTeamId === real.awayTeamId) ||
      (pred.predictedHomeTeamId === real.awayTeamId && pred.predictedAwayTeamId === real.homeTeamId));

  // 1. Ganador correcto (+3) — depende solo del equipo, no del cruce
  if (winnerCorrect) pts += rules.knockoutWinner;

  // 2. Marcador exacto al final del tiempo reglamentario (+3) —
  //    requiere que cada equipo del cruce haya metido el MISMO numero
  //    de goles tanto en la prediccion como en el partido real.
  //
  //    Ejemplo: si predices "Japon 2-1 Brasil" (gana Japon) y el real
  //    es "Brasil 2-1 Japon" (gana Brasil), NO es marcador exacto:
  //    Brasil mete 2 en la realidad pero 1 en tu prediccion.
  //
  //    Manejamos los dos casos (mismo orden home/away o invertido)
  //    comparando goles por TeamId, no por posicion home/away en BD.
  if (pairingMatches) {
    const sameOrder =
      pred.predictedHomeTeamId === real.homeTeamId &&
      pred.homeGoals === real.homeGoals &&
      pred.awayGoals === real.awayGoals;
    const invertedOrder =
      pred.predictedHomeTeamId === real.awayTeamId &&
      pred.homeGoals === real.awayGoals &&
      pred.awayGoals === real.homeGoals;
    if (sameOrder || invertedOrder) pts += rules.knockoutExactScore;
  }

  // 3. Penaltis (+1) — bonus si predijiste tanda Y aciertas quien gana
  //    en penaltis. Requiere:
  //    - el partido real fue a penaltis,
  //    - tu prediccion marca "wentToPenalties=true",
  //    - tu prediccion es empate (sin empate no se va a penaltis),
  //    - ganador correcto (gana en penaltis = gana el partido).
  const predIsDraw = pred.homeGoals === pred.awayGoals;
  if (real.wentToPenalties && pred.wentToPenalties && predIsDraw && winnerCorrect) {
    pts += rules.knockoutPenalties;
  }

  return pts;
}

export function scoreSpecials(
  specials: {
    championTeamId?: string | null;
    runnerUpTeamId?: string | null;
    thirdTeamId?: string | null;
    topScorerName?: string | null;
    mvpName?: string | null;
    revelationTeamId?: string | null;
    championPhase2TeamId?: string | null;
  },
  real: {
    championTeamId?: string | null;
    runnerUpTeamId?: string | null;
    thirdTeamId?: string | null;
    topScorerName?: string | null;
    mvpName?: string | null;
    revelationTeamId?: string | null;
  },
  rules: {
    champion: number;
    runnerUp: number;
    third: number;
    topScorer: number;
    mvp: number;
    revelation: number;
    championPhase2: number;
  },
) {
  const normalize = (s?: string | null) => (s ?? '').trim().toLowerCase();

  const eq = (a?: string | null, b?: string | null) => a != null && b != null && a === b;

  return {
    championPoints: eq(specials.championTeamId, real.championTeamId) ? rules.champion : 0,
    runnerUpPoints: eq(specials.runnerUpTeamId, real.runnerUpTeamId) ? rules.runnerUp : 0,
    thirdPoints: eq(specials.thirdTeamId, real.thirdTeamId) ? rules.third : 0,
    topScorerPoints: normalize(specials.topScorerName) === normalize(real.topScorerName) && normalize(real.topScorerName) !== '' ? rules.topScorer : 0,
    mvpPoints: normalize(specials.mvpName) === normalize(real.mvpName) && normalize(real.mvpName) !== '' ? rules.mvp : 0,
    revelationPoints: eq(specials.revelationTeamId, real.revelationTeamId) ? rules.revelation : 0,
    championPhase2Points: eq(specials.championPhase2TeamId, real.championTeamId) ? rules.championPhase2 : 0,
  };
}
