const fs = require('fs');
const readline = require('readline');

const transcriptPath = 'C:\\Users\\Administrator\\.gemini\\antigravity\\brain\\1cee8fc1-e346-403e-bf41-26fe45bb885d\\.system_generated\\logs\\transcript_full.jsonl';

async function extractCSV() {
  const fileStream = fs.createReadStream(transcriptPath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let latestUserMessage = '';

  for await (const line of rl) {
    if (!line.trim()) continue;
    try {
      const entry = JSON.parse(line);
      if (entry.type === 'USER_INPUT') {
        latestUserMessage = entry.content;
      }
    } catch(e) {}
  }

  fs.writeFileSync('C:\\Users\\Administrator\\tmp\\erp\\pasted_inventory.txt', latestUserMessage);
  console.log('Saved last USER_INPUT to pasted_inventory.txt. Length:', latestUserMessage.length);
}

extractCSV();
