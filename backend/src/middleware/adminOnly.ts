import type { Request, Response, NextFunction } from 'express';
import { ForbiddenError } from '../utils/errors.js';

const ADMIN_ROLES = new Set(['ADMIN', 'LEAGUE_ADMIN']);

export function adminOnly(req: Request, _res: Response, next: NextFunction) {
  if (!req.user?.role || !ADMIN_ROLES.has(req.user.role)) {
    return next(new ForbiddenError('Solo administradores'));
  }
  next();
}

/** Blocks LEAGUE_ADMIN — only full ADMIN can pass */
export function superAdminOnly(req: Request, _res: Response, next: NextFunction) {
  if (req.user?.role !== 'ADMIN') {
    return next(new ForbiddenError('Solo administradores globales'));
  }
  next();
}
