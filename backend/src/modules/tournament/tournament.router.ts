import { Router } from 'express';
import prisma from '../../lib/prisma.js';
import { requireAuth } from '../../middleware/auth.js';
import { adminOnly } from '../../middleware/adminOnly.js';

export const tournamentRouter = Router();

tournamentRouter.get('/', async (_req, res, next) => {
  try {
    const tournament = await prisma.tournament.findFirst();
    const scoringConfig = await prisma.scoringConfig.findFirst();
    res.json({ tournament, scoringConfig });
  } catch (err) { next(err); }
});

tournamentRouter.patch('/', requireAuth, adminOnly, async (req, res, next) => {
  try {
    const tournament = await prisma.tournament.findFirst();
    if (!tournament) { res.status(404).json({ error: 'Torneo no encontrado' }); return; }
    const updated = await prisma.tournament.update({
      where: { id: tournament.id },
      data: req.body,
    });
    res.json(updated);
  } catch (err) { next(err); }
});

tournamentRouter.patch('/scoring', requireAuth, adminOnly, async (req, res, next) => {
  try {
    const config = await prisma.scoringConfig.findFirst();
    if (!config) { res.status(404).json({ error: 'Config no encontrada' }); return; }
    if (config.lockedAt) { res.status(403).json({ error: 'Configuración congelada' }); return; }
    const updated = await prisma.scoringConfig.update({
      where: { id: config.id },
      data: req.body,
    });
    res.json(updated);
  } catch (err) { next(err); }
});
