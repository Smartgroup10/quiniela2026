import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { adminOnly } from '../../middleware/adminOnly.js';
import { syncResults } from './footballApi.service.js';

export const footballApiRouter = Router();

footballApiRouter.use(requireAuth, adminOnly);

footballApiRouter.post('/sync-results', async (_req, res, next) => {
  try {
    const result = await syncResults();
    res.json(result);
  } catch (err) {
    next(err);
  }
});
