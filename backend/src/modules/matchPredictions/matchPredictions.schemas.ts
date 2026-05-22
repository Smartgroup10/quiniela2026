import { z } from 'zod';

const goalSchema = z.number().int().min(0).max(20);

export const matchPredictionSchema = z.object({
  homeGoals: goalSchema,
  awayGoals: goalSchema,
});

export const groupMatchPredictionsSchema = z.object({
  predictions: z.array(
    z.object({
      matchId: z.string().min(1),
      homeGoals: goalSchema,
      awayGoals: goalSchema,
    }),
  ).min(1).max(6),
});
