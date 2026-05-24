import _bcrypt from 'bcryptjs';
const bcrypt = _bcrypt;
import crypto from 'node:crypto';
import prisma from '../../lib/prisma.js';
import { ConflictError, NotFoundError } from '../../utils/errors.js';
import { sendInvitationEmail } from '../../lib/email.js';

function generateTempPassword(): string {
  return crypto.randomBytes(4).toString('hex').toUpperCase().slice(0, 8);
}

export async function createUserWithInvite(data: { name: string; email: string; role?: string; leagueId?: string }) {
  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) throw new ConflictError('Este email ya esta registrado');

  const tempPassword = generateTempPassword();
  const hashed = await bcrypt.hash(tempPassword, 10);

  const tournament = await prisma.tournament.findFirst();
  let phase1Available = true;
  let phase2Available = true;

  if (tournament) {
    if (tournament.status !== 'SETUP' && tournament.status !== 'PHASE1_OPEN') {
      phase1Available = false;
    }
    if (tournament.status === 'PHASE2_CLOSED' || tournament.status === 'FINISHED') {
      phase2Available = false;
    }
  }

  const user = await prisma.user.create({
    data: {
      email: data.email,
      password: hashed,
      name: data.name,
      role: data.role || 'PLAYER',
      mustChangePassword: true,
      phase1Available,
      phase2Available,
    },
  });

  // Auto-assign to league if specified
  if (data.leagueId) {
    await prisma.leagueUser.create({
      data: { leagueId: data.leagueId, userId: user.id },
    }).catch(() => {}); // Silently ignore if league doesn't exist
  }

  try {
    await sendInvitationEmail(data.email, data.name, tempPassword);
  } catch (err) {
    console.error('Error sending invitation email:', err);
    const { password: _, ...safeUser } = user;
    return { user: safeUser, emailSent: false, tempPassword };
  }

  const { password: _, ...safeUser } = user;
  return { user: safeUser, emailSent: true };
}

export async function deleteUser(userId: string, requestingUserId: string) {
  if (userId === requestingUserId) {
    throw new ConflictError('No puedes eliminarte a ti mismo');
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new NotFoundError('Usuario no encontrado');

  await prisma.user.delete({ where: { id: userId } });
}

export async function listUsers() {
  return prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      alias: true,
      role: true,
      mustChangePassword: true,
      registeredAt: true,
      totalPoints: true,
      phase1Available: true,
      phase2Available: true,
      leagues: { select: { league: { select: { id: true, name: true } } } },
    },
    orderBy: { registeredAt: 'desc' },
  });
}
