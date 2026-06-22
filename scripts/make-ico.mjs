import pngToIco from 'png-to-ico';
import { Jimp } from 'jimp';
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const src = join(here, '..', 'resources', 'krypt.png');
const out = join(here, '..', 'resources', 'krypt.ico');

try {
  const img = await Jimp.read(src);
  const side = Math.max(img.width, img.height, 256);
  const canvas = new Jimp({ width: side, height: side, color: 0x00000000 });
  const scale = Math.min(side / img.width, side / img.height);
  img.resize({ w: Math.round(img.width * scale), h: Math.round(img.height * scale) });
  canvas.composite(img, Math.round((side - img.width) / 2), Math.round((side - img.height) / 2));
  const squarePng = await canvas.getBuffer('image/png');
  const ico = await pngToIco(squarePng);
  await writeFile(out, ico);
  console.log(`Wrote ${out} (${side}x${side} source)`);
} catch (e) {
  console.error('make-ico failed:', e.message);
  process.exit(1);
}
