const sharp = require('sharp');
const path = require('path');

const files = [
  'public/images/hero_laptop_transparent.png',
  'public/images/hero_books_transparent.png',
  'public/images/centerpiece_narrative_transparent.png',
  'public/images/study_desk_transparent.png'
];

async function check(file) {
  const { data, info } = await sharp(file).raw().toBuffer({ resolveWithObject: true });
  const corners = [
    [0, 0],
    [info.width - 1, 0],
    [0, info.height - 1],
    [info.width - 1, info.height - 1]
  ];
  let cornerAlphas = corners.map(([x, y]) => data[(y * info.width + x) * 4 + 3]);
  
  // Center pixel alpha
  const centerX = Math.floor(info.width / 2);
  const centerY = Math.floor(info.height / 2);
  const centerAlpha = data[(centerY * info.width + centerX) * 4 + 3];

  console.log(`${path.basename(file)}:`);
  console.log(`  Corner alphas: [${cornerAlphas.join(', ')}] (Expected: 0, 0, 0, 0)`);
  console.log(`  Center alpha: ${centerAlpha} (Expected: 255)`);
  console.log(`  Size: ${info.width}x${info.height}`);
}

async function main() {
  for (const f of files) {
    await check(f);
  }
}

main().catch(console.error);
