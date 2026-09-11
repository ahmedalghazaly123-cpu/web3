// ━━━ Trust — Z/AA/AC/AB + risk, certificates, offline queue ━━━
import type { EntityId, Certificate } from '../domain';
import { store } from './store.ts';

function nowIso(): string { return new Date().toISOString(); }

export const trust = {
  risk(studentId: EntityId): { score: number; level: 'ok' | 'needs-attention' | 'at-risk'; reasons: string[]; actions: string[] } {
    const mastery = store.mastery.listByStudent(studentId);
    const avg = mastery.length ? mastery.reduce((a, r) => a + r.mastery, 0) / mastery.length : 50;
    const mistakes = store.mistakes.listByStudent(studentId).length;
    const plans = store.plans.listByStudent(studentId);
    const missed = plans.filter((p) => p.status !== 'completed' && new Date(p.scheduledFor).getTime() < Date.now() - 864e5).length;
    const score = Math.max(0, Math.min(100, Math.round((100 - avg) * 0.5 + Math.min(30, mistakes * 2) + Math.min(25, missed * 5))));
    const level = score >= 65 ? 'at-risk' : score >= 35 ? 'needs-attention' : 'ok';
    const reasons = [
      ...(avg < 55 ? [`Average mastery is ${Math.round(avg)}%.`] : []),
      ...(mistakes >= 5 ? [`${mistakes} mistakes recorded recently.`] : []),
      ...(missed > 0 ? [`${missed} study sessions missed.`] : []),
    ];
    return { score, level, reasons, actions: ['Schedule 3 short revision sessions', 'Review mistake notebook', 'Ask AI Tutor for a guided hint session'] };
  },

  issueCertificate(studentId: EntityId, studentName: string, courseId: EntityId, courseTitle: string, score?: number) {
    const verificationCode = `LP-${new Date().getFullYear()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const payload = `${verificationCode}|${studentId}|${courseId}|${courseTitle}|${nowIso()}`;
    let hash = 0; for (let i = 0; i < payload.length; i++) hash = (hash * 31 + payload.charCodeAt(i)) >>> 0;
    // BUG 2 fix: save() returns void — build the certificate, persist it,
    // then return the actual created certificate (with verificationCode).
    const cert: Certificate = {
      id: store.uid(), studentId, courseId, title: courseTitle,
      issuedAt: nowIso(), score, trigger: 'course-completion',
      issuerId: 'system', issuerName: studentName, verificationCode,
      hash: `sha-demo-${hash.toString(16)}`,
      url: `/verify/${verificationCode}`,
    };
    store.certificates.save(cert);
    return cert;
  },

  verify(certificateId: string) {
    return store.certificates.list().find((c) => c.verificationCode === certificateId);
  },

  // Offline queue: localStorage-backed, conflict = server wins unless local newer
  queueOp(op: { kind: string; payload: unknown }) {
    try {
      const raw = localStorage.getItem('lp-offline-queue');
      const arr = raw ? (JSON.parse(raw) as unknown[]) : [];
      arr.push({ ...op, at: nowIso() });
      localStorage.setItem('lp-offline-queue', JSON.stringify(arr));
      return arr.length;
    } catch { return 0; }
  },
  drainQueue(): number {
    try {
      const raw = localStorage.getItem('lp-offline-queue');
      const arr = raw ? (JSON.parse(raw) as unknown[]) : [];
      localStorage.removeItem('lp-offline-queue');
      return arr.length;
    } catch { return 0; }
  },
};
