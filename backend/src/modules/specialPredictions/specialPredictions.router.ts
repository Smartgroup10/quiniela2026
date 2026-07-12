import { Router } from 'express';
import { z } from 'zod';
import prisma from '../../lib/prisma.js';
import { requireAuth } from '../../middleware/auth.js';
import { phaseGuard } from '../../middleware/phaseGuard.js';
import { ForbiddenError } from '../../utils/errors.js';

export const specialPredictionsRouter = Router();

const specialsSchema = z.object({
  championTeamId: z.string().optional().nullable(),
  runnerUpTeamId: z.string().optional().nullable(),
  thirdTeamId: z.string().optional().nullable(),
  topScorerName: z.string().optional().nullable(),
  mvpName: z.string().optional().nullable(),
  revelationTeamId: z.string().optional().nullable(),
});

const championPhase2Schema = z.object({
  championPhase2TeamId: z.string(),
});

specialPredictionsRouter.get('/me', requireAuth, async (req, res, next) => {
  try {
    const prediction = await prisma.specialPrediction.findUnique({
      where: { userId: req.user!.sub },
    });
    res.json(prediction);
  } catch (err) { next(err); }
});

specialPredictionsRouter.put('/', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user!.sub;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user?.phase1Available) throw new ForbiddenError('Fase 1 no disponible para tu cuenta');

    const tournament = await prisma.tournament.findFirst();
    // Ventana ad-hoc del admin: si bonusUnlocked=true, saltamos todos los
    // demas guards. Sirve para reabrir bonus por 10 min o lo que sea.
    if (!tournament?.bonusUnlocked) {
      // Guard original: solo en PHASE1_OPEN
      if (tournament?.status !== 'PHASE1_OPEN') {
        throw new ForbiddenError('Esta fase no está abierta');
      }
      if (tournament?.bonusPhase1Locked) {
        throw new ForbiddenError('Los bonus han sido bloqueados por el administrador');
      }
      if (tournament?.phase1ClosesAt && new Date(tournament.phase1ClosesAt).getTime() <= Date.now()) {
        throw new ForbiddenError('Los bonus se bloquearon al inicio del Mundial');
      }
    }

    const data = specialsSchema.parse(req.body);

    const prediction = await prisma.specialPrediction.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    });

    res.json(prediction);
  } catch (err) { next(err); }
});

specialPredictionsRouter.put('/champion-phase2', requireAuth, phaseGuard(['PHASE2_OPEN']), async (req, res, next) => {
  try {
    const userId = req.user!.sub;
    const data = championPhase2Schema.parse(req.body);

    const prediction = await prisma.specialPrediction.upsert({
      where: { userId },
      create: { userId, championPhase2TeamId: data.championPhase2TeamId },
      update: { championPhase2TeamId: data.championPhase2TeamId },
    });

    res.json(prediction);
  } catch (err) { next(err); }
});

// View all specials (only when phase closed)
specialPredictionsRouter.get('/all', requireAuth, async (req, res, next) => {
  try {
    const tournament = await prisma.tournament.findFirst();
    if (!tournament || tournament.status === 'PHASE1_OPEN' || tournament.status === 'SETUP') {
      throw new ForbiddenError('Disponible cuando la fase cierre');
    }
    const predictions = await prisma.specialPrediction.findMany({
      include: { user: { select: { id: true, name: true, alias: true } } },
    });
    res.json(predictions);
  } catch (err) { next(err); }
});
