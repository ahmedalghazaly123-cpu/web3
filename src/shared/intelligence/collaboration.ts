// Phase 26-27: collaboration + classroom foundations (local state machine, honest).
import type { EntityId, LiveRoom } from '../domain';
import { store } from '../services/store.ts';
import { learningEvents } from './learning-events.ts';

export function createStudyRoom(hostId: EntityId, title: string): LiveRoom {
  const room: LiveRoom = {
    id: `room-${hostId}-${title.length}`, kind: 'study-room', hostId, title,
    privacy: 'invite-only', status: 'waiting', createdAt: new Date().toISOString(),
  };
  store.rooms.save(room);
  return room;
}

export function logClassroomAttendance(studentId: EntityId, roomId: EntityId, nowIso: string): void {
  learningEvents.ingest({
    kind: 'session-started', studentId, source: 'classroom',
    happenedAt: nowIso, sessionId: roomId, clientKey: `attend-${studentId}-${roomId}`,
  });
}

export const collaborationEngine = { createStudyRoom, logClassroomAttendance };
