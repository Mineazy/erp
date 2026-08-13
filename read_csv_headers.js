const fs = require('fs');
const csvPath = 'C:\\Users\\Administrator\\.gemini\\antigravity\\brain\\1cee8fc1-e346-403e-bf41-26fe45bb885d\\.user_uploaded\\media_1786534028338.csv';
const lines = fs.readFileSync(csvPath, 'utf8').split('\n');
const header1 = lines[0].split(',').map(s => s.trim());
const header2 = lines[1].split(',').map(s => s.trim());
console.log('Row 0:', header1);
console.log('Row 1:', header2);
