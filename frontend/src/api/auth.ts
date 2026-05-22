import api from './client';

export interface User {
  id: string;
  email: string;
  name: string;
  alias?: string;
  avatarUrl?: string;
  favoriteTeamId?: string;
  role: string;
  phase1Available: boolean;
  phase2Available: boolean;
  matchPoints: number;
  groupPoints: number;
  bestThirdPoints: number;
  bonusPhase1Points: number;
  knockoutPoints: number;
  bonusPhase2Points: number;
  totalPoints: number;
  mustChangePassword: boolean;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export const authApi = {
  register: (data: { email: string; password: string; name: string; alias?: string; favoriteTeamId?: string }) =>
    api.post<AuthResponse>('/auth/register', data),
  login: (data: { email: string; password: string }) =>
    api.post<AuthResponse>('/auth/login', data),
  me: () => api.get<User>('/auth/me'),
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.post('/auth/change-password', data),
};
