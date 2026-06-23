import api from './client';

export interface MatchPrediction {
  id: string;
  userId: string;
  matchId: string;
  homeGoals: number;
  awayGoals: number;
  pointsEarned: number;
}

export interface GroupPrediction {
  id: string;
  userId: string;
  groupKey: string;
  firstTeamId: string;
  secondTeamId: string;
  thirdTeamId: string;
  fourthTeamId: string;
  pointsEarned: number;
}

export interface BestThirdPrediction {
  id: string;
  userId: string;
  groupKey: string;
  willPass: boolean;
  pointsEarned: number;
}

export interface SpecialPrediction {
  id: string;
  userId: string;
  championTeamId?: string | null;
  runnerUpTeamId?: string | null;
  thirdTeamId?: string | null;
  topScorerName?: string | null;
  mvpName?: string | null;
  revelationTeamId?: string | null;
  championPhase2TeamId?: string | null;
  championPoints?: number;
  runnerUpPoints?: number;
  thirdPoints?: number;
  topScorerPoints?: number;
  mvpPoints?: number;
  revelationPoints?: number;
  championPhase2Points?: number;
}

export interface MatchInfo {
  id: string;
  matchNumber: number;
  homeTeamId: string;
  awayTeamId: string;
  kickoffAt: string;
  venue: string;
  stage: string;
  round: string | null;
  status: string;
  homeGoals: number | null;
  awayGoals: number | null;
  winnerTeamId: string | null;
  wentToPenalties: boolean;
  manuallyLocked: boolean;
}

export const predictionsApi = {
  // Match predictions (new)
  getMyMatchPredictions: () => api.get<MatchPrediction[]>('/match-predictions/me'),
  saveMatchPrediction: (matchId: string, data: { homeGoals: number; awayGoals: number }) =>
    api.put<MatchPrediction>(`/match-predictions/${matchId}`, data),
  saveGroupMatchPredictions: (groupKey: string, data: { predictions: { matchId: string; homeGoals: number; awayGoals: number }[] }) =>
    api.put<MatchPrediction[]>(`/match-predictions/group/${groupKey}`, data),

  // Group predictions (now derived/cached)
  getMyGroups: () => api.get<GroupPrediction[]>('/group-predictions/me'),
  saveGroup: (groupKey: string, data: { firstTeamId: string; secondTeamId: string; thirdTeamId: string; fourthTeamId: string }) =>
    api.put<GroupPrediction>(`/group-predictions/${groupKey}`, data),

  // Best thirds (now derived/cached)
  getMyBestThirds: () => api.get<BestThirdPrediction[]>('/best-third-predictions/me'),
  saveBestThird: (groupKey: string, willPass: boolean) =>
    api.put<BestThirdPrediction>(`/best-third-predictions/${groupKey}`, { willPass }),

  // Specials (unchanged)
  getMySpecials: () => api.get<SpecialPrediction>('/special-predictions/me'),
  saveSpecials: (data: Partial<SpecialPrediction>) =>
    api.put<SpecialPrediction>('/special-predictions', data),

  // Group predictions comparison (only available when phase closed)
  getGroupPredictionsByGroup: (groupKey: string) =>
    api.get<(GroupPrediction & { user: { id: string; name: string; alias: string | null } })[]>(`/group-predictions/group/${groupKey}`),

  // Matches
  getGroupMatches: () => api.get<MatchInfo[]>('/matches', { params: { stage: 'GROUP' } }),

  // Bracket (Fase 2 - eliminatorias)
  getMyBracket: () => api.get<BracketMatchWithPrediction[]>('/bracket-predictions/me'),
  saveBracketPrediction: (matchId: string, data: BracketPredictionInput) =>
    api.put<BracketPrediction>(`/bracket-predictions/${matchId}`, data),
};

export interface BracketPrediction {
  id: string;
  userId: string;
  matchId: string;
  predictedHomeTeamId: string | null;
  predictedAwayTeamId: string | null;
  homeGoals: number;
  awayGoals: number;
  winnerTeamId: string;
  wentToPenalties: boolean;
  pointsEarned: number;
}

export interface BracketPredictionInput {
  predictedHomeTeamId?: string | null;
  predictedAwayTeamId?: string | null;
  homeGoals: number;
  awayGoals: number;
  winnerTeamId: string;
  wentToPenalties?: boolean;
}

export interface BracketMatchWithPrediction {
  match: MatchInfo;
  myPrediction: BracketPrediction | null;
}
