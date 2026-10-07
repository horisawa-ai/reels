import { createRequire } from 'module'; import fs from 'fs'; import { spawn } from 'child_process';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const [,, what = 'stills', ...rest] = process.argv;
const b = await chromium.launch({ args: ['--allow-file-access-from-files'] }); const p = await b.newPage();
p.on('pageerror', e => console.log('ERR', e.message));
await p.goto('file://' + process.cwd() + '/marca.html'); await p.evaluate(() => window.MARCA_READY);
const grab = (t, m) => p.evaluate(([t, m]) => window.frame(t, m), [t, m]).then(s => Buffer.from(s, 'base64'));
if (what === 'stills') {
  for (const m of ['avatar', 'logo', 'banner']) fs.writeFileSync(`marca_${m}.png`, await grab(9, m));
  for (const t of [0.3, 0.9, 1.3, 1.7, 2.4]) fs.writeFileSync(`vin_${t}.png`, await grab(t, 'square'));
  fs.writeFileSync('times.json', JSON.stringify(await p.evaluate(() => ({ TL: window.TL, seats: window.SEAT_TIMES }))));
} else {
  const mode = rest[0] || 'square', out = rest[1], fps = 30;
  const end = await p.evaluate(() => window.TL.end);
  const ff = spawn('ffmpeg', ['-y', '-v', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-vcodec', 'png', '-i', '-', '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  for (let i = 0; i < Math.round(end * fps); i++) { const buf = await grab(i / fps, mode); if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r)); }
  ff.stdin.end(); await new Promise(r => ff.on('close', r));
}
await b.close();
