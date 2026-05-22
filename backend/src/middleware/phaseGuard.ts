import type { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma.js';
import { ForbiddenError } from '../utils/errors.js';

export function phaseGuard(allowedStatuses: string[]) {
  return async (_req: Request, _res: Response, next: NextFunction) => {
    try {
      const tournament = await prisma.tournament.findFirst();
      if (!tournament || !allowedStatuses.includes(tournament.status)) {
        return next(new ForbiddenError('Esta fase no está abierta'));
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}
