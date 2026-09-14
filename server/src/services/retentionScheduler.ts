// Retention scheduler — runs retentionService.runAll() on an interval.
// Started once from src/index.ts. Interval default 24h; override with
// RETENTION_INTERVAL_MS. Set RETENTION_ENABLED=false to disable.
import { retentionService } from './retentionService.js';

let timer: NodeJS.Timeout | null = null;

export function startRetentionScheduler(intervalMs?: number): void {
  if (process.env.RETENTION_ENABLED === 'false') return;
  if (timer) return;
  const ms = intervalMs ?? Number(process.env.RETENTION_INTERVAL_MS || 24 * 60 * 60 * 1000);
  if (!Number.isFinite(ms) || ms <= 0) return;
  const run = async () => {
    try {
      const r = await retentionService.runAll();
      const total = Object.values(r.deleted).reduce((a, b) => a + b, 0);
      if (total > 0 || r.errors.length > 0) {
        console.log(
          `[retention] scanned=${r.usersScanned} purgedUsers=${r.usersPurged} deleted=${total} ` +
            `expiredSessions=${r.expiredSessionsDeleted} errors=${r.errors.length}`,
        );
      }
    } catch (e) {
      console.error('[retention] sweep failed:', e);
    }
  };
  setTimeout(() => void run(), 60 * 1000);
  timer = setInterval(() => void run(), ms);
  if (typeof timer.unref === 'function') timer.unref();
}
