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
  leagues?: { league: { id: string; name: string } }[];
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
  createUser: (data: { name: string; email: string; role?: string }) =>
    api.post<CreateUserResponse>('/admin/users', data),
  updateUser: (userId: string, data: { role?: string }) =>
    api.patch(`/admin/users/${userId}`, data),
  deleteUser: (userId: string) => api.delete(`/admin/users/${userId}`),

  // Stats
  getStats: () => api.get<AdminStats>('/admin/stats'),

  // Resultados de partidos
  setMatchResult: (matchId: string, data: MatchResultData) =>
    api.patch(`/admin/matches/${matchId}/result`, data),
  toggleMatchLock: (matchId: string) =>
    api.patch<{ id: string; manuallyLocked: boolean }>(`/admin/matches/${matchId}/lock`),

  // Resultados de grupos
  setTeamGroupResult: (teamId: string, data: TeamGroupResultData) =>
    api.patch(`/admin/teams/${teamId}/group-result`, data),

  // Transiciones de fase
  closePhase1: () => api.post('/admin/close-phase1'),
  openPhase2: () => api.post('/admin/open-phase2'),
  closePhase2: () => api.post('/admin/close-phase2'),

  // Recalculo
  recalculate: () => api.post<{ message: string; usersRecalculated: number }>('/admin/recalculate'),

  // Reset total de resultados
  resetResults: () => api.post<{ message: string }>('/admin/reset-results'),

  // Resultados reales bonus
  setRealBonus: (data: RealBonusData) =>
    api.patch('/admin/tournament/real-bonus', data),

  // Toggle bloqueo bonus fase 1
  toggleBonusLock: () => api.patch<{ bonusPhase1Locked: boolean }>('/admin/tournament/bonus-lock'),

  // Toggle bloqueo bracket fase 2
  toggleBracketLock: () => api.patch<{ bracketLocked: boolean }>('/admin/tournament/bracket-lock'),

  // Sync resultados desde API externa
  syncResults: () => api.post<SyncResult>('/admin/football/sync-results'),

  // Generar bracket de eliminatorias (Fase 2)
  generateKnockoutBracket: (data: { startKickoff?: string; withTestData?: boolean }) =>
    api.post<{
      created: number;
      deleted: number;
      matchesByRound: Record<string, number>;
      teamsAssigned: number;
      testDataUsed: boolean;
    }>('/admin/generate-knockout-bracket', data),

  // Calcular standings reales (top 2 + 8 mejores terceros) y seedear R32 si procede
  // ⚠️ Tras esto los usuarios reciben puntos de Fase 1 por grupos terminados
  updateRealStandings: () =>
    api.post<{
      groupsProcessed: number;
      groupsCompleted: number;
      teamsAssignedPosition: number;
      bestThirdsComputed: boolean;
      bestThirdTeamIds: string[];
      r32SeededCount: number;
    }>('/admin/update-real-standings'),

  // Sembrar el R32 con los equipos clasificados de los grupos terminados
  // SIN tocar realFinalPosition (no afecta scoring de Fase 1)
  seedR32: () =>
    api.post<{
      groupsCompleted: number;
      bestThirdsComputed: boolean;
      r32SeededCount: number;
      r32SlotsPending: number;
    }>('/admin/seed-r32'),

  // Importar partidos KO desde football-data.org (fechas, sedes, equipos
  // cuando esten definidos). Crea/actualiza, no toca resultados.
  importKnockoutMatches: () =>
    api.post<{
      matchesChecked: number;
      matchesCreated: number;
      matchesUpdated: number;
      matchesSkipped: number;
      byRound: Record<string, number>;
      unknownStages: string[];
    }>('/admin/football/import-knockout'),

  // Lab Fase 2
  listKoMatches: () => api.get<KoMatchWithPrediction[]>('/admin/ko-matches'),
  updateKoMatch: (id: string, data: Partial<KoMatchPatch>) =>
    api.patch<KoMatchWithPrediction>(`/admin/ko-matches/${id}`, data),
};

export interface KoMatchWithPrediction {
  id: string;
  stage: string;
  round: string | null;
  matchNumber: number;
  kickoffAt: string;
  venue: string | null;
  homeTeamId: string | null;
  awayTeamId: string | null;
  homeGoals: number | null;
  awayGoals: number | null;
  winnerTeamId: string | null;
  wentToPenalties: boolean;
  status: string;
  manuallyLocked: boolean;
  myPrediction: {
    id: string;
    predictedHomeTeamId: string | null;
    predictedAwayTeamId: string | null;
    homeGoals: number;
    awayGoals: number;
    winnerTeamId: string;
    wentToPenalties: boolean;
    pointsEarned: number;
  } | null;
}

export interface KoMatchPatch {
  homeTeamId: string | null;
  awayTeamId: string | null;
  homeGoals: number | null;
  awayGoals: number | null;
  winnerTeamId: string | null;
  wentToPenalties: boolean;
  status: 'SCHEDULED' | 'LIVE' | 'FINISHED';
}
