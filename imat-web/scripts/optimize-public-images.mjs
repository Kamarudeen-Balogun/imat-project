import sharp from "sharp";
import { readdir } from "node:fs/promises";
import { extname, join } from "node:path";

const imagesDir = join(process.cwd(), "public", "images");
const quality = 74;

const entries = await readdir(imagesDir, { withFileTypes: true });
const sourceFiles = entries
  .filter((entry) => entry.isFile())
  .map((entry) => entry.name)
  .filter((name) => /\.(jpe?g|png)$/i.test(name));

let converted = 0;
for (const fileName of sourceFiles) {
  const inputPath = join(imagesDir, fileName);
  const outputPath = join(imagesDir, fileName.replace(new RegExp(`${extname(fileName)}$`, "i"), ".webp"));

  await sharp(inputPath)
    .rotate()
    .webp({ quality, effort: 5 })
    .toFile(outputPath);

  converted += 1;
}

console.log(`Generated ${converted} optimized WebP files in public/images.`);
