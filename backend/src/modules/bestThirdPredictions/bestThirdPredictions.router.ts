import { Router } from 'express';
import { z } from 'zod';
import prisma from '../../lib/prisma.js';
import { requireAuth } from '../../middleware/auth.js';
import { phaseGuard } from '../../middleware/phaseGuard.js';
import { ForbiddenError, ValidationError } from '../../utils/errors.js';

export const bestThirdPredictionsRouter = Router();

const bestThirdSchema = z.object({ willPass: z.boolean() });

bestThirdPredictionsRouter.get('/me', requireAuth, async (req, res, next) => {
  try {
    const predictions = await prisma.bestThirdPrediction.findMany({
      where: { userId: req.user!.sub },
      orderBy: { groupKey: 'asc' },
    });
    res.json(predictions);
  } catch (err) { next(err); }
});

bestThirdPredictionsRouter.put('/:groupKey', requireAuth, phaseGuard(['PHASE1_OPEN']), async (req, res, next) => {
  try {
    const userId = req.user!.sub;
    const groupKey = (req.params.groupKey as string).toUpperCase();

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user?.phase1Available) throw new ForbiddenError('Fase 1 no disponible para tu cuenta');

    // Must have a group prediction first
    const gp = await prisma.groupPrediction.findUnique({
      where: { userId_groupKey: { userId, groupKey } },
    });
    if (!gp) throw new ValidationError('Primero completa el pronóstico del grupo ' + groupKey);

    const data = bestThirdSchema.parse(req.body);

    const prediction = await prisma.bestThirdPrediction.upsert({
      where: { userId_groupKey: { userId, groupKey } },
      create: { userId, groupKey, willPass: data.willPass },
      update: { willPass: data.willPass },
    });

    res.json(prediction);
  } catch (err) { next(err); }
});
