// One-screen summary of a Railway project: per service → source repo/branch,
// builder, start command, domains and deploy status. Handy before/after a deploy.
// usage:
//   railway status --json > %TEMP%\railway-status.json
//   node scripts/debug/railway-status-summary.cjs %TEMP%\railway-status.json
const fs = require('fs');

const file = process.argv[2];
if (!file) {
  console.error('usage: node scripts/debug/railway-status-summary.cjs <status.json>');
  process.exit(2);
}
const status = JSON.parse(fs.readFileSync(file, 'utf8'));

for (const env of status.environments?.edges ?? []) {
  console.log(`environment: ${env.node.name}\n`);
  for (const inst of env.node.serviceInstances?.edges ?? []) {
    const n = inst.node;
    const dep = n.activeDeployments?.[0] ?? {};
    const manifest = dep.meta?.serviceManifest ?? {};
    console.log(`─ ${n.serviceName}`);
    console.log(`  source        : ${n.source?.repo ? `${n.source.repo}${n.source.branch ? ' @ ' + n.source.branch : ''}` : `image ${n.source?.image ?? '?'}`}`);
    console.log(`  rootDirectory : ${dep.meta?.rootDirectory ?? '(repo root)'}`);
    console.log(`  builder       : ${manifest.build?.builder ?? '?'} ${manifest.build?.dockerfilePath ?? ''}`);
    console.log(`  startCommand  : ${n.startCommand ?? manifest.deploy?.startCommand ?? '(image default)'}`);
    console.log(`  healthcheck   : ${manifest.deploy?.healthcheckPath ?? '(none)'}`);
    console.log(`  domains       : ${(n.domains?.serviceDomains ?? []).map((d) => d.domain).join(', ') || '(none)'}`);
    console.log(`  last deploy   : ${dep.status ?? '?'} (${dep.createdAt ?? '?'}) → ${(dep.instances ?? []).map((i) => i.status).join(', ') || 'no instance'}`);
    console.log(`  watchPatterns : ${(manifest.build?.watchPatterns ?? []).join(', ') || '(all files)'}`);
  }
}