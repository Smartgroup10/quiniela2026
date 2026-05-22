import api from './client';

export interface Team {
  id: string;
  code: string;
  name: string;
  flagUrl: string | null;
  groupKey: string | null;
  realFinalPosition: number | null;
  realClassified: boolean;
  realBestThird: boolean;
}

export const teamsApi = {
  getAll: () => api.get<Team[]>('/teams'),
  getByGroup: (key: string) => api.get<Team[]>(`/teams/group/${key}`),
};
