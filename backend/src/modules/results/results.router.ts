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

    const matchIds = matches.map((m) => m.id);
    const [matchPreds, bracketPreds] = await Promise.all([
      prisma.matchPrediction.findMany({ where: { userId, matchId: { in: matchIds } } }),
      prisma.bracketPrediction.findMany({ where: { userId, matchId: { in: matchIds } } }),
    ]);
    const matchPredMap = new Map(matchPreds.map((p) => [p.matchId, p]));
    const bracketPredMap = new Map(bracketPreds.map((p) => [p.matchId, p]));

    const results = matches.map((m) => {
      const mp = matchPredMap.get(m.id);
      const bp = bracketPredMap.get(m.id);
      const myPrediction = mp
        ? { homeGoals: mp.homeGoals, awayGoals: mp.awayGoals, pointsEarned: mp.pointsEarned }
        : bp
        ? { homeGoals: bp.homeGoals, awayGoals: bp.awayGoals, pointsEarned: bp.pointsEarned }
        : null;
      return {
        id: m.id,
        stage: m.stage,
        round: m.round,
        matchNumber: m.matchNumber,
        kickoffAt: m.kickoffAt,
        homeTeam: teamMap.get(m.homeTeamId || '') || null,
        awayTeam: teamMap.get(m.awayTeamId || '') || null,
        homeGoals: m.homeGoals,
        awayGoals: m.awayGoals,
        myPrediction,
      };
    });

    res.json(results);
  } catch (err) { next(err); }
});

// Predicciones de TODOS los jugadores para un partido concreto.
// Solo se muestra si el partido esta FINISHED o LIVE.
resultsRouter.get('/:matchId/predictions', requireAuth, async (req, res, next) => {
  try {
    const matchId = req.params.matchId as string;
    const match = await prisma.match.findUnique({ where: { id: matchId } });
    if (!match) { res.status(404).json({ error: 'Partido no existe' }); return; }
    if (match.status !== 'FINISHED' && match.status !== 'LIVE') {
      res.status(403).json({ error: 'Las predicciones se muestran cuando el partido empiece' });
      return;
    }

    const teams = await prisma.team.findMany();
    const teamMap = new Map(teams.map(t => [t.id, { id: t.id, code: t.code, name: t.name, flagUrl: t.flagUrl }]));

    const [matchPreds, bracketPreds] = await Promise.all([
      prisma.matchPrediction.findMany({
        where: { matchId },
        include: { user: { select: { id: true, name: true, alias: true } } },
      }),
      prisma.bracketPrediction.findMany({
        where: { matchId },
        include: { user: { select: { id: true, name: true, alias: true } } },
      }),
    ]);

    const items = [
      ...matchPreds.map(p => ({
        userId: p.userId,
        userName: p.user.alias || p.user.name,
        predictedHomeTeam: null,
        predictedAwayTeam: null,
        homeGoals: p.homeGoals,
        awayGoals: p.awayGoals,
        winnerTeam: null,
        wentToPenalties: false,
        pointsEarned: p.pointsEarned,
        type: 'match' as const,
      })),
      ...bracketPreds.map(p => ({
        userId: p.userId,
        userName: p.user.alias || p.user.name,
        predictedHomeTeam: p.predictedHomeTeamId ? teamMap.get(p.predictedHomeTeamId) ?? null : null,
        predictedAwayTeam: p.predictedAwayTeamId ? teamMap.get(p.predictedAwayTeamId) ?? null : null,
        homeGoals: p.homeGoals,
        awayGoals: p.awayGoals,
        winnerTeam: teamMap.get(p.winnerTeamId) ?? null,
        wentToPenalties: p.wentToPenalties,
        pointsEarned: p.pointsEarned,
        type: 'bracket' as const,
      })),
    ];
    items.sort((a, b) => b.pointsEarned - a.pointsEarned);
    res.json(items);
  } catch (err) { next(err); }
});
