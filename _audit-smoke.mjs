// Smoke test v6 — dependency-free static server over ./dist (SPA fallback) + route/asset/bundle/i18n checks
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync, readdirSync } from 'node:fs';
import { join, extname, normalize } from 'node:path';

const cwd = 'c:/Users/ahmed/OneDrive/Desktop/web3';
const DIST = join(cwd, 'dist');
const PORT = 3161;
const BASE = `http://127.0.0.1:${PORT}`;

const ROUTES = [
  '/', '/account-type', '/login/student', '/login/teacher', '/login/admin', '/login/owner',
  '/dashboard', '/courses', '/courses/calculus-1', '/courses/calculus-1/lessons/l3',
  '/ai-tutor', '/planner', '/progress', '/search', '/notifications',
  '/assessment/quiz-1', '/assessment/quiz-1/exam', '/results/quiz-1',
  '/settings', '/profile',
  '/hub', '/voice', '/ask', '/studio', '/adaptive', '/paths', '/compete', '/focus', '/achieve', '/care',
  '/teacher', '/teacher/classes', '/teacher/assignments', '/teacher/exams', '/teacher/students', '/teacher/analytics',
  '/admin', '/admin/users', '/admin/organizations', '/admin/content', '/admin/ai-usage', '/admin/ai-costs',
  '/admin/audit-logs', '/admin/security-events', '/admin/permissions', '/admin/system-health',
  '/owner', '/owner/access', '/owner/roles', '/owner/permissions', '/owner/security', '/owner/audit', '/owner/settings',
  '/this-route-does-not-exist',
];
const ASSETS = ['/favicon.svg', '/icons.svg', '/avatars/student.svg', '/covers/calculus-1.svg', '/illustrations/empty-search.svg'];

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json', '.png': 'image/png', '.ico': 'image/x-icon' };

const server = createServer((req, res) => {
  try {
    let p = decodeURIComponent((req.url || '/').split('?')[0]);
    if (p.includes('\0') || p.includes('..')) { res.writeHead(400); res.end('bad'); return; }
    let file = normalize(join(DIST, p === '/' ? 'index.html' : p.slice(1)));
    if (!file.startsWith(DIST)) { res.writeHead(400); res.end('bad'); return; }
    if (!existsSync(file) || statSync(file).isDirectory()) file = join(DIST, 'index.html'); // SPA fallback
    const body = readFileSync(file);
    res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream' });
    res.end(body);
  } catch { res.writeHead(500); res.end('err'); }
});

server.listen(PORT, '127.0.0.1', async () => {
  console.log(`STATIC_UP ${PORT} dist=${existsSync(join(DIST, 'index.html'))}`);
  let fail = 0;
  const check = async (path, wantRoot, label) => {
    try {
      const r = await fetch(`${BASE}${path}`);
      const body = await r.text();
      const ok = wantRoot ? (r.status === 200 && body.includes('<div id="root">')) : (r.status === 200 && body.length > 0);
      if (!ok) fail++;
      console.log(`${r.status} ${ok ? 'OK' : 'BAD'} ${label} ${path} len=${body.length}`);
    } catch (e) { fail++; console.log(`ERR ${label} ${path} ${e.message}`); }
  };
  // wait for listen socket
  await new Promise((r) => setTimeout(r, 300));
  for (const route of ROUTES) await check(route, true, 'route');
  for (const a of ASSETS) await check(a, false, 'asset');
  // JS bundle sanity: index.html references /assets/*.js — confirm at least one exists
  try {
    const html = await (await fetch(`${BASE}/`)).text();
    const m = html.match(/\/assets\/[^"']+\.js/);
    console.log(`BUNDLE_REF=${m ? m[0] : '<none>'}`);
    if (m) await check(m[0], false, 'bundle');
    else fail++;
  } catch (e) { fail++; console.log(`ERR bundle ${e.message}`); }
  // i18n deep parity: every en leaf key must exist in ar (and vice versa) for every namespace
  try {
    const load = (lang) => {
      const dir = join(cwd, 'src/i18n/locales', lang);
      const out = {};
      for (const f of readdirSync(dir)) {
        if (!f.endsWith('.ts')) continue;
        let src = readFileSync(join(dir, f), 'utf8').replace(/\r\n/g, '\n');
        src = src.replace(/\bas\s+const\b/g, ''); // strip `as const` casts
        const m = src.match(/^export\s+const\s+(\w+)\s*(:[^=]+)?=/);
        if (!m) { out[f.replace(/\.ts$/, '')] = null; continue; }
        let body = src.slice(m.index + m[0].length).trim();
        body = body.split(/\nexport\s/)[0].trim().replace(/;+\s*$/, '');
        try { out[f.replace(/\.ts$/, '')] = new Function(`"use strict"; return (${body})`)(); }
        catch { out[f.replace(/\.ts$/, '')] = null; }
      }
      return out;
    };
    const flatten = (obj, prefix = '') => {
      const res = [];
      if (!obj || typeof obj !== 'object') return res;
      for (const [k, v] of Object.entries(obj)) {
        const key = prefix ? `${prefix}.${k}` : k;
        if (v && typeof v === 'object' && !Array.isArray(v)) res.push(...flatten(v, key));
        else res.push(key);
      }
      return res;
    };
    const en = load('en'), ar = load('ar');
    const nsEn = Object.keys(en).filter((n) => en[n]);
    const nsAr = Object.keys(ar).filter((n) => ar[n]);
    console.log(`I18N_NAMESPACES en=[${nsEn.join(',')}] ar=[${nsAr.join(',')}]`);
    for (const ns of nsEn) if (!nsAr.includes(ns)) { fail++; console.log(`BAD i18n missing ar namespace: ${ns}`); }
    for (const ns of nsAr) if (!nsEn.includes(ns)) { fail++; console.log(`BAD i18n missing en namespace: ${ns}`); }
    for (const ns of nsEn) {
      if (!nsAr.includes(ns)) continue;
      const enKeys = new Set(flatten(en[ns]));
      const arKeys = new Set(flatten(ar[ns]));
      let miss = 0;
      for (const k of enKeys) if (!arKeys.has(k)) { console.log(`BAD i18n ${ns} ar-missing: ${k}`); miss++; }
      for (const k of arKeys) if (!enKeys.has(k)) { console.log(`BAD i18n ${ns} en-missing: ${k}`); miss++; }
      if (miss) fail++; else console.log(`OK i18n ${ns} leaf parity (${enKeys.size} keys)`);
    }
  } catch (e) { fail++; console.log(`ERR i18n ${e.message}`); }
  console.log(fail === 0 ? 'RESULT SMOKE_ALL_OK' : `RESULT SMOKE_FAILURES=${fail}`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 3000);
});
setTimeout(() => { console.log('WATCHDOG_FIRED'); process.exit(2); }, 55000);
