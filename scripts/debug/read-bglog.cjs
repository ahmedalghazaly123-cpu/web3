// Check the deployed bundle inside learnpilot-web for given strings.
const { execFileSync } = require('node:child_process');
const pats = process.argv.slice(2).length ? process.argv.slice(2) : ['lp-elevated', 'moreOptions'];
for (const p of pats) {
  try {
    const out = execFileSync(
      'docker',
      ['exec', 'learnpilot-web', 'sh', '-c', `grep -o ${p} /usr/share/nginx/html/assets/index*.js | head -1`],
      { encoding: 'utf8' },
    );
    console.log(`${p} => FOUND (${out.trim()})`);
  } catch {
    console.log(`${p} => MISSING`);
  }
}
