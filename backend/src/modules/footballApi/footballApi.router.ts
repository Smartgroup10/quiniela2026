import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { adminOnly } from '../../middleware/adminOnly.js';
import { syncResults, importKnockoutMatches } from './footballApi.service.js';

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

// Importar partidos de eliminatorias desde football-data.org
// Crea o actualiza Match con stage=KNOCKOUT. Si la API aun no
// tiene los partidos KO definidos, devuelve 0 sin error.
footballApiRouter.post('/import-knockout', async (_req, res, next) => {
  try {
    const result = await importKnockoutMatches();
    res.json(result);
  } catch (err) {
    next(err);
  }
});
