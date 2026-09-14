const fs = require('fs');
const files = [
  'server/prisma/migrations/20260912000002_add_assignment_submission_file/migration.sql',
  'server/prisma/migrations/20260912000003_xp_consent_privacy/migration.sql',
];
for (const p of files) {
  let t = fs.readFileSync(p, 'utf8');
  if (t.charCodeAt(0) === 0xFEFF) {
    fs.writeFileSync(p, t.slice(1), 'utf8');
    console.log('BOM removed:', p);
  } else {
    console.log('no BOM:', p);
  }
}
