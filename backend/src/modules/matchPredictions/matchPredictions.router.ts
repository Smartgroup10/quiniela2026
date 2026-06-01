import { Router } from 'express';
import prisma from '../../lib/prisma.js';
import { requireAuth } from '../../middleware/auth.js';
import { phaseGuard } from '../../middleware/phaseGuard.js';
import { matchPredictionSchema, groupMatchPredictionsSchema } from './matchPredictions.schemas.js';
import { deriveGroupStandings, deriveBestThirds } from './deriveStandings.js';
import { ValidationError, ForbiddenError } from '../../utils/errors.js';

export const matchPredictionsRouter = Router();

// Get all my match predictions
matchPredictionsRouter.get('/me', requireAuth, async (req, res, next) => {
  try {
    const predictions = await prisma.matchPrediction.findMany({
      where: { userId: req.user!.sub },
    });
    res.json(predictions);
  } catch (err) { next(err); }
});

// Save a single match prediction
matchPredictionsRouter.put('/:matchId', requireAuth, phaseGuard(['PHASE1_OPEN']), async (req, res, next) => {
  try {
    const userId = req.user!.sub;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user?.phase1Available) throw new ForbiddenError('Fase 1 no disponible para tu cuenta');

    const matchId = req.params.matchId as string;
    const data = matchPredictionSchema.parse(req.body);

    // Verify match exists and is a GROUP match
    const match = await prisma.match.findUnique({ where: { id: matchId } });
    if (!match || match.stage !== 'GROUP') throw new ValidationError('Partido de grupo no encontrado');

    // Block predictions if manually locked by admin
    if (match.manuallyLocked) {
      throw new ValidationError('Este partido ha sido bloqueado por el administrador');
    }

    // Block predictions 1 hour before kickoff
    const msUntilKickoff = new Date(match.kickoffAt).getTime() - Date.now();
    if (msUntilKickoff < 60 * 60 * 1000) {
      throw new ValidationError('Las predicciones se bloquean 1 hora antes del inicio del partido');
    }

    const prediction = await prisma.matchPrediction.upsert({
      where: { userId_matchId: { userId, matchId } },
      create: { userId, matchId: matchId, ...data },
      update: data,
    });

    // Auto-derive group standings after save
    await deriveAndCacheStandings(userId, match.homeTeamId!);

    res.json(prediction);
  } catch (err) { next(err); }
});

// Save batch of predictions for a group
matchPredictionsRouter.put('/group/:groupKey', requireAuth, phaseGuard(['PHASE1_OPEN']), async (req, res, next) => {
  try {
    const userId = req.user!.sub;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user?.phase1Available) throw new ForbiddenError('Fase 1 no disponible para tu cuenta');

    const groupKey = (req.params.groupKey as string).toUpperCase();
    const { predictions } = groupMatchPredictionsSchema.parse(req.body);

    // Get group matches
    const groupTeams = await prisma.team.findMany({ where: { groupKey } });
    const groupTeamIds = groupTeams.map((t) => t.id);
    const groupMatches = await prisma.match.findMany({
      where: {
        stage: 'GROUP',
        homeTeamId: { in: groupTeamIds },
        awayTeamId: { in: groupTeamIds },
      },
    });
    const validMatchIds = new Set(groupMatches.map((m) => m.id));

    // Validate all matchIds belong to this group
    for (const p of predictions) {
      if (!validMatchIds.has(p.matchId)) {
        throw new ValidationError(`Partido ${p.matchId} no pertenece al grupo ${groupKey}`);
      }
    }

    // Block predictions for locked matches (manual or 1h before kickoff)
    const matchMap = new Map(groupMatches.map((m) => [m.id, m]));
    const now = Date.now();
    const filteredPredictions = predictions.filter((p) => {
      const m = matchMap.get(p.matchId)!;
      if (m.manuallyLocked) return false;
      const msUntilKickoff = new Date(m.kickoffAt).getTime() - now;
      if (msUntilKickoff < 60 * 60 * 1000) return false;
      return true;
    });

    // Upsert all predictions (skip locked)
    const results = [];
    for (const p of filteredPredictions) {
      const pred = await prisma.matchPrediction.upsert({
        where: { userId_matchId: { userId, matchId: p.matchId } },
        create: { userId, matchId: p.matchId, homeGoals: p.homeGoals, awayGoals: p.awayGoals },
        update: { homeGoals: p.homeGoals, awayGoals: p.awayGoals },
      });
      results.push(pred);
    }

    // Auto-derive standings
    await deriveAndCacheStandings(userId, groupTeamIds[0]);

    res.json(results);
  } catch (err) { next(err); }
});

/**
 * After saving match predictions, derive group standings and cache into
 * GroupPrediction + BestThirdPrediction tables.
 */
async function deriveAndCacheStandings(userId: string, anyTeamId: string) {
  // Find the group of the team
  const team = await prisma.team.findUnique({ where: { id: anyTeamId } });
  if (!team?.groupKey) return;

  const allTeams = await prisma.team.findMany();
  const allGroups = [...new Set(allTeams.map((t) => t.groupKey).filter(Boolean))] as string[];

  // Get all user match predictions
  const allPredictions = await prisma.matchPrediction.findMany({
    where: { userId },
    include: { match: true },
  });

  // Build group standings for all groups that have complete predictions
  const groupStandings = [];

  for (const gk of allGroups) {
    const groupTeamList = allTeams.filter((t) => t.groupKey === gk);
    const groupTeamIds = groupTeamList.map((t) => t.id);

    // Get predictions for matches in this group
    const groupPreds = allPredictions.filter((p) => {
      const m = p.match;
      return m.stage === 'GROUP' &&
        groupTeamIds.includes(m.homeTeamId!) &&
        groupTeamIds.includes(m.awayTeamId!);
    });

    // Only derive if we have all 6 matches predicted
    if (groupPreds.length < 6) continue;

    const standing = deriveGroupStandings(
      gk,
      groupTeamIds,
      groupPreds.map((p) => ({
        homeTeamId: p.match.homeTeamId!,
        awayTeamId: p.match.awayTeamId!,
        homeGoals: p.homeGoals,
        awayGoals: p.awayGoals,
      })),
    );

    groupStandings.push(standing);

    // Cache into GroupPrediction
    const s = standing.standings;
    await prisma.groupPrediction.upsert({
      where: { userId_groupKey: { userId, groupKey: gk } },
      create: {
        userId,
        groupKey: gk,
        firstTeamId: s[0].teamId,
        secondTeamId: s[1].teamId,
        thirdTeamId: s[2].teamId,
        fourthTeamId: s[3].teamId,
      },
      update: {
        firstTeamId: s[0].teamId,
        secondTeamId: s[1].teamId,
        thirdTeamId: s[2].teamId,
        fourthTeamId: s[3].teamId,
      },
    });
  }

  // Derive best thirds (only if we have all 12 groups)
  if (groupStandings.length === 12) {
    const bestThirds = deriveBestThirds(groupStandings);

    // Get existing predictions to preserve manual overrides for tied groups
    const existing = await prisma.bestThirdPrediction.findMany({
      where: { userId },
    });
    const existingMap = new Map(existing.map((e) => [e.groupKey, e.willPass]));

    for (const bt of bestThirds) {
      // If tied, preserve user's manual choice (don't overwrite)
      if (bt.isTied && existingMap.has(bt.groupKey)) {
        continue;
      }

      await prisma.bestThirdPrediction.upsert({
        where: { userId_groupKey: { userId, groupKey: bt.groupKey } },
        create: { userId, groupKey: bt.groupKey, willPass: bt.qualifies },
        update: { willPass: bt.qualifies },
      });
    }
  }
}
