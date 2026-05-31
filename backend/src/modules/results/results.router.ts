import { Router } from 'express';
import prisma from '../../lib/prisma.js';
import { requireAuth } from '../../middleware/auth.js';

export const resultsRouter = Router();

resultsRouter.get('/', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user!.sub;

    const matches = await prisma.match.findMany({
      where: { status: 'FINISHED' },
      orderBy: { kickoffAt: 'desc' },
    });

    const teams = await prisma.team.findMany();
    const teamMap = new Map(teams.map((t) => [t.id, { id: t.id, code: t.code, name: t.name, flagUrl: t.flagUrl }]));

    const predictions = await prisma.matchPrediction.findMany({
      where: { userId, matchId: { in: matches.map((m) => m.id) } },
    });
    const predMap = new Map(predictions.map((p) => [p.matchId, p]));

    const results = matches.map((m) => ({
      id: m.id,
      stage: m.stage,
      round: m.round,
      matchNumber: m.matchNumber,
      kickoffAt: m.kickoffAt,
      homeTeam: teamMap.get(m.homeTeamId || '') || null,
      awayTeam: teamMap.get(m.awayTeamId || '') || null,
      homeGoals: m.homeGoals,
      awayGoals: m.awayGoals,
      myPrediction: predMap.get(m.id) ? {
        homeGoals: predMap.get(m.id)!.homeGoals,
        awayGoals: predMap.get(m.id)!.awayGoals,
        pointsEarned: predMap.get(m.id)!.pointsEarned,
      } : null,
    }));

    res.json(results);
  } catch (err) { next(err); }
});
