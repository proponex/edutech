const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

async function processImage(inputFile, outputFile, isBgPixelFn, maxColorDiff = 18) {
  const { data, info } = await sharp(inputFile).raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;

  // RGBA buffer
  const rgba = Buffer.alloc(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    rgba[i * 4] = data[i * channels];
    rgba[i * 4 + 1] = data[i * channels + 1];
    rgba[i * 4 + 2] = data[i * channels + 2];
    rgba[i * 4 + 3] = 255;
  }

  const visited = new Uint8Array(width * height);
  const queue = [];

  // Seed with all border pixels
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

  function colorDist(r1, g1, b1, r2, g2, b2) {
    const dr = r1 - r2;
    const dg = g1 - g2;
    const db = b1 - b2;
    return Math.sqrt(dr * dr + dg * dg + db * db);
  }

  let head = 0;
  const dx = [-1, 1, 0, 0];
  const dy = [0, 0, -1, 1];
  let transparentCount = 0;

  while (head < queue.length) {
    const cx = queue[head++];
    const cy = queue[head++];
    const cidx = cy * width + cx;
    const cr = rgba[cidx * 4];
    const cg = rgba[cidx * 4 + 1];
    const cb = rgba[cidx * 4 + 2];

    if (isBgPixelFn(cr, cg, cb, cx, cy, width, height)) {
      rgba[cidx * 4 + 3] = 0;
      transparentCount++;

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

            if (isBgPixelFn(nr, ng, nb, nx, ny, width, height) || colorDist(cr, cg, cb, nr, ng, nb) <= maxColorDiff) {
              queue.push(nx, ny);
            }
          }
        }
      }
    }
  }

  console.log(`${path.basename(inputFile)}: ${transparentCount} / ${width * height} pixels marked transparent (${((transparentCount / (width * height)) * 100).toFixed(1)}%)`);

  // Smooth edges: 2-pass feathering
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

  await sharp(rgba, { raw: { width, height, channels: 4 } })
    .png()
    .toFile(outputFile);

  console.log(`Saved -> ${outputFile}`);
}

async function run() {
  // 1. Hero Laptop
  await processImage(
    'scratch/heroLaptop.png',
    'public/images/hero_laptop_transparent.png',
    (r, g, b) => (b >= r && r >= g && (b - g) > 25 && b > 180),
    16
  );

  // 2. Hero Books (checkerboard removal: near neutral grays/whites)
  await processImage(
    'scratch/heroBooks.png',
    'public/images/hero_books_transparent.png',
    (r, g, b) => (Math.abs(r - g) <= 12 && Math.abs(g - b) <= 12 && r >= 180),
    15
  );

  // 3. Centerpiece Narrative (lilac background)
  await processImage(
    'scratch/centerpieceNarrative.png',
    'public/images/centerpiece_narrative_transparent.png',
    (r, g, b) => (b >= r && r >= g && (b - g) > 15 && b > 165),
    16
  );

  // 4. Study Desk (purple / lilac background)
  await processImage(
    'scratch/studyDesk.png',
    'public/images/study_desk_transparent.png',
    (r, g, b) => (b >= r && r >= g && (b - g) > 15 && b > 150),
    16
  );
}

run().catch(console.error);
