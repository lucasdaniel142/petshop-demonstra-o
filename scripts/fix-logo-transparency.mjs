/**
 * Remove fundo quadriculado, branco e borda clara da logo, mantendo os verdes da marca.
 * Exporta PNG RGBA (sem paleta) para transparência confiável no navegador.
 */
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const inputPath = path.join(root, 'public', 'logo.png');
const backupPath = path.join(root, 'public', 'logo-original-backup.png');

function shouldKeepForeground(r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const sat = max - min;
  // Verde vibrante "accent"
  if (g > 100 && g > r + 20 && g > b + 15) return true;
  // Verde escuro "primary"
  if (max < 140 && g > 40 && r < 100 && b < 110) return true;
  // Anti-aliasing em torno do verde
  if (max < 90 && sat > 15 && g >= r && g >= b) return true;
  return false;
}

function shouldRemoveBackground(r, g, b) {
  if (shouldKeepForeground(r, g, b)) return false;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const sat = max - min;
  const avg = (r + g + b) / 3;

  if (r > 228 && g > 228 && b > 228) return true;
  if (avg > 165 && sat < 55) return true;
  if (avg > 175 && r > 150 && g > 150 && b > 150 && sat < 35) return true;

  return false;
}

async function main() {
  if (!fs.existsSync(inputPath)) {
    console.error('Arquivo não encontrado:', inputPath);
    process.exit(1);
  }

  if (!fs.existsSync(backupPath)) {
    fs.copyFileSync(inputPath, backupPath);
    console.log('Backup criado:', backupPath);
  }

  const image = sharp(inputPath).ensureAlpha();
  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  if (channels !== 4) {
    console.error('Esperado RGBA');
    process.exit(1);
  }

  const out = Buffer.from(data);

  for (let i = 0; i < out.length; i += 4) {
    const r = out[i];
    const g = out[i + 1];
    const b = out[i + 2];

    if (shouldRemoveBackground(r, g, b)) {
      out[i + 3] = 0;
    }
  }

  // Segunda passagem: resíduos muito claros que não são verde da marca
  for (let i = 0; i < out.length; i += 4) {
    if (out[i + 3] === 0) continue;
    const r = out[i];
    const g = out[i + 1];
    const b = out[i + 2];
    if (shouldKeepForeground(r, g, b)) continue;
    const avg = (r + g + b) / 3;
    if (avg > 195) out[i + 3] = 0;
  }

  const tmp = inputPath + '.tmp';
  await sharp(out, {
    raw: {
      width,
      height,
      channels: 4,
    },
  })
    .png({
      compressionLevel: 9,
      effort: 10,
      palette: false,
    })
    .toFile(tmp);

  fs.renameSync(tmp, inputPath);
  const st = fs.statSync(inputPath);
  const meta = await sharp(inputPath).metadata();
  console.log('logo.png atualizado. Tamanho:', Math.round(st.size / 1024), 'KB', 'hasAlpha:', meta.hasAlpha);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
