const fs = require('fs');
const transcriptPath = 'C:\\Users\\Administrator\\.gemini\\antigravity\\brain\\1cee8fc1-e346-403e-bf41-26fe45bb885d\\.system_generated\\logs\\transcript_full.jsonl';
const content = fs.readFileSync(transcriptPath, 'utf8');
const startMatch = 'Item No,Name,LOCATION CODE';
const startIdx = content.lastIndexOf(startMatch);
if (startIdx !== -1) {
    let endIdx = content.indexOf('</USER_REQUEST>', startIdx);
    if (endIdx === -1) endIdx = content.indexOf('\"', startIdx);
    if (endIdx === -1) endIdx = content.length;
    let csv = content.substring(startIdx, endIdx);
    csv = csv.replace(/\\\\n/g, '\n').replace(/\\\\r/g, '\r').replace(/\\\\\"/g, '\"');
    fs.writeFileSync('stock.csv', csv);
    console.log('Done. Length:', csv.length);
} else {
    console.log('Not found');
}
