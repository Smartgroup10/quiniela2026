import { Router } from 'express';
import prisma from '../../lib/prisma.js';
import { requireAuth } from '../../middleware/auth.js';

export const dashboardRouter = Router();

dashboardRouter.get('/', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user!.sub;

    const [
      tournament,
      scoringConfig,
      allUsers,
      upcomingMatches,
      recentFinished,
      myMatchPredictions,
      myMatchPredCount,
      totalGroupMatches,
      teams,
      allGroupMatches,
      myBracketPredictions,
    ] = await Promise.all([
      prisma.tournament.findFirst(),
      prisma.scoringConfig.findFirst(),
      prisma.user.findMany({
        where: { role: { not: 'ADMIN' } },
        select: {
          id: true, name: true, alias: true, avatarUrl: true,
          totalPoints: true, matchPoints: true, groupPoints: true,
          bestThirdPoints: true, bonusPhase1Points: true,
          knockoutPoints: true, bonusPhase2Points: true,
        },
        orderBy: { totalPoints: 'desc' },
      }),
      prisma.match.findMany({
        where: { status: 'SCHEDULED', kickoffAt: { gte: new Date() } },
        orderBy: { kickoffAt: 'asc' },
        take: 5,
      }),
      prisma.match.findMany({
        where: { status: 'FINISHED' },
        orderBy: { kickoffAt: 'desc' },
        take: 5,
      }),
      prisma.matchPrediction.findMany({ where: { userId } }),
      prisma.matchPrediction.count({ where: { userId } }),
      prisma.match.count({ where: { stage: 'GROUP' } }),
      prisma.team.findMany(),
      prisma.match.findMany({ where: { stage: 'GROUP' }, select: { id: true, homeTeamId: true } }),
      prisma.bracketPrediction.findMany({ where: { userId } }),
    ]);

    // User rank
    const userRank = allUsers.findIndex((u) => u.id === userId) + 1;
    const currentUser = allUsers.find((u) => u.id === userId) || null;
    const top5 = allUsers.slice(0, 5);

    // Map user predictions by matchId for recent results.
    // Fase 1 (grupo) → matchPrediction.  Fase 2 (KO) → bracketPrediction.
    const matchPredMap = new Map(myMatchPredictions.map((p) => [p.matchId, p]));
    const bracketPredMap = new Map(myBracketPredictions.map((p) => [p.matchId, p]));

    // Build team map for team info
    const teamMap = new Map(teams.map((t) => [t.id, { id: t.id, code: t.code, name: t.name, flagUrl: t.flagUrl }]));

    const recentResults = recentFinished.map((m) => {
      const mp = matchPredMap.get(m.id);
      const bp = bracketPredMap.get(m.id);
      const myPrediction = mp
        ? { homeGoals: mp.homeGoals, awayGoals: mp.awayGoals, pointsEarned: mp.pointsEarned }
        : bp
        ? { homeGoals: bp.homeGoals, awayGoals: bp.awayGoals, pointsEarned: bp.pointsEarned }
        : null;
      return {
        ...m,
        homeTeam: teamMap.get(m.homeTeamId || '') || null,
        awayTeam: teamMap.get(m.awayTeamId || '') || null,
        myPrediction,
      };
    });

    const upcoming = upcomingMatches.map((m) => ({
      ...m,
      homeTeam: teamMap.get(m.homeTeamId || '') || null,
      awayTeam: teamMap.get(m.awayTeamId || '') || null,
    }));

    // Calculate incomplete groups
    const predictedMatchIds = new Set(myMatchPredictions.map((p) => p.matchId));
    const teamGroupMap = new Map(teams.map((t) => [t.id, t.groupKey]));
    const missingByGroup = new Map<string, number>();

    for (const match of allGroupMatches) {
      if (!predictedMatchIds.has(match.id)) {
        const groupKey = teamGroupMap.get(match.homeTeamId || '') || '?';
        missingByGroup.set(groupKey, (missingByGroup.get(groupKey) || 0) + 1);
      }
    }

    const incompleteGroups = Array.from(missingByGroup.entries())
      .map(([group, missing]) => ({ group, missing }))
      .sort((a, b) => a.group.localeCompare(b.group));

    // Check if user has special predictions
    const hasSpecials = await prisma.specialPrediction.count({ where: { userId } });

    res.json({
      tournament,
      scoringConfig,
      miniLeaderboard: top5,
      userRank,
      userInTop5: userRank > 0 && userRank <= 5,
      currentUser,
      totalPlayers: allUsers.length,
      upcomingMatches: upcoming,
      recentResults,
      predictionProgress: {
        matchPredictions: myMatchPredCount,
        totalGroupMatches,
      },
      alerts: {
        missingPredictions: totalGroupMatches - myMatchPredCount,
        incompleteGroups,
        missingSpecials: hasSpecials === 0,
      },
    });
  } catch (err) {
    next(err);
  }
});
