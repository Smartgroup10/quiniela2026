import { Router } from 'express';
import prisma from '../../lib/prisma.js';
import { requireAuth } from '../../middleware/auth.js';
import { adminOnly } from '../../middleware/adminOnly.js';
import { recalculateAll } from '../scoring/recalculate.js';
import { createUserSchema } from './admin.schemas.js';
import * as adminService from './admin.service.js';

export const adminRouter = Router();

adminRouter.use(requireAuth, adminOnly);

adminRouter.post('/recalculate', async (_req, res, next) => {
  try {
    const result = await recalculateAll();
    res.json({ message: 'Recálculo completado', ...result });
  } catch (err) { next(err); }
});

adminRouter.post('/close-phase1', async (_req, res, next) => {
  try {
    const tournament = await prisma.tournament.findFirst();
    if (!tournament) { res.status(404).json({ error: 'Torneo no encontrado' }); return; }
    const updated = await prisma.tournament.update({
      where: { id: tournament.id },
      data: { status: 'PHASE1_CLOSED' },
    });
    // Freeze scoring config
    const config = await prisma.scoringConfig.findFirst();
    if (config && !config.lockedAt) {
      await prisma.scoringConfig.update({
        where: { id: config.id },
        data: { lockedAt: new Date() },
      });
    }
    res.json(updated);
  } catch (err) { next(err); }
});

adminRouter.post('/open-phase2', async (_req, res, next) => {
  try {
    const tournament = await prisma.tournament.findFirst();
    if (!tournament) { res.status(404).json({ error: 'Torneo no encontrado' }); return; }
    const updated = await prisma.tournament.update({
      where: { id: tournament.id },
      data: { status: 'PHASE2_OPEN', phase2OpensAt: new Date() },
    });
    res.json(updated);
  } catch (err) { next(err); }
});

adminRouter.post('/close-phase2', async (_req, res, next) => {
  try {
    const tournament = await prisma.tournament.findFirst();
    if (!tournament) { res.status(404).json({ error: 'Torneo no encontrado' }); return; }
    const updated = await prisma.tournament.update({
      where: { id: tournament.id },
      data: { status: 'PHASE2_CLOSED' },
    });
    res.json(updated);
  } catch (err) { next(err); }
});

// Update team group results (admin enters final positions after group stage)
adminRouter.patch('/teams/:id/group-result', async (req, res, next) => {
  try {
    const { realFinalPosition, realClassified, realBestThird } = req.body;
    const team = await prisma.team.update({
      where: { id: req.params.id },
      data: {
        ...(realFinalPosition !== undefined && { realFinalPosition }),
        ...(realClassified !== undefined && { realClassified }),
        ...(realBestThird !== undefined && { realBestThird }),
      },
    });
    res.json(team);
  } catch (err) { next(err); }
});

// Update match result
adminRouter.patch('/matches/:id/result', async (req, res, next) => {
  try {
    const { homeGoals, awayGoals, winnerTeamId, wentToPenalties } = req.body;
    const match = await prisma.match.update({
      where: { id: req.params.id },
      data: {
        homeGoals,
        awayGoals,
        winnerTeamId,
        wentToPenalties: wentToPenalties || false,
        status: 'FINISHED',
      },
    });
    await recalculateAll();
    res.json(match);
  } catch (err) { next(err); }
});

// Set real tournament bonus results
adminRouter.patch('/tournament/real-bonus', async (req, res, next) => {
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

// --- User Management ---
adminRouter.get('/users', async (_req, res, next) => {
  try {
    const users = await adminService.listUsers();
    res.json(users);
  } catch (err) { next(err); }
});

adminRouter.post('/users', async (req, res, next) => {
  try {
    const data = createUserSchema.parse(req.body);
    const result = await adminService.createUserWithInvite(data);
    res.status(201).json(result);
  } catch (err) { next(err); }
});

adminRouter.delete('/users/:id', async (req, res, next) => {
  try {
    await adminService.deleteUser(req.params.id, (req as any).user.id);
    res.json({ message: 'Usuario eliminado' });
  } catch (err) { next(err); }
});

adminRouter.get('/stats', async (_req, res, next) => {
  try {
    const totalUsers = await prisma.user.count();
    const totalMatchPredictions = await prisma.matchPrediction.count();
    const totalPredictions = await prisma.groupPrediction.count();
    const totalSpecials = await prisma.specialPrediction.count();
    const totalBracket = await prisma.bracketPrediction.count();
    res.json({ totalUsers, totalMatchPredictions, totalPredictions, totalSpecials, totalBracket });
  } catch (err) { next(err); }
});
