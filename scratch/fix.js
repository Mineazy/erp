const fs = require('fs');

const files = [
  'src/app/api/projects/[id]/expenses/route.ts',
  'src/app/api/projects/[id]/route.ts',
  'src/app/api/projects/[id]/tasks/route.ts',
  'src/app/api/projects/[id]/tasks/[taskId]/route.ts',
  'src/app/api/projects/[id]/time-logs/route.ts'
];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/export async function (GET|POST|PUT|DELETE)\(request: NextRequest, \{ params \}: \{ params: \{ ([^}]+) \} \}\) \{/g, (match, method, paramsStr) => {
    return `export async function ${method}(request: NextRequest, { params }: { params: Promise<{ ${paramsStr} }> }) {
  const { ${paramsStr.split(',').map(s => s.split(':')[0].trim()).join(', ')} } = await params;`;
  });
  
  content = content.replace(/params\.id/g, 'id');
  content = content.replace(/params\.taskId/g, 'taskId');
  
  fs.writeFileSync(file, content);
});

const pageFile = 'src/app/(modules)/projects/[id]/page.tsx';
let pageContent = fs.readFileSync(pageFile, 'utf8');
pageContent = pageContent.replace(/export default function ProjectDetail\(\{ params \}: \{ params: \{ id: string \} \}\) \{/, 
`import { use } from 'react';\nexport default function ProjectDetail({ params }: { params: Promise<{ id: string }> }) {\n  const { id } = use(params);`);
pageContent = pageContent.replace(/params\.id/g, 'id');
fs.writeFileSync(pageFile, pageContent);

console.log('Replacements completed successfully');
