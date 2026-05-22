export const Role = { PLAYER: 'PLAYER', ADMIN: 'ADMIN' } as const;
export type Role = (typeof Role)[keyof typeof Role];

export const TournamentStatus = {
  SETUP: 'SETUP',
  PHASE1_OPEN: 'PHASE1_OPEN',
  PHASE1_CLOSED: 'PHASE1_CLOSED',
  PHASE2_OPEN: 'PHASE2_OPEN',
  PHASE2_CLOSED: 'PHASE2_CLOSED',
  FINISHED: 'FINISHED',
} as const;
export type TournamentStatus = (typeof TournamentStatus)[keyof typeof TournamentStatus];

export const Stage = { GROUP: 'GROUP', KNOCKOUT: 'KNOCKOUT' } as const;
export type Stage = (typeof Stage)[keyof typeof Stage];

export const Round = {
  R32: 'R32', R16: 'R16', QF: 'QF', SF: 'SF',
  THIRD_PLACE: 'THIRD_PLACE', FINAL: 'FINAL',
} as const;
export type Round = (typeof Round)[keyof typeof Round];

export const MatchStatus = {
  SCHEDULED: 'SCHEDULED', LIVE: 'LIVE', FINISHED: 'FINISHED', CANCELLED: 'CANCELLED',
} as const;
export type MatchStatus = (typeof MatchStatus)[keyof typeof MatchStatus];
