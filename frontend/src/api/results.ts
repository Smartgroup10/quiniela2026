import api from './client';

export interface ResultMatch {
  id: string;
  stage: string;
  round: string | null;
  matchNumber: number;
  kickoffAt: string;
  homeTeam: { id: string; code: string; name: string; flagUrl: string | null } | null;
  awayTeam: { id: string; code: string; name: string; flagUrl: string | null } | null;
  homeGoals: number;
  awayGoals: number;
  myPrediction: { homeGoals: number; awayGoals: number; pointsEarned: number } | null;
}

export interface AllPrediction {
  userId: string;
  userName: string;
  predictedHomeTeam: { id: string; code: string; name: string } | null;
  predictedAwayTeam: { id: string; code: string; name: string } | null;
  homeGoals: number;
  awayGoals: number;
  winnerTeam: { id: string; code: string; name: string } | null;
  wentToPenalties: boolean;
  pointsEarned: number;
  type: 'match' | 'bracket';
}

export const resultsApi = {
  getAll: () => api.get<ResultMatch[]>('/results'),
  getPredictions: (matchId: string) => api.get<AllPrediction[]>(`/results/${matchId}/predictions`),
};
