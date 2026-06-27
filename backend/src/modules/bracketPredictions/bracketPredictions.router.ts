// Router de predicciones de bracket (Fase 2 - eliminatorias).
import { Router } from 'express';
import { z } from 'zod';
import prisma from '../../lib/prisma.js';
import { requireAuth } from '../../middleware/auth.js';
import { ValidationError, ForbiddenError } from '../../utils/errors.js';

export const bracketPredictionsRouter = Router();

const bracketSchema = z.object({
  predictedHomeTeamId: z.string().nullable().optional(),
  predictedAwayTeamId: z.string().nullable().optional(),
  homeGoals: z.number().int().min(0).max(20),
  awayGoals: z.number().int().min(0).max(20),
  winnerTeamId: z.string(),
  wentToPenalties: z.boolean().optional().default(false),
});

// Estructura completa: partidos KO + predicciones del usuario
bracketPredictionsRouter.get('/me', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user!.sub;
    const matches = await prisma.match.findMany({
      where: { stage: 'KNOCKOUT' },
      orderBy: { matchNumber: 'asc' },
    });
    const predictions = await prisma.bracketPrediction.findMany({
      where: { userId },
    });
    const predMap = new Map(predictions.map(p => [p.matchId, p]));
    const data = matches.map(m => ({
      match: m,
      myPrediction: predMap.get(m.id) || null,
    }));
    res.json(data);
  } catch (err) { next(err); }
});

// Guardar / actualizar una prediccion de bracket
bracketPredictionsRouter.put('/:matchId', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user!.sub;
    const matchId = req.params.matchId as string;
    const data = bracketSchema.parse(req.body);

    const match = await prisma.match.findUnique({ where: { id: matchId } });
    if (!match) throw new ValidationError('Partido no existe');
    if (match.stage !== 'KNOCKOUT') throw new ValidationError('No es partido de eliminatorias');

    // Bloqueos
    if (match.status === 'FINISHED' || match.status === 'LIVE') {
      throw new ValidationError('No se pueden modificar predicciones de un partido en curso o finalizado');
    }
    if (match.manuallyLocked) {
      throw new ValidationError('Este partido ha sido bloqueado por el administrador');
    }

    // Phase guard: solo en PHASE2_OPEN salvo admin
    const tournament = await prisma.tournament.findFirst();
    const role = req.user?.role;
    const isAdmin = role === 'ADMIN' || role === 'LEAGUE_ADMIN';
    if (!isAdmin && tournament?.status !== 'PHASE2_OPEN') {
      throw new ForbiddenError('Las predicciones de Fase 2 estan cerradas');
    }
    // Lock manual del admin: bloquea a todos menos admin
    if (!isAdmin && tournament?.bracketLocked) {
      throw new ForbiddenError('El bracket ha sido bloqueado por el administrador');
    }

    // 1h antes de kickoff (con bypass)
    const bypassUntil = process.env.PREDICTION_LOCK_BYPASS_UNTIL
      ? new Date(process.env.PREDICTION_LOCK_BYPASS_UNTIL).getTime()
      : 0;
    if (Date.now() >= bypassUntil) {
      const ms = new Date(match.kickoffAt).getTime() - Date.now();
      if (ms < 60 * 60 * 1000) {
        throw new ValidationError('Las predicciones se bloquean 1 hora antes del inicio del partido');
      }
    }

    // Validar que winnerTeamId sea uno de los dos equipos predichos
    if (data.predictedHomeTeamId && data.predictedAwayTeamId) {
      if (data.winnerTeamId !== data.predictedHomeTeamId && data.winnerTeamId !== data.predictedAwayTeamId) {
        throw new ValidationError('winnerTeamId debe ser uno de los equipos predichos');
      }
    }

    // En el modelo "bracket personal" cada usuario predice toda la cadena:
    // los equipos de R16+ derivan de SUS predicciones de R32 y pueden no
    // coincidir con los reales. El motor de scoring ya valida pairing al
    // calcular puntos, asi que aqui solo nos aseguramos de que
    // winnerTeamId sea uno de los dos equipos predichos.
    if (data.predictedHomeTeamId && data.predictedAwayTeamId) {
      if (data.winnerTeamId !== data.predictedHomeTeamId && data.winnerTeamId !== data.predictedAwayTeamId) {
        throw new ValidationError('winnerTeamId debe ser uno de los equipos predichos');
      }
    }
    // Si la prediccion NO es empate, no puede haber ido a penaltis.
    if (data.wentToPenalties && data.homeGoals !== data.awayGoals) {
      throw new ValidationError('Penaltis solo aplica si predices empate');
    }

    const prediction = await prisma.bracketPrediction.upsert({
      where: { userId_matchId: { userId, matchId } },
      create: { userId, matchId, ...data, wentToPenalties: data.wentToPenalties ?? false },
      update: { ...data, wentToPenalties: data.wentToPenalties ?? false },
    });

    res.json(prediction);
  } catch (err) { next(err); }
});
