import api from './client';

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  alias: string | null;
  role: string;
  mustChangePassword: boolean;
  registeredAt: string;
  totalPoints: number;
  phase1Available: boolean;
  phase2Available: boolean;
}

export interface CreateUserResponse {
  user: AdminUser;
  emailSent: boolean;
  tempPassword?: string;
}

export interface AdminStats {
  totalUsers: number;
  totalMatchPredictions: number;
  totalPredictions: number;
  totalSpecials: number;
  totalBracket: number;
}

export interface MatchResultData {
  homeGoals: number;
  awayGoals: number;
  winnerTeamId?: string | null;
  wentToPenalties?: boolean;
}

export interface TeamGroupResultData {
  realFinalPosition?: number;
  realClassified?: boolean;
  realBestThird?: boolean;
}

export interface SyncResult {
  matchesChecked: number;
  matchesUpdated: number;
  matchesSkipped: number;
  errors: string[];
  updatedMatches: { matchNumber: number; home: string; away: string; homeGoals: number; awayGoals: number }[];
}

export interface RealBonusData {
  realChampionTeamId?: string | null;
  realRunnerUpTeamId?: string | null;
  realThirdTeamId?: string | null;
  realTopScorerName?: string | null;
  realMvpName?: string | null;
  realRevelationTeamId?: string | null;
}

export const adminApi = {
  // Usuarios
  getUsers: () => api.get<AdminUser[]>('/admin/users'),
  createUser: (data: { name: string; email: string; role?: string; leagueId?: string }) =>
    api.post<CreateUserResponse>('/admin/users', data),
  deleteUser: (userId: string) => api.delete(`/admin/users/${userId}`),

  // Stats
  getStats: () => api.get<AdminStats>('/admin/stats'),

  // Resultados de partidos
  setMatchResult: (matchId: string, data: MatchResultData) =>
    api.patch(`/admin/matches/${matchId}/result`, data),

  // Resultados de grupos
  setTeamGroupResult: (teamId: string, data: TeamGroupResultData) =>
    api.patch(`/admin/teams/${teamId}/group-result`, data),

  // Transiciones de fase
  closePhase1: () => api.post('/admin/close-phase1'),
  openPhase2: () => api.post('/admin/open-phase2'),
  closePhase2: () => api.post('/admin/close-phase2'),

  // Recalculo
  recalculate: () => api.post<{ message: string; usersRecalculated: number }>('/admin/recalculate'),

  // Resultados reales bonus
  setRealBonus: (data: RealBonusData) =>
    api.patch('/admin/tournament/real-bonus', data),

  // Sync resultados desde API externa
  syncResults: () => api.post<SyncResult>('/admin/football/sync-results'),
};
