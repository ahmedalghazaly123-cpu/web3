// ━━━ Collab — T/U/AH/AG + moderation, no fake realtime ━━━
// Local rooms with explicit state machine. No WebSocket dependency.
// Scores computed locally from submissions; server-authoritative later.

import type { EntityId, LiveRoom } from '../domain';
import { store } from './store.ts';

export const collab = {
  createRoom(hostId: EntityId, kind: 'study' | 'quiz-battle' | 'code-battle' | 'classroom', title: string, courseId?: EntityId) {
    const code = Math.random().toString(36).slice(2, 8).toUpperCase();
    const mapped = kind === 'study' || kind === 'classroom' ? 'study-room' : kind === 'quiz-battle' ? 'quiz-battle' : 'coding-battle';
    const room: LiveRoom = {
      id: store.uid(), kind: mapped, hostId, title,
      privacy: 'invite-only', status: 'waiting', courseId,
      createdAt: new Date().toISOString(),
      settings: { code },
    };
    store.rooms.save(room);
    return room;
  },
  join(roomId: EntityId, userId: EntityId, _name: string) {
    const room = store.rooms.get(roomId);
    if (!room || (room.status !== 'waiting' && room.status !== 'countdown')) return { ok: false as const, reason: 'Room is not accepting members.' };
    store.roomMembers.save({ id: store.uid(), roomId, userId, role: 'participant', score: 0, joinedAt: new Date().toISOString() });
    return { ok: true as const };
  },
  start(roomId: EntityId) {
    const room = store.rooms.get(roomId);
    if (!room) return undefined;
    const next = { ...room, status: 'running' as const, startedAt: new Date().toISOString() };
    store.rooms.save(next);
    return next;
  },
  finish(roomId: EntityId) {
    const room = store.rooms.get(roomId);
    if (!room) return undefined;
    const members = [...store.roomMembers.listByRoom(roomId)].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    const winner = members[0]?.userId;
    const code = (room.settings as { code?: string } | undefined)?.code ?? '';
    const next = { ...room, status: 'finished' as const, finishedAt: new Date().toISOString() };
    store.rooms.save(next);
    return { room: next, leaderboard: members, winner, code };
  },
  award(roomId: EntityId, userId: EntityId, points: number) {
    const m = store.roomMembers.listByRoom(roomId).find((x) => x.userId === userId);
    if (!m) return undefined;
    const next = { ...m, score: (m.score ?? 0) + points };
    store.roomMembers.save(next);
    return next;
  },
};
