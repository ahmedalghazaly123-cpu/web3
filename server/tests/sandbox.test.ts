import { describe, it, expect } from 'vitest';
import { validateInput, execute } from '../src/services/sandboxService';

/**
 * Sandbox unit tests — no database and no HTTP server required.
 * They pin the guarantees the API and the UI rely on: static guards, real
 * execution, captured output, hard timeouts and a locked-down global scope.
 */
describe('Sandbox service — static guards', () => {
  it('rejects empty code', () => {
    expect(validateInput({ language: 'JS', code: '   ' }).allowed).toBe(false);
  });

  it('rejects code above the size cap', () => {
    expect(validateInput({ language: 'JS', code: 'x'.repeat(5001) }).allowed).toBe(false);
  });

  it('rejects timeouts above the hard cap', () => {
    expect(validateInput({ language: 'JS', code: '1 + 1', timeoutMs: 9000 }).allowed).toBe(false);
  });

  it('rejects oversized stdin', () => {
    expect(validateInput({ language: 'PYTHON', code: 'print(1)', stdin: 'x'.repeat(5001) }).allowed).toBe(false);
  });

  it('rejects unsupported languages', () => {
    expect(validateInput({ language: 'RUBY' as unknown as 'JS', code: 'puts 1' }).allowed).toBe(false);
  });

  it('accepts a small valid snippet', () => {
    expect(validateInput({ language: 'JS', code: '1 + 1' }).allowed).toBe(true);
  });

  it('rejects process and other Node escape hatches', () => {
    expect(validateInput({ language: 'JS', code: 'process.exit(1)' }).allowed).toBe(false);
    expect(validateInput({ language: 'JS', code: "require('fs')" }).allowed).toBe(false);
    expect(validateInput({ language: 'JS', code: 'globalThis.x = 1' }).allowed).toBe(false);
    expect(validateInput({ language: 'JS', code: 'eval("1+1")' }).allowed).toBe(false);
    expect(validateInput({ language: 'JS', code: 'new Function("return 1")()' }).allowed).toBe(false);
  });

  it('keeps ordinary identifiers that merely contain a blocked word', () => {
    expect(validateInput({ language: 'JS', code: 'const preprocessing = 2; preprocessing + 1' }).allowed).toBe(true);
    expect(validateInput({ language: 'JS', code: 'const modules = [1, 2]; modules.length' }).allowed).toBe(true);
  });

  it('rejects privileged Python modules and file access', () => {
    expect(validateInput({ language: 'PYTHON', code: 'import os' }).allowed).toBe(false);
    expect(validateInput({ language: 'PYTHON', code: 'from subprocess import run' }).allowed).toBe(false);
    expect(validateInput({ language: 'PYTHON', code: 'open("/etc/passwd").read()' }).allowed).toBe(false);
    expect(validateInput({ language: 'PYTHON', code: '__import__("os").system("id")' }).allowed).toBe(false);
  });

  it('still allows normal Python that reads stdin', () => {
    expect(validateInput({ language: 'PYTHON', code: 'name = input()\nprint(name)' }).allowed).toBe(true);
    expect(validateInput({ language: 'PYTHON', code: 'print(sum([1, 2, 3]))' }).allowed).toBe(true);
  });
});

describe('Sandbox service — JavaScript execution', () => {
  it('captures console output and the last expression value', async () => {
    const out = await execute({ language: 'JS', code: 'console.log("hi");\n2 + 3;' });
    expect(out.status).toBe('SUCCESS');
    expect(out.stdout).toEqual(['hi']);
    expect(out.result).toBe('5');
  });

  it('reports runtime errors without leaking the process', async () => {
    const out = await execute({ language: 'JS', code: 'throw new Error("boom");' });
    expect(out.status).toBe('ERROR');
    expect(out.stderr).toContain('boom');
  });

  it('enforces the timeout on infinite loops', async () => {
    const out = await execute({ language: 'JS', code: 'while (true) {}', timeoutMs: 250 });
    expect(out.status).toBe('TIMEOUT');
    expect(out.stderr).toContain('timed out');
  });

  it('does not expose other Node globals to sandboxed code', async () => {
    const out = await execute({ language: 'JS', code: 'typeof Buffer;' });
    expect(out.status).toBe('SUCCESS');
    expect(out.result).toBe('undefined');
  });

  it('refuses process access before executing anything', async () => {
    const out = await execute({ language: 'JS', code: 'process.exit(1)' });
    expect(out.status).toBe('REJECTED');
    expect(out.stderr).toContain('process is not available');
    expect(out.durationMs).toBe(0);
  });

  it('refuses require/import escapes', async () => {
    expect((await execute({ language: 'JS', code: "require('node:fs')" })).status).toBe('REJECTED');
    expect((await execute({ language: 'JS', code: 'import("node:fs")' })).status).toBe('REJECTED');
  });

  it('never executes queued code scheduled through setTimeout', async () => {
    const out = await execute({ language: 'JS', code: 'setTimeout(() => console.log("late"), 0); "scheduled";' });
    expect(out.stdout).toEqual([]);
    expect(out.result).toBe('scheduled');
  });

  it('returns REJECTED for code blocked by the static guards', async () => {
    const out = await execute({ language: 'JS', code: '   ' });
    expect(out.status).toBe('REJECTED');
  });
});

describe('Sandbox service — Python dispatch', () => {
  it('returns a terminal status (never hangs) for Python snippets', async () => {
    const out = await execute({ language: 'PYTHON', code: 'print("ok")', timeoutMs: 4000 });
    expect(['SUCCESS', 'ERROR']).toContain(out.status);
  }, 20000);
});