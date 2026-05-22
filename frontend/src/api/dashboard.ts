import api from './client';
import type { Tournament, ScoringConfig } from './tournament';

export interface TeamInfo {
  id: string;
  code: string;
  name: string;
  flagUrl: string | null;
}

export interface LeaderboardEntry {
  id: string;
  name: string;
  alias: string | null;
  avatarUrl: string | null;
  totalPoints: number;
  matchPoints: number;
  groupPoints: number;
  bestThirdPoints: number;
  bonusPhase1Points: number;
  knockoutPoints: number;
  bonusPhase2Points: number;
}

export interface DashboardMatch {
  id: string;
  matchNumber: number;
  homeTeamId: string | null;
  awayTeamId: string | null;
  homeGoals: number | null;
  awayGoals: number | null;
  kickoffAt: string;
  venue: string | null;
  stage: string;
  status: string;
  homeTeam: TeamInfo | null;
  awayTeam: TeamInfo | null;
}

export interface DashboardResult extends DashboardMatch {
  myPrediction: {
    homeGoals: number;
    awayGoals: number;
    pointsEarned: number;
  } | null;
}

export interface DashboardAlerts {
  missingPredictions: number;
  incompleteGroups: { group: string; missing: number }[];
  missingSpecials: boolean;
}

export interface DashboardData {
  tournament: Tournament | null;
  scoringConfig: ScoringConfig | null;
  miniLeaderboard: LeaderboardEntry[];
  userRank: number;
  userInTop5: boolean;
  currentUser: LeaderboardEntry | null;
  totalPlayers: number;
  upcomingMatches: DashboardMatch[];
  recentResults: DashboardResult[];
  predictionProgress: {
    matchPredictions: number;
    totalGroupMatches: number;
  };
  alerts: DashboardAlerts;
}

export const dashboardApi = {
  get: () => api.get<DashboardData>('/dashboard'),
};
