import { Router } from 'express';
import { registerSchema, loginSchema, changePasswordSchema } from './auth.schemas.js';
import * as authService from './auth.service.js';
import { requireAuth } from '../../middleware/auth.js';

export const authRouter = Router();

authRouter.post('/register', async (req, res, next) => {
  try {
    const data = registerSchema.parse(req.body);
    const result = await authService.register(data);
    res.status(201).json(result);
  } catch (err) { next(err); }
});

authRouter.post('/login', async (req, res, next) => {
  try {
    const data = loginSchema.parse(req.body);
    const result = await authService.login(data.email, data.password);
    res.json(result);
  } catch (err) { next(err); }
});

authRouter.post('/change-password', requireAuth, async (req, res, next) => {
  try {
    const data = changePasswordSchema.parse(req.body);
    const result = await authService.changePassword(req.user!.sub, data.currentPassword, data.newPassword);
    res.json(result);
  } catch (err) { next(err); }
});

authRouter.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await authService.me(req.user!.sub);
    res.json(user);
  } catch (err) { next(err); }
});
