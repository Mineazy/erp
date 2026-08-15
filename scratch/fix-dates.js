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
  content = content.replace(/body\.startDate \? new Date\( as string\) : null/g, 'body.startDate ? new Date(body.startDate as string) : null');
  content = content.replace(/body\.endDate \? new Date\( as string\) : null/g, 'body.endDate ? new Date(body.endDate as string) : null');
  content = content.replace(/body\.dueDate \? new Date\( as string\) : null/g, 'body.dueDate ? new Date(body.dueDate as string) : null');
  content = content.replace(/body\.expenseDate \? new Date\( as string\) : new Date\(\)/g, 'body.expenseDate ? new Date(body.expenseDate as string) : new Date()');
  content = content.replace(/body\.logDate \? new Date\( as string\) : new Date\(\)/g, 'body.logDate ? new Date(body.logDate as string) : new Date()');
  fs.writeFileSync(f, content);
});

console.log('Fixed dates syntax error');
