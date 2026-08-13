const fs = require('fs');
const file = 'c:\\\\Users\\\\Administrator\\\\tmp\\\\erp\\\\src\\\\app\\\\(modules)\\\\inventory\\\\products\\\\page.tsx';
let content = fs.readFileSync(file, 'utf8');

const startStr = '      <Dialog open={categoryModalOpen}';
const endStr = '      </Dialog>\n    </div>\n  );\n}';

const startIdx = content.indexOf(startStr);
const endIdx = content.indexOf('      </Dialog>\n', startIdx) + '      </Dialog>\n'.length;

if (startIdx !== -1 && endIdx !== -1) {
  const block = content.substring(startIdx, endIdx);
  content = content.substring(0, startIdx) + content.substring(endIdx);

  const insertIdx = content.indexOf('      {/* Product Dialog */}');
  content = content.substring(0, insertIdx) + '      {/* Category Modal */}\n' + block + '\n' + content.substring(insertIdx);

  fs.writeFileSync(file, content);
  console.log('Moved the modal successfully!');
} else {
  console.log('Could not find the bounds');
}
