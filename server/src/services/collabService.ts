/**
 * Real study-room / battle rooms backed by PostgreSQL (LiveRoom, RoomMembership,
 * RoomMessage). No fake realtime: the client polls, the server is authoritative
 * for membership, scores and the final leaderboard.
 *
 * Enum mapping follows the same convention as `learningSync` on the frontend:
 * backend UPPER_SNAKE enums <-> frontend lower/hyphen values
 * (STUDY_ROOM <-> 'study-room', INVITE_ONLY <-> 'invite-only').
 */
import crypto from 'crypto';
import { prisma } from '../lib/prisma.js';

export type RoomKindInput = 'study' | 'quiz-battle' | 'code-battle' | 'classroom';

const KIND_MAP: Record<RoomKindInput, 'STUDY_ROOM' | 'QUIZ_BATTLE' | 'CODING_BATTLE'> = {
  study: 'STUDY_ROOM',
  classroom: 'STUDY_ROOM',
  'quiz-battle': 'QUIZ_BATTLE',
  'code-battle': 'CODING_BATTLE',
};

const KIND_FROM_DB: Record<string, string> = {
  STUDY_ROOM: 'study-room',
  QUIZ_BATTLE: 'quiz-battle',
  CODING_BATTLE: 'coding-battle',
};

const PRIVACY_TO_DB: Record<string, string> = {
  public: 'PUBLIC',
  private: 'PRIVATE',
  'invite-only': 'INVITE_ONLY',
};

/** Unambiguous alphabet — no O/0, I/1, so room codes are readable aloud. */
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function roomCode(length = 6): string {
  const bytes = crypto.randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i++) out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  return out;
}

function iso(v: Date | null | undefined): string | undefined {
  return v ? v.toISOString() : undefined;
}

function toPublic(room: any) {
  const code = (room.settings as { code?: string } | null)?.code;
  return {
    id: room.id,
    kind: KIND_FROM_DB[room.kind] ?? 'study-room',
    hostId: room.hostId,
    title: room.title,
    privacy: (room.privacy as string).toLowerCase().replace(/_/g, '-'),
    status: (room.status as string).toLowerCase(),
    courseId: room.courseId ?? undefined,
    language: room.language ? (room.language as string).toLowerCase() : undefined,
    createdAt: iso(room.createdAt),
    startedAt: iso(room.startedAt),
    finishedAt: iso(room.finishedAt),
    settings: { code },
    members: Array.isArray(room.memberships)
      ? room.memberships.map((m: any) => ({
          id: m.id,
          userId: m.userId,
          name: m.user?.name,
          role: (m.role as string).toLowerCase(),
          score: m.score ?? 0,
          rank: m.rank ?? undefined,
          joinedAt: iso(m.joinedAt),
        }))
      : undefined,
    memberCount: room._count?.memberships ?? undefined,
  };
}

async function requireMembership(roomId: string, userId: string) {
  const room = await prisma.liveRoom.findUnique({ where: { id: roomId } });
  if (!room) throw new Error('not-found');
  if (room.hostId === userId) return { room, membership: null };
  const membership = await prisma.roomMembership.findUnique({
    where: { roomId_userId: { roomId, userId } },
  });
  if (!membership) throw new Error('forbidden');
  return { room, membership };
}

async function requireHost(roomId: string, userId: string) {
  const room = await prisma.liveRoom.findUnique({ where: { id: roomId } });
  if (!room) throw new Error('not-found');
  if (room.hostId === userId) return room;
  const membership = await prisma.roomMembership.findUnique({
    where: { roomId_userId: { roomId, userId } },
  });
  if (!membership || (membership.role !== 'HOST' && membership.role !== 'MODERATOR')) {
    throw new Error('forbidden');
  }
  return room;
}

export const collabService = {
  /** Create a room; the creator becomes HOST and a 6-char code is generated. */
  async create(
    hostId: string,
    input: { kind: RoomKindInput; title: string; courseId?: string; privacy?: string; language?: 'en' | 'ar' },
  ) {
    const room = await prisma.liveRoom.create({
      data: {
        kind: (KIND_MAP[input.kind] ?? 'STUDY_ROOM') as any,
        hostId,
        title: input.title.slice(0, 120),
        privacy: (PRIVACY_TO_DB[input.privacy ?? 'invite-only'] ?? 'INVITE_ONLY') as any,
        status: 'WAITING',
        courseId: input.courseId,
        language: input.language ? ((input.language === 'ar' ? 'AR' : 'EN') as any) : undefined,
        settings: { code: roomCode() },
        memberships: { create: { userId: hostId, role: 'HOST', joinedAt: new Date() } },
      },
      include: { memberships: { include: { user: { select: { name: true } } } } },
    });
    return toPublic(room);
  },

  /** Discoverable rooms (newest first) with member counts. */
  async list(filter: { kind?: string; status?: string; limit?: number } = {}) {
    const where: any = {};
    if (filter.kind && KIND_MAP[filter.kind as RoomKindInput]) {
      where.kind = KIND_MAP[filter.kind as RoomKindInput];
    }
    if (filter.status) where.status = filter.status.toUpperCase();
    const rooms = await prisma.liveRoom.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: Math.min(Math.max(filter.limit ?? 20, 1), 100),
      include: { memberships: true, _count: { select: { memberships: true } } },
    });
    return rooms.map(toPublic);
  },

  /** Room detail — requires membership unless the room is public. */
  async get(roomId: string, userId: string) {
    const room = await prisma.liveRoom.findUnique({
      where: { id: roomId },
      include: {
        memberships: { include: { user: { select: { name: true } } }, orderBy: { joinedAt: 'asc' } },
        _count: { select: { memberships: true, messages: true } },
      },
    });
    if (!room) throw new Error('not-found');
    if (room.privacy !== 'PUBLIC' && room.hostId !== userId) {
      const membership = await prisma.roomMembership.findUnique({
        where: { roomId_userId: { roomId, userId } },
      });
      if (!membership) throw new Error('forbidden');
    }
    return toPublic(room);
  },

  /** Join a room. INVITE_ONLY rooms require the matching code. */
  async join(roomId: string, userId: string, input: { code?: string; name?: string } = {}) {
    const room = await prisma.liveRoom.findUnique({ where: { id: roomId } });
    if (!room) throw new Error('not-found');
    if (room.status === 'FINISHED') throw new Error('room-closed');
    const expected = (room.settings as { code?: string } | null)?.code;
    if (room.privacy === 'INVITE_ONLY' && room.hostId !== userId && expected && input.code !== expected) {
      throw new Error('invalid-code');
    }
    await prisma.roomMembership.upsert({
      where: { roomId_userId: { roomId, userId } },
      update: {},
      create: { roomId, userId, role: 'PARTICIPANT', joinedAt: new Date(), score: 0 },
    });
    await this.postMessage(roomId, userId, `${input.name ?? 'A learner'} joined the room`, 'SYSTEM', true);
    return this.get(roomId, userId);
  },

  /** Host-only: move WAITING/COUNTDOWN -> RUNNING. */
  async start(roomId: string, actorId: string) {
    const room = await requireHost(roomId, actorId);
    if (room.status === 'RUNNING') return toPublic(room);
    const updated = await prisma.liveRoom.update({
      where: { id: roomId },
      data: { status: 'RUNNING', startedAt: new Date() },
      include: { memberships: { include: { user: { select: { name: true } } } } },
    });
    await this.postMessage(roomId, actorId, 'The room has started', 'SYSTEM', true);
    return toPublic(updated);
  },

  /** Host-only: award points (authoritative scoring — clients never set totals). */
  async award(roomId: string, userId: string, points: number, actorId: string) {
    await requireHost(roomId, actorId);
    const membership = await prisma.roomMembership.findUnique({
      where: { roomId_userId: { roomId, userId } },
    });
    if (!membership) throw new Error('not-found');
    const safePoints = Math.max(-1000, Math.min(1000, Math.trunc(points)));
    const updated = await prisma.roomMembership.update({
      where: { id: membership.id },
      data: { score: (membership.score ?? 0) + safePoints },
    });
    return { membership: updated };
  },

  /** Host-only: rank members and close the room. */
  async finish(roomId: string, actorId: string) {
    await requireHost(roomId, actorId);
    const memberships = await prisma.roomMembership.findMany({
      where: { roomId },
      include: { user: { select: { name: true } } },
    });
    const ranked = [...memberships].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    const finishedAt = new Date();
    await prisma.$transaction(
      ranked.map((m, idx) =>
        prisma.roomMembership.update({ where: { id: m.id }, data: { rank: idx + 1, finishedAt } }),
      ),
    );
    const room = await prisma.liveRoom.update({
      where: { id: roomId },
      data: { status: 'FINISHED', finishedAt },
      include: { memberships: { include: { user: { select: { name: true } } } } },
    });
    const leaderboard = [...room.memberships]
      .sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99))
      .map((m) => ({
        id: m.id,
        userId: m.userId,
        name: m.user?.name,
        role: (m.role as string).toLowerCase(),
        score: m.score ?? 0,
        rank: m.rank ?? undefined,
        joinedAt: iso(m.joinedAt),
      }));
    const winner = leaderboard[0]?.userId;
    await this.postMessage(
      roomId,
      actorId,
      winner
        ? `Room finished — winner: ${leaderboard[0].name ?? 'You'} (${leaderboard[0].score} pts)`
        : 'Room finished — no submissions',
      'SCORE',
      true,
    );
    return {
      room: toPublic(room),
      leaderboard,
      winner,
      code: (room.settings as { code?: string } | null)?.code,
    };
  },

  /** Chat / system / score messages (members and host only). */
  async postMessage(
    roomId: string,
    userId: string,
    content: string,
    kind: 'CHAT' | 'SYSTEM' | 'SCORE' = 'CHAT',
    skipCheck = false,
  ) {
    if (!skipCheck) await requireMembership(roomId, userId);
    return prisma.roomMessage.create({
      data: { roomId, userId, kind, content: content.slice(0, 1000) },
    });
  },

  async listMessages(roomId: string, userId: string, limit = 50) {
    await requireMembership(roomId, userId);
    return prisma.roomMessage.findMany({
      where: { roomId },
      orderBy: { createdAt: 'asc' },
      take: Math.min(Math.max(limit, 1), 200),
      include: { user: { select: { name: true } } },
    });
  },
};