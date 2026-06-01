import { Router } from 'express';
import crypto from 'crypto';
import prisma from '../../lib/prisma.js';
import { requireAuth } from '../../middleware/auth.js';
import { adminOnly, superAdminOnly } from '../../middleware/adminOnly.js';
import { recalculateAll } from '../scoring/recalculate.js';
import { createUserSchema } from './admin.schemas.js';
import * as adminService from './admin.service.js';

export const adminRouter = Router();

adminRouter.use(requireAuth, adminOnly);

/** Helper: get league IDs that a LEAGUE_ADMIN belongs to */
async function getAdminLeagueIds(userId: string): Promise<string[]> {
  const memberships = await prisma.leagueUser.findMany({
    where: { userId },
    select: { leagueId: true },
  });
  return memberships.map((m) => m.leagueId);
}

// --- Tournament operations ---
adminRouter.post('/recalculate', async (_req, res, next) => {
  try {
    const result = await recalculateAll();
    res.json({ message: 'Recálculo completado', ...result });
  } catch (err) { next(err); }
});

adminRouter.post('/reset-results', superAdminOnly, async (_req, res, next) => {
  try {
    // Reset all match results
    await prisma.match.updateMany({
      data: {
        homeGoals: null,
        awayGoals: null,
        winnerTeamId: null,
        wentToPenalties: false,
        status: 'SCHEDULED',
      },
    });

    // Reset team group results
    await prisma.team.updateMany({
      data: {
        realFinalPosition: null,
        realClassified: false,
        realBestThird: false,
      },
    });

    // Reset tournament bonus results
    const tournament = await prisma.tournament.findFirst();
    if (tournament) {
      await prisma.tournament.update({
        where: { id: tournament.id },
        data: {
          realChampionTeamId: null,
          realRunnerUpTeamId: null,
          realThirdTeamId: null,
          realTopScorerName: null,
          realMvpName: null,
          realRevelationTeamId: null,
        },
      });
    }

    // Reset all prediction points
    await prisma.matchPrediction.updateMany({ data: { pointsEarned: 0 } });
    await prisma.groupPrediction.updateMany({ data: { pointsEarned: 0 } });
    await prisma.bestThirdPrediction.updateMany({ data: { pointsEarned: 0 } });
    await prisma.specialPrediction.updateMany({
      data: {
        championPoints: 0,
        runnerUpPoints: 0,
        thirdPoints: 0,
        topScorerPoints: 0,
        mvpPoints: 0,
        revelationPoints: 0,
        championPhase2Points: 0,
      },
    });
    await prisma.bracketPrediction.updateMany({ data: { pointsEarned: 0 } });

    // Reset all user points
    await prisma.user.updateMany({
      data: {
        matchPoints: 0,
        groupPoints: 0,
        bestThirdPoints: 0,
        bonusPhase1Points: 0,
        knockoutPoints: 0,
        bonusPhase2Points: 0,
        totalPoints: 0,
      },
    });

    res.json({ message: 'Todos los resultados y puntos han sido reiniciados' });
  } catch (err) { next(err); }
});

adminRouter.post('/close-phase1', superAdminOnly, async (_req, res, next) => {
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

adminRouter.post('/open-phase2', superAdminOnly, async (_req, res, next) => {
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

adminRouter.post('/close-phase2', superAdminOnly, async (_req, res, next) => {
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

// Toggle bonus phase 1 lock
adminRouter.patch('/tournament/bonus-lock', async (_req, res, next) => {
  try {
    const tournament = await prisma.tournament.findFirst();
    if (!tournament) { res.status(404).json({ error: 'Torneo no encontrado' }); return; }
    const updated = await prisma.tournament.update({
      where: { id: tournament.id },
      data: { bonusPhase1Locked: !tournament.bonusPhase1Locked },
    });
    res.json(updated);
  } catch (err) { next(err); }
});

// Update team group results (admin enters final positions after group stage)
adminRouter.patch('/teams/:id/group-result', async (req, res, next) => {
  try {
    const { realFinalPosition, realClassified, realBestThird } = req.body;

    // If marking as best third, auto-set position 3 if not already set
    const autoPosition = realBestThird === true ? { realFinalPosition: 3 } : {};

    // Resolve effective position after auto-position override
    const effectivePos = realFinalPosition ?? (autoPosition as any).realFinalPosition;

    // Auto-derive realClassified when not explicitly sent:
    // pos 1-2 = always classified, pos 4 = never, pos 3 = only if bestThird
    const effectiveBestThird = realBestThird ?? false;
    let derivedClassified: boolean | undefined;
    if (realClassified !== undefined) {
      derivedClassified = realClassified;
    } else if (effectiveBestThird) {
      derivedClassified = true; // best third always classified
    } else if (effectivePos !== undefined) {
      derivedClassified = effectivePos <= 2;
    }

    const team = await prisma.team.update({
      where: { id: req.params.id as string },
      data: {
        ...autoPosition,
        ...(realFinalPosition !== undefined && { realFinalPosition }),
        ...(derivedClassified !== undefined && { realClassified: derivedClassified }),
        ...(realBestThird !== undefined && { realBestThird }),
      },
    });
    await recalculateAll();
    res.json(team);
  } catch (err) { next(err); }
});

// Toggle manual lock on a match (prevents predictions even before 1h cutoff)
adminRouter.patch('/matches/:id/lock', async (req, res, next) => {
  try {
    const match = await prisma.match.findUniqueOrThrow({ where: { id: req.params.id as string } });
    const updated = await prisma.match.update({
      where: { id: match.id },
      data: { manuallyLocked: !match.manuallyLocked },
    });
    res.json(updated);
  } catch (err) { next(err); }
});

// Update match result
adminRouter.patch('/matches/:id/result', async (req, res, next) => {
  try {
    const { homeGoals, awayGoals, winnerTeamId, wentToPenalties } = req.body;
    const match = await prisma.match.update({
      where: { id: req.params.id as string },
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
    await recalculateAll();
    res.json(updated);
  } catch (err) { next(err); }
});

// --- User Management ---
adminRouter.get('/users', async (req, res, next) => {
  try {
    const users = await adminService.listUsers();
    if (req.user?.role === 'LEAGUE_ADMIN') {
      const leagueIds = await getAdminLeagueIds(req.user.sub);
      const filtered = users.filter((u: any) =>
        u.leagues?.some((lu: any) => leagueIds.includes(lu.league?.id)),
      );
      return res.json(filtered);
    }
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

adminRouter.patch('/users/:id', async (req, res, next) => {
  try {
    const userId = req.params.id as string;
    const { role, leagueId } = req.body;
    const isLeagueAdmin = req.user?.role === 'LEAGUE_ADMIN';

    // LEAGUE_ADMIN can only modify users in their leagues
    if (isLeagueAdmin) {
      const leagueIds = await getAdminLeagueIds(req.user!.sub);
      const target = await prisma.leagueUser.findFirst({
        where: { userId, leagueId: { in: leagueIds } },
      });
      if (!target) return res.status(403).json({ error: 'No tienes acceso a este usuario' });
    }

    // Update role if provided
    if (role && (role === 'PLAYER' || role === 'LEAGUE_ADMIN' || role === 'ADMIN')) {
      // Cannot change your own role (prevent self-lockout)
      if (userId === req.user!.sub) {
        return res.status(403).json({ error: 'No puedes cambiar tu propio rol' });
      }
      // LEAGUE_ADMIN cannot promote to ADMIN
      if (isLeagueAdmin && role === 'ADMIN') {
        return res.status(403).json({ error: 'No puedes asignar rol Administrador' });
      }
      await prisma.user.update({ where: { id: userId }, data: { role } });
    }

    // Update league: remove all current, add new one if provided
    if (leagueId !== undefined) {
      await prisma.leagueUser.deleteMany({ where: { userId } });
      if (leagueId) {
        await prisma.leagueUser.create({ data: { leagueId, userId } });
      }
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, alias: true, email: true, role: true, totalPoints: true,
        mustChangePassword: true, registeredAt: true, phase1Available: true, phase2Available: true,
        leagues: { select: { leagueId: true } } },
    });
    res.json(user);
  } catch (err) { next(err); }
});

adminRouter.delete('/users/:id', async (req, res, next) => {
  try {
    await adminService.deleteUser(req.params.id, (req as any).user.id);
    res.json({ message: 'Usuario eliminado' });
  } catch (err) { next(err); }
});

// --- League Management ---
adminRouter.get('/leagues', async (req, res, next) => {
  try {
    const where = req.user?.role === 'LEAGUE_ADMIN'
      ? { id: { in: await getAdminLeagueIds(req.user.sub) } }
      : {};
    const leagues = await prisma.league.findMany({
      where,
      include: { _count: { select: { members: true } } },
      orderBy: { createdAt: 'asc' },
    });
    res.json(leagues.map((l) => ({
      id: l.id, name: l.name, code: l.code,
      memberCount: l._count.members, createdAt: l.createdAt,
    })));
  } catch (err) { next(err); }
});

adminRouter.post('/leagues', superAdminOnly, async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      res.status(400).json({ error: 'Nombre de liga requerido' }); return;
    }
    const code = crypto.randomBytes(4).toString('hex');
    const league = await prisma.league.create({
      data: { name: name.trim(), code },
    });
    res.status(201).json({ ...league, memberCount: 0 });
  } catch (err) { next(err); }
});

adminRouter.delete('/leagues/:id', superAdminOnly, async (req, res, next) => {
  try {
    await prisma.league.delete({ where: { id: req.params.id as string } });
    res.json({ message: 'Liga eliminada' });
  } catch (err) { next(err); }
});

adminRouter.get('/leagues/:id/members', async (req, res, next) => {
  try {
    // LEAGUE_ADMIN can only view their own leagues' members
    if (req.user?.role === 'LEAGUE_ADMIN') {
      const leagueIds = await getAdminLeagueIds(req.user.sub);
      if (!leagueIds.includes(req.params.id)) {
        return res.status(403).json({ error: 'No tienes acceso a esta liga' });
      }
    }
    const members = await prisma.leagueUser.findMany({
      where: { leagueId: req.params.id },
      include: {
        user: {
          select: { id: true, name: true, alias: true, avatarUrl: true, email: true, totalPoints: true },
        },
      },
      orderBy: { joinedAt: 'asc' },
    });
    res.json(members.map((m) => ({ ...m.user, joinedAt: m.joinedAt })));
  } catch (err) { next(err); }
});

adminRouter.post('/leagues/:id/members', async (req, res, next) => {
  try {
    const { userId } = req.body;
    if (!userId) { res.status(400).json({ error: 'userId requerido' }); return; }
    const existing = await prisma.leagueUser.findUnique({
      where: { leagueId_userId: { leagueId: req.params.id, userId } },
    });
    if (existing) { res.status(400).json({ error: 'Usuario ya es miembro de esta liga' }); return; }
    await prisma.leagueUser.create({ data: { leagueId: req.params.id, userId } });
    res.status(201).json({ message: 'Usuario agregado a la liga' });
  } catch (err) { next(err); }
});

adminRouter.delete('/leagues/:id/members/:userId', async (req, res, next) => {
  try {
    await prisma.leagueUser.delete({
      where: { leagueId_userId: { leagueId: req.params.id, userId: req.params.userId } },
    });
    res.json({ message: 'Usuario removido de la liga' });
  } catch (err) { next(err); }
});

adminRouter.get('/stats', async (_req, res, next) => {
  try {
    const totalUsers = await prisma.user.count({ where: { role: { not: 'ADMIN' } } });
    const totalMatchPredictions = await prisma.matchPrediction.count();
    const totalPredictions = await prisma.groupPrediction.count();
    const totalSpecials = await prisma.specialPrediction.count();
    const totalBracket = await prisma.bracketPrediction.count();
    res.json({ totalUsers, totalMatchPredictions, totalPredictions, totalSpecials, totalBracket });
  } catch (err) { next(err); }
});
