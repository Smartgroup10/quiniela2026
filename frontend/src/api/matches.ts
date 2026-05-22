import api from './client';
import type { MatchInfo } from './predictions';

export const matchesApi = {
  getAll: () => api.get<MatchInfo[]>('/matches'),
  getByStage: (stage: 'GROUP' | 'KNOCKOUT') =>
    api.get<MatchInfo[]>('/matches', { params: { stage } }),
};
