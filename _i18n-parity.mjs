// Deep i18n parity: compares leaf key paths (en vs ar) for every namespace.
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const LOCALES = 'c:/Users/ahmed/OneDrive/Desktop/web3/src/i18n/locales';

const load = (lang) => {
  const dir = join(LOCALES, lang);
  const out = {};
  for (const f of readdirSync(dir)) {
    if (!f.endsWith('.ts')) continue;
    let src = readFileSync(join(dir, f), 'utf8').replace(/\r\n/g, '\n');
    src = src.replace(/\bas\s+const\b/g, ''); // strip `as const` casts
    const m = src.match(/^export\s+const\s+(\w+)\s*(:[^=]+)?=/);
    if (!m) { console.log(`SKIP ${lang}/${f} (no top-level export const)`); out[f.replace(/\.ts$/, '')] = null; continue; }
    let body = src.slice(m.index + m[0].length).trim();
    body = body.split(/\nexport\s/)[0].trim().replace(/;+\s*$/, '');
    try {
      out[f.replace(/\.ts$/, '')] = new Function(`"use strict"; return (${body})`)();
    } catch (e) {
      console.log(`PARSE_FAIL ${lang}/${f}: ${String(e.message).split('\n')[0]}`);
      out[f.replace(/\.ts$/, '')] = null;
    }
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

const en = load('en');
const ar = load('ar');
let missing = 0;
for (const ns of Object.keys(en)) {
  if (!en[ns] || !ar[ns]) { missing++; continue; }
  const enKeys = new Set(flatten(en[ns]));
  const arKeys = new Set(flatten(ar[ns]));
  for (const k of enKeys) if (!arKeys.has(k)) { console.log(`AR-MISSING ${ns} :: ${k}`); missing++; }
  for (const k of arKeys) if (!enKeys.has(k)) { console.log(`EN-MISSING ${ns} :: ${k}`); missing++; }
  const checkEmpty = (o, p = '') => {
    for (const [k, v] of Object.entries(o || {})) {
      const key = p ? `${p}.${k}` : k;
      if (v && typeof v === 'object') checkEmpty(v, key);
      else if (typeof v === 'string' && v.trim() === '') { console.log(`AR-EMPTY ${ns} :: ${key}`); missing++; }
    }
  };
  checkEmpty(ar[ns]);
}
console.log(missing === 0 ? 'I18N_PARITY_OK' : `I18N_PARITY_MISSING=${missing}`);

