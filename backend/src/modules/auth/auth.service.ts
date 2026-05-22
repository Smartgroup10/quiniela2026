import _bcrypt from 'bcryptjs';
const bcrypt = _bcrypt;
import _jwt from 'jsonwebtoken';
const jwt = _jwt;
import prisma from '../../lib/prisma.js';
import { env } from '../../config/env.js';
import { ConflictError, UnauthorizedError } from '../../utils/errors.js';
import type { JwtPayload } from '../../middleware/auth.js';

function signToken(payload: JwtPayload): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return jwt.sign(payload as any, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRY } as any);
}

export async function register(data: {
  email: string;
  password: string;
  name: string;
  alias?: string;
  favoriteTeamId?: string;
}) {
  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) throw new ConflictError('Este email ya está registrado');

  const tournament = await prisma.tournament.findFirst();
  let phase1Available = true;
  let phase2Available = true;

  if (tournament) {
    const now = new Date();
    if (tournament.status !== 'SETUP' && tournament.status !== 'PHASE1_OPEN') {
      phase1Available = false;
    }
    if (tournament.status === 'PHASE2_CLOSED' || tournament.status === 'FINISHED') {
      phase2Available = false;
    }
  }

  const hashed = await bcrypt.hash(data.password, 10);
  const user = await prisma.user.create({
    data: {
      email: data.email,
      password: hashed,
      name: data.name,
      alias: data.alias,
      favoriteTeamId: data.favoriteTeamId,
      phase1Available,
      phase2Available,
    },
  });

  const token = signToken({ sub: user.id, role: user.role });
  const { password: _, ...safeUser } = user;
  return { token, user: safeUser };
}

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new UnauthorizedError('Credenciales incorrectas');

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) throw new UnauthorizedError('Credenciales incorrectas');

  const token = signToken({ sub: user.id, role: user.role });
  const { password: _, ...safeUser } = user;
  return { token, user: safeUser };
}

export async function changePassword(userId: string, currentPassword: string, newPassword: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new UnauthorizedError('Usuario no encontrado');

  const valid = await bcrypt.compare(currentPassword, user.password);
  if (!valid) throw new UnauthorizedError('Contrasena actual incorrecta');

  const hashed = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { id: userId },
    data: { password: hashed, mustChangePassword: false },
  });

  return { message: 'Contrasena actualizada correctamente' };
}

export async function me(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true, email: true, name: true, alias: true, avatarUrl: true,
      favoriteTeamId: true, role: true, registeredAt: true,
      phase1Available: true, phase2Available: true, mustChangePassword: true,
      matchPoints: true, groupPoints: true, bestThirdPoints: true, bonusPhase1Points: true,
      knockoutPoints: true, bonusPhase2Points: true, totalPoints: true,
    },
  });
  return user;
}
