const sharp = require('sharp');
const path = 'C:\\Users\\user\\.gemini\\antigravity\\brain\\f0f62695-75a2-4db3-b59e-30e938443db9\\hd_video_lesson_1794828352228.jpg';

sharp(path)
  .metadata()
  .then(meta => {
    console.log('Metadata:', meta);
    return sharp(path).raw().toBuffer({ resolveWithObject: true });
  })
  .then(({ data, info }) => {
    console.log('Corners:');
    const corners = [
      [0, 0],
      [info.width - 1, 0],
      [0, info.height - 1],
      [info.width - 1, info.height - 1]
    ];
    corners.forEach(([x, y]) => {
      const idx = (y * info.width + x) * info.channels;
      console.log(`(${x}, ${y}): RGB(${data[idx]}, ${data[idx+1]}, ${data[idx+2]})`);
    });
  })
  .catch(console.error);
