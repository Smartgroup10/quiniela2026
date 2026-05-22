import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
  name: z.string().min(2, 'Mínimo 2 caracteres').max(100),
  alias: z.string().max(30).optional(),
  favoriteTeamId: z.string().optional(),
  avatarUrl: z.string().max(200).optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string(),
  newPassword: z.string().min(6, 'Minimo 6 caracteres'),
  avatarUrl: z.string().max(200).optional(),
});

export const updateProfileSchema = z.object({
  avatarUrl: z.string().max(200).optional(),
  alias: z.string().max(30).optional(),
});
