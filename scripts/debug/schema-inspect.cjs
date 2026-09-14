const fs = require('fs');
const t = fs.readFileSync('server/prisma/schema.prisma', 'utf8');
for (const name of ['AssignmentType', 'AssignmentStatus', 'SubmissionStatus', 'FileCategory', 'FileVisibility']) {
  const m = t.match(new RegExp('enum\\s+' + name + '\\s*\\{([^}]*)\\}'));
  console.log(name + ': ' + (m ? m[1].replace(/\s+/g, ' ').trim() : 'NOT FOUND'));
}

