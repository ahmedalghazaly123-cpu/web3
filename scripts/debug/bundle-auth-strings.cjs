// Probe the deployed bundle inside learnpilot-web for key auth strings.
const { execSync } = require('node:child_process');
function grep(pat) {
  try {
    const out = execSync(
      `docker exec learnpilot-web sh -c "grep -l ${pat} /usr/share/nginx/html/assets/*.js"`,
      { encoding: 'utf8' },
    );
    console.log(pat, '=> FOUND:', out.trim());
  } catch {
    console.log(pat, '=> MISSING');
  }
}
['email-taken', 'password-not-set', 'roleMismatch', 'set-password'].forEach((p) =>
  grep(`'${p}'`),
);
