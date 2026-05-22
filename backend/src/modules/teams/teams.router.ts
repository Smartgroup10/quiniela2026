import { Router } from 'express';
import prisma from '../../lib/prisma.js';

export const teamsRouter = Router();

teamsRouter.get('/', async (_req, res, next) => {
  try {
    const teams = await prisma.team.findMany({ orderBy: [{ groupKey: 'asc' }, { name: 'asc' }] });
    res.json(teams);
  } catch (err) { next(err); }
});

teamsRouter.get('/group/:key', async (req, res, next) => {
  try {
    const teams = await prisma.team.findMany({
      where: { groupKey: req.params.key.toUpperCase() },
      orderBy: { name: 'asc' },
    });
    res.json(teams);
  } catch (err) { next(err); }
});
