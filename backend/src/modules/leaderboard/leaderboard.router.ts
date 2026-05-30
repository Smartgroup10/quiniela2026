import { Router } from 'express';
import prisma from '../../lib/prisma.js';
import { requireAuth } from '../../middleware/auth.js';

export const leaderboardRouter = Router();

leaderboardRouter.get('/', requireAuth, async (req, res, next) => {
  try {
    const breakdown = req.query.breakdown === 'true';

    const users = await prisma.user.findMany({
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
