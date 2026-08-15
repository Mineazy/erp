const fs = require('fs');

const files = [
  'src/app/api/projects/route.ts',
  'src/app/api/projects/[id]/route.ts',
  'src/app/api/projects/[id]/tasks/route.ts',
  'src/app/api/projects/[id]/tasks/[taskId]/route.ts',
  'src/app/api/projects/[id]/expenses/route.ts',
  'src/app/api/projects/[id]/time-logs/route.ts'
];

files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  content = content.replace(/const body = await getBody\(request\);/g, 'const body = await getBody(request) as any;');
  fs.writeFileSync(f, content);
});

console.log('Fixed body any casting');
