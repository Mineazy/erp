const fs = require('fs');
const dump = JSON.parse(fs.readFileSync('C:\\\\Users\\\\Administrator\\\\tmp\\\\erp\\\\dump_prisma.json', 'utf8'));
console.log(dump.products.slice(0, 5).map(p => ({ code: p.code, name: p.name })));
