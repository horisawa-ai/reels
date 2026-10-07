// Extrai da animação os tempos dos eventos sonoros. Uso: node som/events.mjs eventos.json
import { createRequire } from 'module';
import fs from 'fs';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
await p.goto('file://' + new URL('../index.html', import.meta.url).pathname + '?render=1');
await p.waitForFunction(() => window.MOTION_READY === true);
const ev = await p.evaluate(async () => {
  R.LABEL_LOG = {};
  for (let t = 0; t < R.DURATION; t += 1 / 15) window.MOTION.render(t);
  const T = R.T, B = R.BEATS;
  const keys = R.cameraKeys();
  const zooms = [];
  for (let i = 1; i < keys.length; i++) {
    const r = keys[i].zoom / keys[i - 1].zoom;
    if (r > 1.8 || r < 1 / 1.8) zooms.push({ t0: keys[i - 1].t, t1: keys[i].t, dir: r > 1 ? 'in' : 'out' });
  }
  const w = (bi, s, o) => T.w(bi, s, o);
  return {
    dur: R.DURATION, labels: R.LABEL_LOG, zooms,
    speech: B.map(x => [x.start, x.end]),
    roles: ['Deputados', 'senadores', 'Presidente', 'STF', 'tribunais', 'Procurador', 'você'].map(x => w(1, x)),
    pl_show: w(1, 'projeto') - 0.1, pl_drop: w(1, 'Quem') + 0.2,
    assin: [w(1, 'assinatura'), w(1, 'eleitores') + 0.2], estados: [w(1, 'pelo') - 0.1, w(1, 'estados') + 0.3],
    vote_lamps: ['deputado', 'senador', 'presidente'].map(x => w(0, x)),
    relator: [w(2, 'relator'), w(2, 'propor')], mudancas: w(2, 'mudanças'), constit: w(2, 'Constituição'),
    camara: w(2, 'Câmara'),
    plen_count: [w(3, 'metade') - 0.3, w(3, 'presentes') + 0.4], maioria: w(3, 'maioria'),
    revisa: w(4, 'revisa'), rejeitar: w(4, 'rejeitar'), mudar: w(4, 'mudar'),
    sancionar: w(5, 'sancionar'), vetar: w(5, 'vetar'), clock: [w(5, 'dias'), w(5, 'tácita')],
    derruba: [w(5, 'deputados'), w(5, 'senadores')],
    publicada: w(6, 'publicada'), n45: w(6, '45'),
    agora: w(7, 'Agora'), salva: w(7, 'Salva'),
    pl_moves: [[B[1].end - 0.5, w(2, 'Câmara') - 0.2], [w(3, 'outros'), w(3, 'plenário', 2) + 0.6], [B[3].end + 0.6, w(4, 'revisa')], [B[4].end + 0.5, w(5, 'Presidente') + 0.4], [B[5].end + 0.5, w(6, 'publicada')]],
  };
});
fs.writeFileSync(process.argv[2], JSON.stringify(ev, null, 1));
console.log(Object.keys(ev.labels).length, 'balões;', ev.zooms.length, 'zooms');
await b.close();
