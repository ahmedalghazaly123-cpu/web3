// ━━━ Code Sandbox adapter ━━━
// The ONLY place that talks to api.sandbox.*. Code is executed server-side
// (node:vm for JS, a timeout-guarded child process for Python) — never in the
// browser, so a heavy or hostile snippet cannot freeze the page. Every run is
// persisted server-side (SandboxRun) and returned with its real status.

import { api } from './api';

const TOKEN_KEY = 'lp-auth-token';

export type SandboxLanguage = 'js' | 'python';

export interface SandboxRunResult {
  ok: boolean;
  status: 'SUCCESS' | 'ERROR' | 'TIMEOUT' | 'REJECTED' | 'OFFLINE';
  stdout: string[];
  stderr: string;
  result?: string;
  durationMs: number;
  reason?: string;
}

export const sandbox = {
  /** Static pre-flight guard — same rules the execution path enforces. */
  async validate(language: SandboxLanguage, code: string): Promise<{ allowed: boolean; reason: string }> {
    if (!localStorage.getItem(TOKEN_KEY)) {
      return { allowed: false, reason: 'Sign in to run code in the sandbox.' };
    }
    try {
      return (await api.sandbox.validate({ language, code })) as { allowed: boolean; reason: string };
    } catch (e) {
      return { allowed: false, reason: (e as Error).message };
    }
  },

  /** Execute on the backend and normalise the result shape for the UI. */
  async run(
    language: SandboxLanguage,
    code: string,
    timeoutMs?: number,
    stdin?: string,
  ): Promise<SandboxRunResult> {
    if (!localStorage.getItem(TOKEN_KEY)) {
      return {
        ok: false,
        status: 'OFFLINE',
        stdout: [],
        stderr: '',
        durationMs: 0,
        reason: 'Sign in to run code in the sandbox.',
      };
    }
    try {
      const res = (await api.sandbox.run({ language, code, timeoutMs, stdin })) as { run?: Record<string, any> };
      const run = res.run ?? {};
      return {
        ok: run.status === 'SUCCESS',
        status: run.status ?? 'ERROR',
        stdout: run.stdout ?? [],
        stderr: run.stderr ?? '',
        result: run.result,
        durationMs: run.durationMs ?? 0,
        reason: run.accepted === false ? run.reason : undefined,
      };
    } catch (e) {
      return {
        ok: false,
        status: 'OFFLINE',
        stdout: [],
        stderr: '',
        durationMs: 0,
        reason: (e as Error).message,
      };
    }
  },

  /** The learner's own run history (server-persisted, newest first). */
  async history(limit = 5): Promise<Array<Record<string, any>>> {
    try {
      const res = (await api.sandbox.listRuns(limit)) as { runs?: Array<Record<string, any>> };
      return res.runs ?? [];
    } catch {
      return [];
    }
  },
};