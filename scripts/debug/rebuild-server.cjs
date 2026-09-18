const { execFile } = require('child_process');
const fs = require('fs');
const log = (m) => fs.appendFileSync(__dirname + '/rebuild-server.log', m + '\n');
const compose = ['compose', '-f', 'c:/Users/ahmed/OneDrive/Desktop/web3/docker-compose.yml'];
log('BUILD_START ' + new Date().toISOString());
execFile('docker', [...compose, 'build', 'server'], { timeout: 20 * 60 * 1000 }, (e, so, se) => {
  log('BUILD_EXIT=' + (e ? e.code : 0));
  if (se) log('BUILD_ERR_TAIL=' + String(se).slice(-1500));
  if (e) { log('BUILD_FAILED'); process.exit(1); }
  log('UP_START');
  execFile('docker', [...compose, 'up', '-d', 'server'], { timeout: 5 * 60 * 1000 }, (e2, so2, se2) => {
    log('UP_EXIT=' + (e2 ? e2.code : 0));
    if (se2) log('UP_ERR_TAIL=' + String(se2).slice(-800));
    execFile('docker', ['exec', 'learnpilot-server', 'grep', '-c', 'trust', '/app/dist/index.js'], (e3, so3) => {
      log('TRUST_PROXY_COUNT=' + (so3 || '').trim() + (e3 ? ' (err ' + e3.code + ')' : ''));
      log('DONE');
    });
  });
});
