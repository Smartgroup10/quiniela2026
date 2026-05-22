import { z } from 'zod';

export const createUserSchema = z.object({
  name: z.string().min(2, 'Minimo 2 caracteres').max(100),
  email: z.string().email('Email invalido'),
});
