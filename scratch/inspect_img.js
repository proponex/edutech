const sharp = require('sharp');

sharp('scratch/test_hero_img.png')
  .raw()
  .toBuffer({ resolveWithObject: true })
  .then(({ data, info }) => {
    console.log('Channels:', info.channels, 'Size:', info.width, 'x', info.height);
    const corners = [
      [0, 0],
      [info.width - 1, 0],
      [0, info.height - 1],
      [info.width - 1, info.height - 1],
      [Math.floor(info.width / 2), 0],
      [0, Math.floor(info.height / 2)],
      [info.width - 1, Math.floor(info.height / 2)]
    ];
    corners.forEach(([x, y]) => {
      const idx = (y * info.width + x) * info.channels;
      console.log('Pos (' + x + ', ' + y + '): RGB(' + data[idx] + ', ' + data[idx+1] + ', ' + data[idx+2] + ')');
    });
  })
  .catch(err => console.error(err));
