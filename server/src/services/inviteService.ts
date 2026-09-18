import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { Role } from '@prisma/client';
import { prisma } from '../lib/prisma.js';

/** The fixed bootstrap code the Owner "created" (overridable via env). */
export const bootstrapInviteCode = () => (process.env.ADMIN_INVITE_CODE || 'Ahmed').trim();

/** `maxUses = 0` → unlimited. Codes expire only when `expiresAt` is set. */
export function isUsable(
  invite: { active: boolean; expiresAt: Date | null; maxUses: number; uses: number },
  now: Date = new Date(),
) {
  if (!invite.active) return false;
  if (invite.expiresAt && invite.expiresAt.getTime() < now.getTime()) return false;
  if (invite.maxUses > 0 && invite.uses >= invite.maxUses) return false;
  return true;
}

/** Human-friendly, unambiguous code: ADM-7K2P-9QXF. */
export function generateInviteCode(prefix = 'ADM') {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.randomBytes(8);
  let out = '';
  for (const b of bytes) out += alphabet[b % alphabet.length];
  return `${prefix}-${out.slice(0, 4)}-${out.slice(4, 8)}`;
}

export class InviteCodeService {
  /**
   * Idempotently makes sure the fixed bootstrap code exists so an Admin can be
   * onboarded on a fresh database (it is "created by" the earliest Owner).
   */
  async ensureBootstrapCode() {
    const code = bootstrapInviteCode();
    const existing = await prisma.inviteCode.findUnique({ where: { code } });
    if (existing) return existing;
    const owner = await prisma.user.findFirst({
      where: { role: Role.OWNER },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });
    return prisma.inviteCode.create({
      data: {
        code,
        role: Role.ADMIN,
        label: 'Bootstrap (fixed)',
        maxUses: 0,
        createdById: owner?.id ?? null,
      },
    });
  }

  async list() {
    const codes = await prisma.inviteCode.findMany({
      orderBy: [{ createdAt: 'desc' }],
      include: {
        createdBy: { select: { id: true, email: true, name: true } },
        _count: { select: { redeemedBy: true } },
      },
    });
    return codes.map((c) => ({ ...c, usable: isUsable(c) }));
  }

  async create(input: {
    code?: string;
    role?: Role;
    label?: string;
    maxUses?: number;
    expiresAt?: Date | null;
    createdById?: string;
  }) {
    const role = input.role ?? Role.ADMIN;
    const code = (input.code?.trim() || generateInviteCode(role === Role.ADMIN ? 'ADM' : 'INV')).toUpperCase();
    const existing = await prisma.inviteCode.findUnique({ where: { code } });
    if (existing) {
      const err = new Error('code-taken');
      (err as Error & { status?: number }).status = 409;
      throw err;
    }
    const invite = await prisma.inviteCode.create({
      data: {
        code,
        role,
        label: input.label,
        maxUses: input.maxUses ?? 1,
        expiresAt: input.expiresAt ?? null,
        createdById: input.createdById ?? null,
      },
    });
    return { ...invite, usable: isUsable(invite) };
  }

  async update(id: string, input: { active?: boolean; maxUses?: number; expiresAt?: Date | null; label?: string }) {
    const invite = await prisma.inviteCode.update({ where: { id }, data: input });
    return { ...invite, usable: isUsable(invite) };
  }

  async remove(id: string) {
    return prisma.inviteCode.delete({ where: { id } });
  }

  /** A valid, usable code for this role — without consuming it (case-insensitive). */
  async findUsable(code: string, role: Role) {
    const clean = code.trim();
    if (!clean) return null;
    // Exact match first (covers the fixed "Ahmed" bootstrap code as stored),
    // then upper-cased (generated ADM-XXXX-XXXX codes), then case-insensitive.
    let invite = await prisma.inviteCode.findUnique({ where: { code: clean } });
    if (!invite && clean.toUpperCase() !== clean) {
      invite = await prisma.inviteCode.findUnique({ where: { code: clean.toUpperCase() } });
    }
    if (!invite) {
      invite = await prisma.inviteCode.findFirst({
        where: { code: { equals: clean, mode: 'insensitive' } },
      });
    }
    if (!invite || invite.role !== role) return null;
    return isUsable(invite) ? invite : null;
  }

  /** Consumes one use of the code (audit trail: uses + lastUsedAt). */
  async redeem(id: string) {
    return prisma.inviteCode.update({
      where: { id },
      data: { uses: { increment: 1 }, lastUsedAt: new Date() },
    });
  }

  /** Stores the security code on the account + links the invite row it came from. */
  async bindToUser(userId: string, invite: { id: string }, code: string) {
    const securityCodeHash = await bcrypt.hash(code.trim(), 10);
    return prisma.user.update({
      where: { id: userId },
      data: { inviteCodeId: invite.id, securityCodeHash },
      select: { id: true, email: true, name: true, role: true },
    });
  }

  /** Does the entered code match the one this account was onboarded with? */
  async matchesStoredSecurityCode(user: { securityCodeHash: string | null }, code: string) {
    if (!user.securityCodeHash || !code.trim()) return false;
    return bcrypt.compare(code.trim(), user.securityCodeHash);
  }

  /** Codes bound to admin accounts, for the Owner's audit view. */
  async listAdminsWithCodes() {
    return prisma.user.findMany({
      where: { role: Role.ADMIN },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        securityCodeHash: true,
        inviteCode: { select: { id: true, code: true, label: true } },
      },
      take: 100,
    });
  }
}

export const inviteCodeService = new InviteCodeService();
