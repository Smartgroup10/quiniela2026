import { create } from 'zustand';
import type { Tournament, ScoringConfig } from '../api/tournament';

interface TournamentState {
  tournament: Tournament | null;
  scoringConfig: ScoringConfig | null;
  setTournament: (t: Tournament, sc: ScoringConfig) => void;
}

export const useTournamentStore = create<TournamentState>((set) => ({
  tournament: null,
  scoringConfig: null,
  setTournament: (tournament, scoringConfig) => set({ tournament, scoringConfig }),
}));
