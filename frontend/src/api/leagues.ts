import api from './client';

export interface League {
  id: string;
  name: string;
  code: string;
  memberCount: number;
  createdAt?: string;
  joinedAt?: string;
}

export interface LeagueMember {
  id: string;
  name: string;
  alias: string | null;
  avatarUrl: string | null;
  email: string;
  totalPoints: number;
  joinedAt: string;
}

export const leaguesApi = {
  // User endpoints
  getMyLeagues: () => api.get<League[]>('/leagues/me'),
  joinLeague: (code: string) => api.post<{ message: string; leagueId: string }>('/leagues/join', { code }),
  leaveLeague: (id: string) => api.delete<{ message: string }>(`/leagues/${id}/leave`),

  // Admin endpoints
  adminGetLeagues: () => api.get<League[]>('/admin/leagues'),
  adminCreateLeague: (name: string) => api.post<League>('/admin/leagues', { name }),
  adminDeleteLeague: (id: string) => api.delete('/admin/leagues/' + id),
  adminGetMembers: (id: string) => api.get<LeagueMember[]>(`/admin/leagues/${id}/members`),
  adminAddMember: (leagueId: string, userId: string) => api.post(`/admin/leagues/${leagueId}/members`, { userId }),
  adminRemoveMember: (leagueId: string, userId: string) => api.delete(`/admin/leagues/${leagueId}/members/${userId}`),
};
