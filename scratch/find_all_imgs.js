const fs = require('fs');
const readline = require('readline');

async function search() {
  const fileStream = fs.createReadStream('C:\\Users\\user\\.gemini\\antigravity\\brain\\f0f62695-75a2-4db3-b59e-30e938443db9\\.system_generated\\logs\\transcript_full.jsonl');
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let lineNum = 0;
  for await (const line of rl) {
    lineNum++;
    if (line.includes('"USER_INPUT"') && line.includes('html')) {
      try {
        const json = JSON.parse(line);
        if (json.content && json.content.includes('<html')) {
          console.log('User input found at line', lineNum);
          const urls = json.content.match(/https?:\/\/[^\s"'<>]+/g) || [];
          const imgUrls = urls.filter(u => u.includes('googleusercontent') || u.includes('.png') || u.includes('.jpg') || u.includes('.webp'));
          console.log('Image URLs in user input:', [...new Set(imgUrls)]);
        }
      } catch (e) {}
    }
  }
}

search().catch(console.error);
