import api from './client';

export interface Tournament {
  id: string;
  name: string;
  phase1OpensAt: string;
  phase1ClosesAt: string;
  phase2OpensAt: string | null;
  phase2ClosesAt: string | null;
  status: string;
  realChampionTeamId: string | null;
  realRunnerUpTeamId: string | null;
  realThirdTeamId: string | null;
  realTopScorerName: string | null;
  realMvpName: string | null;
  realRevelationTeamId: string | null;
  bonusPhase1Locked: boolean;
  bracketLocked: boolean;
}

export interface ScoringConfig {
  id: string;
  groupExactPosition: number;
  groupClassifiedOtherPos: number;
  bestThirdCorrect: number;
  matchExactScore: number;
  matchCorrectResult: number;
  champion: number;
  runnerUp: number;
  third: number;
  topScorer: number;
  mvp: number;
  revelation: number;
  knockoutWinner: number;
  knockoutExactScore: number;
  knockoutPenalties: number;
  championPhase2: number;
  lockedAt: string | null;
}

export const tournamentApi = {
  get: () => api.get<{ tournament: Tournament; scoringConfig: ScoringConfig; predictionLockBypassUntil: string | null }>('/tournament'),
  update: (data: Partial<Tournament>) => api.patch('/tournament', data),
  updateScoring: (data: Partial<ScoringConfig>) => api.patch('/tournament/scoring', data),
};
