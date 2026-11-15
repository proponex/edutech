const sharp = require('sharp');
const path = require('path');

const names = ['heroLaptop', 'heroBooks', 'centerpieceNarrative', 'studyDesk'];

async function inspect(name) {
  const file = path.join('scratch', name + '.png');
  const { data, info } = await sharp(file).raw().toBuffer({ resolveWithObject: true });
  console.log(`\n--- ${name} (${info.width}x${info.height}, channels=${info.channels}) ---`);
  const coords = [
    [0, 0],
    [info.width - 1, 0],
    [0, info.height - 1],
    [info.width - 1, info.height - 1],
    [Math.floor(info.width / 2), 0],
    [0, Math.floor(info.height / 2)],
    [info.width - 1, Math.floor(info.height / 2)]
  ];
  coords.forEach(([x, y]) => {
    const idx = (y * info.width + x) * info.channels;
    console.log(`(${x}, ${y}): RGB(${data[idx]}, ${data[idx+1]}, ${data[idx+2]})`);
  });
}

async function main() {
  for (const n of names) {
    await inspect(n);
  }
}

main().catch(console.error);
