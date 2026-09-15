// helper: cross-check that every script mentioned in docs/PROJECT_STATE.md
// actually exists on disk (and flag scripts missing from the doc).
// usage: node scripts/debug/doc-scripts-check.cjs
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..');
const docPath = path.join(root, 'docs', 'PROJECT_STATE.md');
const doc = fs.readFileSync(docPath, 'utf8');

const real = new Set(
  fs
    .readdirSync(__dirname)
    .filter((f) => f.endsWith('.cjs') || f.endsWith('.mjs')),
);

const mentioned = new Set();
for (const m of doc.matchAll(/`([a-z0-9-]+\.(?:cjs|mjs))`/g)) mentioned.add(m[1]);

const missingOnDisk = [...mentioned].filter((x) => !real.has(x));
const missingInDoc = [...real].filter((x) => !mentioned.has(x));

console.log(`mentioned in doc: ${mentioned.size}, on disk: ${real.size}`);
console.log(`missing on disk : ${missingOnDisk.join(', ') || '(none)'}`);
console.log(`missing in doc  : ${missingInDoc.join(', ') || '(none)'}`);

// Stray logs should never be committed.
const logs = fs.readdirSync(__dirname).filter((f) => f.endsWith('.log'));
console.log(`logs present    : ${logs.length ? logs.join(', ') : '(none)'}`);
