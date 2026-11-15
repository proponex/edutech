const sharp = require('sharp');
const fs = require('fs');

async function testFloodFill() {
  const { data, info } = await sharp('scratch/heroLaptop.png')
    .raw()
    .toBuffer({ resolveWithObject: true });

  const width = info.width;
  const height = info.height;
  const channels = info.channels;

  // Create RGBA buffer
  const rgba = Buffer.alloc(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    rgba[i * 4] = data[i * channels];
    rgba[i * 4 + 1] = data[i * channels + 1];
    rgba[i * 4 + 2] = data[i * channels + 2];
    rgba[i * 4 + 3] = 255;
  }

  // Flood fill from all 4 borders
  const visited = new Uint8Array(width * height);
  const queue = [];

  // Add all border pixels to queue
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

  // Helper to get color distance between two rgb
  function colorDist(r1, g1, b1, r2, g2, b2) {
    const dr = r1 - r2;
    const dg = g1 - g2;
    const db = b1 - b2;
    return Math.sqrt(dr * dr + dg * dg + db * db);
  }

  // The background is a lilac gradient: R ~ 200-220, G ~ 160-185, B ~ 235-250.
  // In HSV or simple RGB, lilac has High Blue, High Red, medium Green, and B > R > G.
  function isLilacBg(r, g, b) {
    // Check if color matches the lilac background characteristics
    // R: 180-230, G: 145-200, B: 220-255
    const isLilacTone = (b >= r && r >= g && b - g > 35 && b > 200);
    return isLilacTone;
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

    // If it's lilac background, set alpha to 0
    if (isLilacBg(cr, cg, cb)) {
      rgba[cidx * 4 + 3] = 0;
      bgCount++;

      // Check neighbors
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
            // If neighbor is also lilac background or very close to current background pixel
            if (isLilacBg(nr, ng, nb) || colorDist(cr, cg, cb, nr, ng, nb) < 18) {
              queue.push(nx, ny);
            }
          }
        }
      }
    }
  }

  console.log('Total pixels:', width * height, 'BG pixels marked transparent:', bgCount);

  // Feather the boundary edges (anti-aliasing)
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      if (rgba[idx * 4 + 3] === 255) {
        // Count transparent neighbors
        let transNeighbors = 0;
        for (let i = 0; i < 4; i++) {
          const nidx = (y + dy[i]) * width + (x + dx[i]);
          if (rgba[nidx * 4 + 3] === 0) transNeighbors++;
        }
        if (transNeighbors > 0) {
          // Semi-transparent edge
          rgba[idx * 4 + 3] = Math.max(0, 255 - transNeighbors * 55);
        }
      }
    }
  }

  await sharp(rgba, { raw: { width, height, channels: 4 } })
    .png()
    .toFile('scratch/heroLaptop_transparent.png');

  console.log('Saved scratch/heroLaptop_transparent.png');
}

testFloodFill().catch(console.error);
