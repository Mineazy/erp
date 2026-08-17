const fs = require('fs');
const path = require('path');

const filesToUpdate = [
  'src/app/(modules)/crm/reports/page.tsx',
  'src/app/(modules)/fdms/reports/page.tsx',
  'src/app/(modules)/financial/reports/page.tsx',
  'src/app/(modules)/fleet/reports/page.tsx',
  'src/app/(modules)/pos/reports/page.tsx',
  'src/app/(modules)/purchasing/reports/page.tsx',
  'src/app/(modules)/warehouse/reports/page.tsx',
  'src/app/(modules)/workshop/reports/page.tsx'
];

filesToUpdate.forEach(file => {
  const filePath = path.join(__dirname, '..', file);
  if (!fs.existsSync(filePath)) {
    console.log(`Skipping ${file} - not found`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf-8');

  // Add import
  if (!content.includes(`import { useReportExport }`)) {
    content = content.replace(
      /import \{.*\} from 'lucide-react';/g,
      match => `${match}\nimport { useReportExport } from '@/hooks/use-report-export';`
    );
  }

  // Inject hook usage
  if (!content.includes('const { triggerExport, ExportDialog }')) {
    content = content.replace(
      /export default function [a-zA-Z0-9_]+\(\) \{/,
      match => `${match}\n  const { triggerExport, ExportDialog } = useReportExport();`
    );
  }

  // Replace window.open with triggerExport
  content = content.replace(
    /window\.open\(url\.toString\(\),\s*'_blank'\);/g,
    'triggerExport(url.toString(), reportName);'
  );

  // Inject {ExportDialog} right before the last closing div.
  // We can do this by looking for '</div>\n  );\n}'
  if (!content.includes('{ExportDialog}')) {
    const splitIndex = content.lastIndexOf('</div>\n  );\n}');
    if (splitIndex !== -1) {
      content = content.slice(0, splitIndex) + '  {ExportDialog}\n      ' + content.slice(splitIndex);
    } else {
      console.log(`Could not find injection point for ExportDialog in ${file}`);
    }
  }

  fs.writeFileSync(filePath, content, 'utf-8');
  console.log(`Updated ${file}`);
});
