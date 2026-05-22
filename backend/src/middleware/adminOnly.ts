import type { Request, Response, NextFunction } from 'express';
import { ForbiddenError } from '../utils/errors.js';

export function adminOnly(req: Request, _res: Response, next: NextFunction) {
  if (req.user?.role !== 'ADMIN') {
    return next(new ForbiddenError('Solo administradores'));
  }
  next();
}
