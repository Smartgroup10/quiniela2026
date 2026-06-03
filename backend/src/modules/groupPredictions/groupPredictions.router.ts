import { Router } from 'express';
import prisma from '../../lib/prisma.js';
import { requireAuth } from '../../middleware/auth.js';
import { phaseGuard } from '../../middleware/phaseGuard.js';
import { groupPredictionSchema } from './groupPredictions.schemas.js';
import { ValidationError, ForbiddenError } from '../../utils/errors.js';

export const groupPredictionsRouter = Router();

groupPredictionsRouter.get('/me', requireAuth, async (req, res, next) => {
  try {
    const predictions = await prisma.groupPrediction.findMany({
      where: { userId: req.user!.sub },
      orderBy: { groupKey: 'asc' },
    });
    res.json(predictions);
  } catch (err) { next(err); }
});

groupPredictionsRouter.put('/:groupKey', requireAuth, phaseGuard(['PHASE1_OPEN']), async (req, res, next) => {
  try {
    const userId = req.user!.sub;
    const groupKey = (req.params.groupKey as string).toUpperCase();

    // Check phase1Available
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user?.phase1Available) throw new ForbiddenError('Fase 1 no disponible para tu cuenta');

    const data = groupPredictionSchema.parse(req.body);
    const teamIds = [data.firstTeamId, data.secondTeamId, data.thirdTeamId, data.fourthTeamId];

    // Validate all teams belong to this group
    const teams = await prisma.team.findMany({ where: { id: { in: teamIds }, groupKey } });
    if (teams.length !== 4) throw new ValidationError('Todos los equipos deben pertenecer al grupo ' + groupKey);

    const prediction = await prisma.groupPrediction.upsert({
      where: { userId_groupKey: { userId, groupKey } },
      create: { userId, groupKey, ...data },
      update: data,
    });

    res.json(prediction);
  } catch (err) { next(err); }
});

// View predictions for a group.
// - Admins / league_admins: ven la comparativa completa siempre (QA).
// - Usuarios normales:
//     * Si la fase 1 está cerrada → ven todas las predicciones.
//     * Si la fase 1 está abierta → ven SOLO la suya (para revisar sus
//       propios puntos por grupo sin poder copiar a los demás).
groupPredictionsRouter.get('/group/:key', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user!.sub;
    const role = req.user?.role;
    const isAdmin = role === 'ADMIN' || role === 'LEAGUE_ADMIN';
    const groupKey = (req.params.key as string).toUpperCase();

    let restrictToSelf = false;
    if (!isAdmin) {
      const tournament = await prisma.tournament.findFirst();
      if (!tournament || tournament.status === 'PHASE1_OPEN' || tournament.status === 'SETUP') {
        restrictToSelf = true;
      }
    }

    const predictions = await prisma.groupPrediction.findMany({
      where: restrictToSelf
        ? { groupKey, userId }
        : { groupKey },
      include: { user: { select: { id: true, name: true, alias: true } } },
    });
    res.json(predictions);
  } catch (err) { next(err); }
});
