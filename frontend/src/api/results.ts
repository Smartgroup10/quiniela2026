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

export const resultsApi = {
  getAll: () => api.get<ResultMatch[]>('/results'),
};
