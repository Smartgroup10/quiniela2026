import { z } from 'zod';

export const groupPredictionSchema = z.object({
  firstTeamId: z.string(),
  secondTeamId: z.string(),
  thirdTeamId: z.string(),
  fourthTeamId: z.string(),
}).refine(
  (d) => new Set([d.firstTeamId, d.secondTeamId, d.thirdTeamId, d.fourthTeamId]).size === 4,
  { message: 'Los equipos no pueden repetirse' }
);
