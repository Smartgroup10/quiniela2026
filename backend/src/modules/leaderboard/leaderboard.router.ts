import { Router } from 'express';
import prisma from '../../lib/prisma.js';

export const leaderboardRouter = Router();

leaderboardRouter.get('/', async (req, res, next) => {
  try {
    const breakdown = req.query.breakdown === 'true';
    const leagueId = req.query.leagueId as string | undefined;

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
