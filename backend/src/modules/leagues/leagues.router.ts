import { Router } from 'express';
import crypto from 'crypto';
import prisma from '../../lib/prisma.js';
import { requireAuth } from '../../middleware/auth.js';
import { ValidationError } from '../../utils/errors.js';

export const leaguesRouter = Router();

// Get my leagues
leaguesRouter.get('/me', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user!.sub;
    const memberships = await prisma.leagueUser.findMany({
      where: { userId },
      include: {
        league: {
          include: { _count: { select: { members: true } } },
        },
      },
      orderBy: { joinedAt: 'asc' },
    });
    const leagues = memberships.map((m) => ({
      id: m.league.id,
      name: m.league.name,
      code: m.league.code,
      memberCount: m.league._count.members,
      joinedAt: m.joinedAt,
    }));
    res.json(leagues);
  } catch (err) { next(err); }
});

// Join league by code
leaguesRouter.post('/join', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user!.sub;
    const { code } = req.body;
    if (!code || typeof code !== 'string') throw new ValidationError('Código de liga requerido');

    const league = await prisma.league.findUnique({ where: { code: code.trim().toLowerCase() } });
    if (!league) throw new ValidationError('Código de liga no válido');

    // Check if already a member
    const existing = await prisma.leagueUser.findUnique({
      where: { leagueId_userId: { leagueId: league.id, userId } },
    });
    if (existing) throw new ValidationError('Ya eres miembro de esta liga');

    await prisma.leagueUser.create({
      data: { leagueId: league.id, userId },
    });

    res.json({ message: `Te has unido a "${league.name}"`, leagueId: league.id });
  } catch (err) { next(err); }
});

// Leave league
leaguesRouter.delete('/:id/leave', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user!.sub;
    const leagueId = req.params.id as string;

    const membership = await prisma.leagueUser.findUnique({
      where: { leagueId_userId: { leagueId, userId } },
    });
    if (!membership) throw new ValidationError('No eres miembro de esta liga');

    await prisma.leagueUser.delete({
      where: { leagueId_userId: { leagueId, userId } },
    });

    res.json({ message: 'Has salido de la liga' });
  } catch (err) { next(err); }
});
