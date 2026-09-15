const t = require('fs').readFileSync('server/prisma/schema.prisma', 'utf8');
t.split(/\r?\n/).forEach((l, i) => {
  if (/^model |^enum /.test(l)) console.log(i + 1, l.trim());
});
