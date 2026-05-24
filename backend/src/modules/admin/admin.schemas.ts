import { z } from 'zod';

export const createUserSchema = z.object({
  name: z.string().min(2, 'Minimo 2 caracteres').max(100),
  email: z.string().email('Email invalido'),
  role: z.enum(['PLAYER', 'LEAGUE_ADMIN', 'ADMIN']).default('PLAYER'),
  leagueId: z.string().optional(),
});
