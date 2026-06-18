import { create } from 'zustand';
import type { Tournament, ScoringConfig } from '../api/tournament';

interface TournamentState {
  tournament: Tournament | null;
  scoringConfig: ScoringConfig | null;
  predictionLockBypassUntil: string | null;
  setTournament: (t: Tournament, sc: ScoringConfig, bypassUntil?: string | null) => void;
}

export const useTournamentStore = create<TournamentState>((set) => ({
  tournament: null,
  scoringConfig: null,
  predictionLockBypassUntil: null,
  setTournament: (tournament, scoringConfig, bypassUntil = null) =>
    set({ tournament, scoringConfig, predictionLockBypassUntil: bypassUntil }),
}));
