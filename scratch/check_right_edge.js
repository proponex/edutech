const sharp = require('sharp');

sharp('scratch/heroLaptop_transparent.png')
  .raw()
  .toBuffer({ resolveWithObject: true })
  .then(({ data, info }) => {
    for (let y = 0; y < info.height; y++) {
      const idx = (y * info.width + 511) * 4;
      if (data[idx + 3] > 0) {
        console.log(`x=511, y=${y}: RGBA(${data[idx]}, ${data[idx+1]}, ${data[idx+2]}, ${data[idx+3]})`);
      }
    }
  });
