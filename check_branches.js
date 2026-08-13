const fs = require('fs');
const dumpPath = 'C:\\Users\\Administrator\\tmp\\erp\\dump_prisma.json';
const dump = JSON.parse(fs.readFileSync(dumpPath, 'utf8'));
const branchCodes = dump.branches.map(b => b.code);
console.log('Branches in DB:', branchCodes);

const csvPath = 'C:\\Users\\Administrator\\.gemini\\antigravity\\brain\\1cee8fc1-e346-403e-bf41-26fe45bb885d\\.user_uploaded\\media_1786105693257.csv';
const lines = fs.readFileSync(csvPath, 'utf8').split('\n');
const headers = lines[1].split(',').map(s => s.trim());
console.log('CSV Headers row 1:', headers);

const missing = headers.slice(2, headers.length - 1).filter(h => !branchCodes.includes(h) && h !== '');
console.log('Missing branches from DB:', missing);
