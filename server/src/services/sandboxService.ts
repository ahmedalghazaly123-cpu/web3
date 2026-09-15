/**
 * Real code-execution sandbox.
 *
 * - JS: executed in `node:vm` with a frozen minimal sandbox, strict timeout,
 *   captured console output, and a hard result-size cap.
 * - Python: executed via child_process spawn with timeout (best-effort).
 * - Every run is persisted in SandboxRun and ownership is enforced.
 *
 * NOTE: node:vm is an isolation boundary against *accidental* misuse, not a
 * fully hardened security sandbox. For hostile multi-tenant code, run this
 * service behind a container/gVisor boundary.
 */
import vm from 'node:vm';
import { spawn } from 'node:child_process';
import { prisma } from '../lib/prisma.js';

const MAX_CODE_LENGTH = 5000;
const MAX_TIMEOUT_MS = 5000;
const DEFAULT_TIMEOUT_MS = 2000;
const MAX_OUTPUT_CHARS = 20_000;
const MAX_STDOUT = 64;

/** `node:vm` reports a timeout through this error code (not a throw type). */
function isTimeoutError(err: unknown): boolean {
  return Boolean(err && typeof err === 'object' && (err as { code?: string }).code === 'ERR_SCRIPT_EXECUTION_TIMEOUT');
}

export interface SandboxInput {
  language: 'JS' | 'PYTHON';
  code: string;
  timeoutMs?: number;
  stdin?: string;
}

export interface SandboxOutput {
  status: 'SUCCESS' | 'TIMEOUT' | 'ERROR' | 'REJECTED';
  stdout: string[];
  stderr: string;
  result?: string;
  durationMs: number;
  error?: string;
}

/**
 * Static deny-lists (defence in depth).
 *
 * `node:vm` already hides Node globals — inside the context `typeof process` is
 * `undefined` — but that context is not a hardened security boundary, so the
 * obvious escape routes are refused *before* anything runs and the learner gets
 * a clear reason instead of a cryptic ReferenceError.
 *
 * Only reachable/dangerous identifiers are listed: bare module names such as
 * `os` stay allowed because without `require`/`import` they simply do not exist.
 */
const JS_DENY_LIST: ReadonlyArray<readonly [RegExp, string]> = [
  [/\bprocess\b/, 'process is not available in the sandbox'],
  [/\brequire\b/, 'require() is not available in the sandbox'],
  [/\bimport\s*\(/, 'dynamic import() is not available in the sandbox'],
  [/\bmodule\b/, 'module is not available in the sandbox'],
  [/\bexports\b/, 'exports is not available in the sandbox'],
  [/\bglobalThis\b/, 'globalThis is not available in the sandbox'],
  [/\bglobal\b/, 'global is not available in the sandbox'],
  [/\b__dirname\b|\b__filename\b/, '__dirname/__filename are not available in the sandbox'],
  [/\beval\s*\(/, 'eval() is blocked in the sandbox'],
  [/\bFunction\s*\(/, 'Function() is blocked in the sandbox'],
  [/\bchild_process\b/, 'child_process is blocked in the sandbox'],
  [/\bWorker\b|\bSharedArrayBuffer\b|\bAtomics\b/, 'Worker/SharedArrayBuffer/Atomics are blocked in the sandbox'],
];

/**
 * Python runs in a real child process, so module names ARE reachable there and
 * must be blocked by name. `open()` is refused for the same reason.
 */
const PY_DENY_LIST: ReadonlyArray<readonly [RegExp, string]> = [
  [/\bfrom\s+(os|sys|subprocess|socket|shutil|pathlib|ctypes|pickle|marshal|importlib|multiprocessing|threading|signal|resource|pty|platform|webbrowser|http|urllib|requests|builtins)\s+import\b/, 'importing privileged modules is blocked in the sandbox'],
  [/\bimport\s+(os|sys|subprocess|socket|shutil|pathlib|ctypes|pickle|marshal|importlib|multiprocessing|threading|signal|resource|pty|platform|webbrowser|http|urllib|requests|builtins)\b/, 'importing privileged modules is blocked in the sandbox'],
  [/\b__import__\s*\(/, '__import__() is blocked in the sandbox'],
  [/\beval\s*\(|\bexec\s*\(|\bcompile\s*\(/, 'eval()/exec()/compile() are blocked in the sandbox'],
  [/\bopen\s*\(/, 'file access (open()) is blocked in the sandbox'],
  [/\bos\.\w+|\bsys\.\w+|\bsubprocess\.\w+/, 'os/sys/subprocess access is blocked in the sandbox'],
  [/\bglobals\s*\(|\blocals\s*\(/, 'globals()/locals() are blocked in the sandbox'],
  [/\bbreakpoint\s*\(/, 'breakpoint() is blocked in the sandbox'],
];

function staticVerdict(input: SandboxInput): { allowed: boolean; reason?: string } | null {
  const list = input.language === 'PYTHON' ? PY_DENY_LIST : JS_DENY_LIST;
  for (const [pattern, reason] of list) {
    if (pattern.test(input.code)) return { allowed: false, reason };
  }
  return null;
}

export function validateInput(input: SandboxInput): { allowed: boolean; reason?: string } {
  if (!input.code || !input.code.trim()) return { allowed: false, reason: 'code-required' };
  if (input.code.length > MAX_CODE_LENGTH) return { allowed: false, reason: `code exceeds ${MAX_CODE_LENGTH} chars` };
  if (input.stdin && input.stdin.length > MAX_CODE_LENGTH) return { allowed: false, reason: `stdin exceeds ${MAX_CODE_LENGTH} chars` };
  const timeout = input.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  if (timeout > MAX_TIMEOUT_MS) return { allowed: false, reason: `timeout exceeds ${MAX_TIMEOUT_MS}ms` };
  if (input.language !== 'JS' && input.language !== 'PYTHON') return { allowed: false, reason: 'unsupported-language' };
  const blocked = staticVerdict(input);
  if (blocked) return blocked;
  return { allowed: true };
}

function truncate(s: string, max = MAX_OUTPUT_CHARS): string {
  return s.length > max ? s.slice(0, max) + '…[truncated]' : s;
}

// ── JS execution via node:vm (deterministic, frozen globalThis, hard timeout) ──
interface VmContext {
  console: {
    log(...args: unknown[]): void;
    warn(...args: unknown[]): void;
    error(...args: unknown[]): void;
  };
  /** Sandboxed timers are deliberately inert: queued code never runs. */
  setTimeout: (_fn: () => void, _ms?: number) => number;
  clearTimeout: () => void;
  Math: typeof Math;
  Date: typeof Date;
  Array: typeof Array;
  Object: typeof Object;
  String: typeof String;
  Number: typeof Number;
  Boolean: typeof Boolean;
  Promise: typeof Promise;
  JSON: typeof JSON;
  RegExp: typeof RegExp;
  Map: typeof Map;
  Set: typeof Set;
  consoleOutput: string[];
  setTimeoutIds: ReturnType<typeof setTimeout>[];
}

function buildVmContext(): VmContext {
  const out: string[] = [];
  const ctx: VmContext = {
    console: {
      log: (...a) => out.push(a.map(String).join(' ')),
      warn: (...a) => out.push('[warn] ' + a.map(String).join(' ')),
      error: (...a) => out.push('[error] ' + a.map(String).join(' ')),
    },
    setTimeout: (_fn: () => void, _ms?: number) => {
      /* no-op — no queued-code execution; keeps the sandbox deterministic */
      return -1;
    },
    clearTimeout: () => {},
    Math,
    Date,
    Array,
    Object,
    String,
    Number,
    Boolean,
    Promise,
    JSON,
    RegExp,
    Map,
    Set,
    consoleOutput: out,
    setTimeoutIds: [],
  };
  return ctx;
}

function runJs(code: string, timeoutMs: number, _stdin?: string): Promise<SandboxOutput> {
  return new Promise((resolve) => {
    const context = buildVmContext();
    const ctx = vm.createContext(context);
    const script = new vm.Script(code, { filename: 'sandbox.js' });
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        resolve({
          status: 'TIMEOUT',
          stdout: context.consoleOutput.slice(0, MAX_STDOUT),
          stderr: 'execution timed out after ' + timeoutMs + 'ms',
          durationMs: timeoutMs,
        });
      }
    }, timeoutMs);
    const startedAt = Date.now();
    try {
      const result = script.runInContext(ctx, { timeout: timeoutMs });
      clearTimeout(timer);
      settled = true;
      const stdout = context.consoleOutput.slice(0, MAX_STDOUT);
      resolve({
        status: 'SUCCESS',
        stdout,
        stderr: '',
        result: result !== undefined ? truncate(String(result)) : undefined,
        durationMs: Date.now() - startedAt,
      });
    } catch (err) {
      clearTimeout(timer);
      settled = true;
      const stdout = context.consoleOutput.slice(0, MAX_STDOUT);
      const timedOut = isTimeoutError(err);
      const message = err instanceof Error ? err.message : String(err);
      resolve({
        status: timedOut ? 'TIMEOUT' : 'ERROR',
        stdout,
        stderr: timedOut ? `execution timed out after ${timeoutMs}ms` : message,
        error: timedOut ? `execution timed out after ${timeoutMs}ms` : message,
        durationMs: Date.now() - startedAt,
      });
    }
  });
}

// ── Python execution via child_process spawn (best-effort, timeout-protected) ──
function runPython(code: string, timeoutMs: number, stdin?: string): Promise<SandboxOutput> {
  return new Promise((resolve) => {
    let killed = false;
    const timer = setTimeout(() => {
      if (!killed) {
        killed = true;
        resolve({
          status: 'TIMEOUT',
          stdout: [],
          stderr: 'python execution timed out after ' + timeoutMs + 'ms',
          durationMs: timeoutMs,
        });
      }
    }, timeoutMs);

    // Prefer an explicitly configured binary; otherwise use the platform
    // default (`python3` on POSIX, `python` on Windows).
    const bins = process.env.PYTHON_BIN
      ? [process.env.PYTHON_BIN]
      : process.platform === 'win32'
        ? ['python', 'python3']
        : ['python3', 'python'];
    const startedAt = Date.now();
    const py = spawn(bins[0], ['-u'], {
      timeout: Math.floor(timeoutMs / 1000) + 1,
      env: { ...process.env, PYTHONUNBUFFERED: '1' },
    });

    const stdout: string[] = [];
    const stderrOut: string[] = [];

    py.stdout?.on('data', (d: Buffer) => {
      const line = d.toString().trim();
      if (line) stdout.push(line);
    });
    py.stderr?.on('data', (d: Buffer) => {
      const line = d.toString().trim();
      if (line) stderrOut.push(line);
    });

    py.on('close', (code) => {
      if (killed) return;
      killed = true;
      clearTimeout(timer);
      const status = code === 0 ? 'SUCCESS' : 'ERROR';
      resolve({
        status,
        stdout: stdout.slice(0, MAX_STDOUT),
        stderr: stderrOut.join('\n').slice(0, MAX_OUTPUT_CHARS),
        result: status === 'SUCCESS' && stdout.length ? truncate(stdout.join('\n')) : undefined,
        durationMs: Date.now() - startedAt,
      });
    });

    py.on('error', (err) => {
      if (killed) return;
      killed = true;
      clearTimeout(timer);
      const code = (err as NodeJS.ErrnoException).code;
      resolve({
        status: 'ERROR',
        stdout: [],
        stderr: code === 'ENOENT'
          ? `python runtime not available (tried "${bins[0]}"); install Python or set PYTHON_BIN`
          : err instanceof Error ? err.message : 'spawn failed',
        durationMs: Date.now() - startedAt,
      });
    });

    if (stdin) py.stdin?.write(stdin);
    py.stdin?.end();
  });
}

// ── Persistence helpers ─────────────────────────────────────────────────────

export async function createRun(input: SandboxInput, ownerId: string): Promise<{ runId: string }> {
  const run = await prisma.sandboxRun.create({
    data: {
      studentId: ownerId,
      language: input.language.toUpperCase() as any,
      code: input.code.slice(0, MAX_CODE_LENGTH),
      stdin: input.stdin,
      status: 'PENDING',
    },
  });
  return { runId: run.id };
}

export async function recordRunResult(
  runId: string,
  output: SandboxOutput,
  timedOut = false,
): Promise<void> {
  await prisma.sandboxRun.update({
    where: { id: runId },
    data: {
      stdout: output.stdout.join('\n'),
      stderr: output.stderr,
      // Prisma enum has no REJECTED value — rejected code is stored as BLOCKED.
      status: output.status === 'REJECTED' ? 'BLOCKED' : output.status,
      timedOut: timedOut || output.status === 'TIMEOUT',
      durationMs: output.durationMs,
      exitCode: output.status === 'SUCCESS' ? 0 : 1,
    },
  });
}

// ── Ownership-checked reads ────────────────────────────────────────────────

export async function getRun(runId: string, ownerId: string) {
  const run = await prisma.sandboxRun.findUnique({ where: { id: runId } });
  if (!run) throw new Error('not-found');
  if (run.studentId !== ownerId) throw new Error('forbidden');
  return run;
}

export async function listRuns(ownerId: string, limit = 20) {
  return prisma.sandboxRun.findMany({
    where: { studentId: ownerId },
    orderBy: { createdAt: 'desc' },
    take: Math.min(Math.max(limit, 1), 100),
  });
}

// ── Execution dispatcher ───────────────────────────────────────────────────

export async function execute(input: SandboxInput): Promise<SandboxOutput> {
  const verdict = validateInput(input);
  if (!verdict.allowed) {
    return {
      status: 'REJECTED',
      stdout: [],
      stderr: verdict.reason ?? 'rejected',
      error: verdict.reason ?? 'rejected',
      durationMs: 0,
    };
  }
  const timeoutMs = Math.min(input.timeoutMs ?? DEFAULT_TIMEOUT_MS, MAX_TIMEOUT_MS);
  const out = input.language === 'PYTHON'
    ? await runPython(input.code, timeoutMs, input.stdin)
    : await runJs(input.code, timeoutMs, input.stdin);
  return { ...out, stdout: out.stdout.map((line) => truncate(line, MAX_OUTPUT_CHARS)) };
}

// ── SandboxService ─────────────────────────────────────────────────────────
export const sandboxService = {
  validateInput,
  execute,
  createRun,
  recordRunResult,
  getRun,
  listRuns,
  MAX_CODE_LENGTH,
  MAX_TIMEOUT_MS,
  DEFAULT_TIMEOUT_MS,
};
