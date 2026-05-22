import { Router } from 'express';
import prisma from '../../lib/prisma.js';

export const matchesRouter = Router();

matchesRouter.get('/', async (req, res, next) => {
  try {
    const where: any = {};
    if (req.query.stage) where.stage = (req.query.stage as string).toUpperCase();
    if (req.query.round) where.round = (req.query.round as string).toUpperCase();

    const matches = await prisma.match.findMany({
      where,
      orderBy: { matchNumber: 'asc' },
    });
    res.json(matches);
  } catch (err) { next(err); }
});

matchesRouter.get('/:id', async (req, res, next) => {
  try {
    const match = await prisma.match.findUnique({ where: { id: req.params.id } });
    if (!match) { res.status(404).json({ error: 'Partido no encontrado' }); return; }
    res.json(match);
  } catch (err) { next(err); }
});
