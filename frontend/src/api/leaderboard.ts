import api from './client';

export interface LeaderboardEntry {
  id: string;
  name: string;
  alias: string | null;
  avatarUrl: string | null;
  totalPoints: number;
  groupPoints?: number;
  bestThirdPoints?: number;
  bonusPhase1Points?: number;
  knockoutPoints?: number;
  bonusPhase2Points?: number;
}

export const leaderboardApi = {
  get: (breakdown = true, leagueId?: string) => {
    const params = new URLSearchParams({ breakdown: String(breakdown) });
    if (leagueId) params.set('leagueId', leagueId);
    return api.get<LeaderboardEntry[]>(`/leaderboard?${params}`);
  },
};
