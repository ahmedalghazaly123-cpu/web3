const os = require('os');
console.log('RAM total GB:', (os.totalmem() / 2 ** 30).toFixed(1));
console.log('RAM free GB:', (os.freemem() / 2 ** 30).toFixed(1));
try {
  const fs = require('fs');
  const s = fs.statfsSync('C:/');
  console.log('Disk free GB:', (Number(s.bavail) * Number(s.bsize) / 2 ** 30).toFixed(1));
} catch (e) { console.log('statfs fail:', e.message); }
