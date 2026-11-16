const sharp = require('sharp');
const fs = require('fs');

async function processHdVideoImg() {
  const inputPath = 'C:\\Users\\user\\.gemini\\antigravity\\brain\\f0f62695-75a2-4db3-b59e-30e938443db9\\hd_video_lesson_1794828352228.jpg';
  const outputPath = 'public/images/hd_video_lesson_transparent.png';

  const { data, info } = await sharp(inputPath).raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;

  const rgba = Buffer.alloc(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    rgba[i * 4] = data[i * channels];
    rgba[i * 4 + 1] = data[i * channels + 1];
    rgba[i * 4 + 2] = data[i * channels + 2];
    rgba[i * 4 + 3] = 255;
  }

  const visited = new Uint8Array(width * height);
  const queue = [];

  // Seed all border pixels
  for (let x = 0; x < width; x++) {
    queue.push(x, 0);
    queue.push(x, height - 1);
    visited[x] = 1;
    visited[(height - 1) * width + x] = 1;
  }
  for (let y = 1; y < height - 1; y++) {
    queue.push(0, y);
    queue.push(width - 1, y);
    visited[y * width] = 1;
    visited[y * width + width - 1] = 1;
  }

  function isWhiteBg(r, g, b) {
    // Pure or near-white background
    return r >= 238 && g >= 236 && b >= 238;
  }

  function colorDist(r1, g1, b1, r2, g2, b2) {
    const dr = r1 - r2;
    const dg = g1 - g2;
    const db = b1 - b2;
    return Math.sqrt(dr * dr + dg * dg + db * db);
  }

  let head = 0;
  const dx = [-1, 1, 0, 0];
  const dy = [0, 0, -1, 1];
  let bgCount = 0;

  while (head < queue.length) {
    const cx = queue[head++];
    const cy = queue[head++];
    const cidx = cy * width + cx;
    const cr = rgba[cidx * 4];
    const cg = rgba[cidx * 4 + 1];
    const cb = rgba[cidx * 4 + 2];

    if (isWhiteBg(cr, cg, cb)) {
      rgba[cidx * 4 + 3] = 0;
      bgCount++;

      for (let i = 0; i < 4; i++) {
        const nx = cx + dx[i];
        const ny = cy + dy[i];
        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
          const nidx = ny * width + nx;
          if (!visited[nidx]) {
            visited[nidx] = 1;
            const nr = rgba[nidx * 4];
            const ng = rgba[nidx * 4 + 1];
            const nb = rgba[nidx * 4 + 2];

            if (isWhiteBg(nr, ng, nb) || (colorDist(cr, cg, cb, nr, ng, nb) < 12 && nr >= 225 && ng >= 225 && nb >= 225)) {
              queue.push(nx, ny);
            }
          }
        }
      }
    }
  }

  console.log(`Marked ${bgCount} / ${width * height} pixels as transparent (${((bgCount / (width * height)) * 100).toFixed(1)}%)`);

  // Edge feathering
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      if (rgba[idx * 4 + 3] === 255) {
        let trans = 0;
        for (let i = 0; i < 4; i++) {
          const nidx = (y + dy[i]) * width + (x + dx[i]);
          if (rgba[nidx * 4 + 3] === 0) trans++;
        }
        if (trans >= 3) rgba[idx * 4 + 3] = 70;
        else if (trans === 2) rgba[idx * 4 + 3] = 140;
        else if (trans === 1) rgba[idx * 4 + 3] = 200;
      }
    }
  }

  // Also trim excess transparent borders and resize to a crisp 600px width for fast loading
  await sharp(rgba, { raw: { width, height, channels: 4 } })
    .trim()
    .resize({ width: 680, withoutEnlargement: true })
    .png({ quality: 95 })
    .toFile(outputPath);

  const outMeta = await sharp(outputPath).metadata();
  console.log(`Saved ${outputPath} -> ${outMeta.width}x${outMeta.height}, hasAlpha: ${outMeta.hasAlpha}`);
}

processHdVideoImg().catch(console.error);
