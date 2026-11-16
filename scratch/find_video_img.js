const fs = require('fs');
const readline = require('readline');

async function search() {
  const fileStream = fs.createReadStream('C:\\Users\\user\\.gemini\\antigravity\\brain\\f0f62695-75a2-4db3-b59e-30e938443db9\\.system_generated\\logs\\transcript.jsonl');
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  for await (const line of rl) {
    if (line.includes('Crystal-Clear') && line.includes('img') && line.includes('src=')) {
      const idx = line.indexOf('Crystal-Clear');
      const start = Math.max(0, idx - 400);
      const end = Math.min(line.length, idx + 800);
      console.log('Found:\n', line.substring(start, end));
      break;
    }
  }
}

search().catch(console.error);
