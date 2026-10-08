// Extrai da animação os eventos sonoros (lista {t, k, g}). Uso: node som/events.mjs eventos.json
import { createRequire } from 'module';
import fs from 'fs';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
await p.goto('file://' + new URL('../index.html', import.meta.url).pathname + '?render=1');
await p.waitForFunction(() => window.MOTION_READY === true);
const ev = await p.evaluate(() => {
  R.LABEL_LOG = {};
  for (let t = 0; t < R.DURATION; t += 1 / 15) window.MOTION.render(t);
  const w = (b, s, o) => R.T.w(b, s, o), B = R.BEATS, E = [];
  const e = (t, k, g = 1, pan = 0, d = 0) => E.push({ t, k, g, pan, d });
  // abertura
  e(w(0, 'isso') - 0.1, 'pop', 0.5); e(w(0, 'narrativa') - 0.05, 'swish', 0.5);
  e(w(0, 'fato') - 0.12, 'swish', 0.7); e(w(0, 'fato') + 0.03, 'stamp', 1);
  e(3.95, 'whoosh_out', 0.7, 0, 0.8);
  for (let i = 0; i < 6; i++) e(3.65 + 0.08 * i, 'pop', 0.35, i % 2 ? -0.4 : 0.4);
  // balões e câmera
  const seen = new Set();
  for (const at of Object.values(R.LABEL_LOG)) { const k = at.toFixed(2); if (!seen.has(k)) { seen.add(k); e(at + 0.02, 'blip', 0.55, 0.15); } } // um blip por balão (o contador muda o texto)
  const keys = R.cameraKeys();
  for (let i = 1; i < keys.length; i++) {
    const r = keys[i].zoom / keys[i - 1].zoom;
    if (r > 1.5 || r < 1 / 1.5) e(keys[i - 1].t, r > 1 ? 'whoosh_in' : 'whoosh_out', 0.55, 0, keys[i].t - keys[i - 1].t);
  }
  // extrato
  for (const s of ['extrato', 'empréstimo', 'plano']) e(w(1, s), 'tick', 0.5);
  e(w(1, 'mensalidade'), 'low', 0.6);
  // acordo e torneira
  e(w(2, 'acordo') - 0.2, 'swish', 0.5); e(w(2, 'acordo') + 0.9, 'stamp', 0.45);
  e(w(2, 'cobrar') - 0.05, 'clank', 0.6);
  for (let i = 0; i < 5; i++) e(w(2, 'cobrar') + 0.6 + i * 0.84, 'coin', 0.35, 0.3);
  // gráfico
  e(w(3, 'setecentos'), 'rise', 0.5, -0.3, 0.9); e(w(3, 'para') - 0.35, 'rise', 0.55, 0, 0.9); e(w(3, 'para'), 'rise', 0.7, 0.3, 0.9);
  e(w(3, 'Mais'), 'low', 0.5);
  // alerta, calendário, CGU
  e(w(4, 'alerta') - 0.2, 'bell', 0.45);
  const c0 = w(4, 'primeira'), c1 = w(4, 'depois') + 0.1;
  for (let i = 1; i <= 9; i++) e(c0 + (c1 - c0) * i / 9, 'flip', 0.45, -0.2);
  e(w(4, 'CGU') - 0.1, 'pop', 0.5); e(w(4, 'continuaram') - 0.05, 'stamp', 0.6);
  // CGU: 100 aposentados
  for (let i = 0; i < 12; i++) e(w(5, 'ouviu') - 0.2 + i * 0.06, 'tick', 0.3, (i % 3 - 1) * 0.4);
  for (let i = 0; i < 18; i++) e(w(5, 'noventa') - 0.1 + i * 0.065, 'tick', 0.35, 0.2);
  // operação
  for (let i = 0; i < 14; i++) e(w(6, 'Polícia') + i / 6, i % 2 ? 'beepA' : 'beepB', 0.22, i % 2 ? -0.3 : 0.3);
  e(w(6, 'demitido'), 'swish', 0.5); e(w(6, 'preso'), 'clank', 0.8); e(w(6, 'Lupi', 2), 'down', 0.55);
  // sindicato
  e(w(7, 'subir') - 0.3, 'rise', 0.7, 0, 1.4);
  for (let i = 0; i < 14; i++) e(w(7, 'subir') - 0.3 + i * 0.1, 'tick', 0.28);
  // quem pagou e fechamento
  e(w(8, 'Quem') + 0.3, 'down', 0.45);
  e(w(9, 'Faltam') + 0.1, 'bell', 0.5); e(w(9, 'Faça') - 0.05, 'swish', 0.45); e(w(9, 'Vamos') - 0.05, 'swish', 0.5);
  return { dur: R.DURATION, events: E.sort((a, b) => a.t - b.t) };
});
fs.writeFileSync(process.argv[2], JSON.stringify(ev, null, 1));
console.log(ev.events.length, 'eventos');
await b.close();
