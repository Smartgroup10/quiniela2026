import { Router } from 'express';
import prisma from '../../lib/prisma.js';
import { requireAuth } from '../../middleware/auth.js';

export const leaderboardRouter = Router();

leaderboardRouter.get('/', requireAuth, async (req, res, next) => {
  try {
    const breakdown = req.query.breakdown === 'true';
    let leagueId = req.query.leagueId as string | undefined;
    const isAdmin = req.user?.role === 'ADMIN';

    // Non-ADMIN users must always filter by a league they belong to
    if (!isAdmin) {
      if (!leagueId) {
        // Auto-select first league
        const membership = await prisma.leagueUser.findFirst({
          where: { userId: req.user!.sub },
          select: { leagueId: true },
          orderBy: { joinedAt: 'asc' },
        });
        if (!membership) {
          return res.json([]);
        }
        leagueId = membership.leagueId;
      } else {
        // Validate user belongs to requested league
        const membership = await prisma.leagueUser.findUnique({
          where: { leagueId_userId: { leagueId, userId: req.user!.sub } },
        });
        if (!membership) {
          return res.status(403).json({ error: 'No tienes acceso a esta liga' });
        }
      }
    }

    // If filtering by league, get member user IDs first
    let userIdFilter: { id: { in: string[] } } | undefined;
    if (leagueId) {
      const members = await prisma.leagueUser.findMany({
        where: { leagueId },
        select: { userId: true },
      });
      userIdFilter = { id: { in: members.map((m) => m.userId) } };
    }

    const users = await prisma.user.findMany({
      where: userIdFilter,
      select: {
        id: true,
        name: true,
        alias: true,
        avatarUrl: true,
        totalPoints: true,
        ...(breakdown && {
          matchPoints: true,
          groupPoints: true,
          bestThirdPoints: true,
          bonusPhase1Points: true,
          knockoutPoints: true,
          bonusPhase2Points: true,
        }),
      },
      orderBy: { totalPoints: 'desc' },
    });
    res.json(users);
  } catch (err) { next(err); }
});
