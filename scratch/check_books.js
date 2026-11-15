const sharp = require('sharp');

sharp('scratch/heroBooks.png')
  .raw()
  .toBuffer({ resolveWithObject: true })
  .then(({ data, info }) => {
    console.log('heroBooks:', info.width, 'x', info.height);
    // Sample border pixels
    for (let x = 0; x < info.width; x += 50) {
      const idx = x * info.channels;
      console.log(`Top x=${x}: RGB(${data[idx]}, ${data[idx+1]}, ${data[idx+2]})`);
    }
  });
