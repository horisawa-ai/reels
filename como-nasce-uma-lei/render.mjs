// Renderiza o motion em MP4 1080x1920 quadro a quadro.
// Uso: node render.mjs [--out out/reels.mp4] [--fps 30] [--audio narracao.mp3] [--stills 0.5,3.5,8]
//      [--query v=B] (variação de abertura) [--dur 5] (renderiza só os primeiros N segundos)
import { createRequire } from 'module';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); }
catch { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }

const here = path.dirname(fileURLToPath(import.meta.url));
const arg = (name, def) => { const i = process.argv.indexOf('--' + name); return i > -1 ? process.argv[i + 1] : def; };
const fps = Number(arg('fps', 30));
const out = path.resolve(here, arg('out', 'out/abertura.mp4'));
const audio = arg('audio', null);
const stills = arg('stills', null);
const query = arg('query', '');
const durArg = arg('dur', null);
fs.mkdirSync(path.dirname(out), { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
await page.goto(pathToFileURL(path.join(here, 'index.html')).href + '?render=1' + (query ? '&' + query : ''));
await page.waitForFunction(() => window.MOTION_READY === true);
const duration = durArg ? Number(durArg) : await page.evaluate(() => window.MOTION.DURATION);

const grab = t => page.evaluate(t => { window.MOTION.render(t); return window.MOTION.canvas.toDataURL('image/png').split(',')[1]; }, t);

if (stills) {
  for (const s of stills.split(',').map(Number)) {
    const file = path.join(path.dirname(out), `still_${s.toFixed(2)}.png`);
    fs.writeFileSync(file, Buffer.from(await grab(s), 'base64'));
    console.log('still', file);
  }
  await browser.close();
  process.exit(0);
}

const ffArgs = ['-y', '-f', 'image2pipe', '-framerate', String(fps), '-vcodec', 'png', '-i', '-'];
if (audio) ffArgs.push('-i', path.resolve(audio), '-c:a', 'aac', '-b:a', '192k', '-shortest');
ffArgs.push('-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out);
const ff = spawn('ffmpeg', ffArgs, { stdio: ['pipe', 'ignore', 'inherit'] });

const frames = Math.round(duration * fps);
for (let f = 0; f < frames; f++) {
  const buf = Buffer.from(await grab(f / fps), 'base64');
  if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
  if (f % fps === 0) process.stdout.write(`\r${f}/${frames} quadros`);
}
ff.stdin.end();
await new Promise(r => ff.on('close', r));
await browser.close();
console.log(`\npronto: ${out}`);
