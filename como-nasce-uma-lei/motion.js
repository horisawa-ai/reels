// Monta o quadro: fundo, maquete (ordenada por profundidade), rótulos, título e legenda.
(function () {
  const R = window.R;
  const { clamp, lerp, prog, ease, rng } = R.U;
  const ctx = R.ctx, W = R.W, H = R.H;
  let flagTex, keys, grain = [];

  // ---------- câmera a partir dos keyframes de timeline.js
  function camera(t) {
    let a = keys[keys.length - 1], b = a, u = 0;
    for (let i = 0; i < keys.length - 1; i++) {
      if (t >= keys[i].t && t <= keys[i + 1].t) { a = keys[i]; b = keys[i + 1]; u = ease.inOut(prog(t, a.t, b.t)); break; }
    }
    if (t < keys[0].t) { a = b = keys[0]; }
    const fa = R.FOCUS[a.at], fb = R.FOCUS[b.at];
    const z = Math.exp(lerp(Math.log(a.zoom), Math.log(b.zoom), u));
    const X = lerp(fa.X + a.dx, fb.X + b.dx, u), Y = lerp(fa.Y + a.dy, fb.Y + b.dy, u);
    const sy = lerp(a.sy, b.sy, u);
    R.cam.zoom = z; R.cam.fx = X; R.cam.fy = Y - (sy - H / 2) / z;
  }

  // ---------- bandeira tremulando com contorno (coordenadas de tela do mundo)
  R.drawFlag = function (x, y, w, t) {
    const h = w * 0.7, tw = flagTex.width, th = flagTex.height;
    const N = Math.round(clamp((w * R.cam.zoom) / 3, 24, 260));
    const sw = w / N, top = [], bot = [];
    for (let i = 0; i <= N; i++) {
      const u = i / N;
      const k = 0.15 + 0.85 * u;
      const p1 = u * Math.PI * 2 * 1.2 - t * 4.2;
      const dy = Math.sin(p1) * 0.06 * h * k;
      const slope = Math.cos(p1) * k;
      top.push([x + u * w, y + dy]); bot.push([x + u * w, y + dy + h]);
      if (i < N) {
        ctx.drawImage(flagTex, u * tw, 0, Math.min(tw / N + 1, tw - u * tw), th, x + u * w, y + dy, sw + 0.6, h);
        const L = slope * 0.14;
        ctx.fillStyle = L > 0 ? `rgba(255,255,255,${L})` : `rgba(0,0,20,${-L * 1.4})`;
        ctx.fillRect(x + u * w, y + dy, sw + 0.6, h);
      }
    }
    R.draw.ink(2.8);
    ctx.beginPath();
    top.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
    for (let i = bot.length - 1; i >= 0; i--) ctx.lineTo(bot[i][0], bot[i][1]);
    ctx.closePath(); ctx.stroke();
  };

  function drawGrid() {
    R.world();
    ctx.strokeStyle = R.PAL.grid; ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = -1500; i <= 4500; i += 100) {
      let a = R.P(i, -1500), b = R.P(i, 4500); ctx.moveTo(a.X, a.Y); ctx.lineTo(b.X, b.Y);
      a = R.P(-1500, i); b = R.P(4500, i); ctx.moveTo(a.X, a.Y); ctx.lineTo(b.X, b.Y);
    }
    ctx.stroke();
  }

  function drawTitle(t) {
    const a = prog(t, 0.35, 0.9), out = prog(t, R.INTRO_END + 0.2, R.INTRO_END + 0.8);
    if (a <= 0 || out >= 1) return;
    R.screen();
    ctx.save();
    ctx.globalAlpha = 1 - out;
    ctx.translate(0, -ease.in(out) * 120);
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.font = '900 96px Inter'; ctx.letterSpacing = '-2px';
    const l1 = 'COMO NASCE', l2 = 'UMA LEI';
    const e1 = ease.outQuint(a), e2 = ease.outQuint(prog(t, 0.5, 1.05));
    ctx.fillStyle = R.PAL.ink;
    ctx.globalAlpha = (1 - out) * clamp(a * 2);
    ctx.fillText(l1, 540, 300 + (1 - e1) * 60);
    // faixa marca-texto atrás de "UMA LEI"
    const w2 = ctx.measureText(l2).width;
    const hb = ease.inOut(prog(t, 0.75, 1.25));
    ctx.fillStyle = R.PAL.mustard;
    ctx.beginPath(); ctx.roundRect(540 - w2 / 2 - 22, 336, (w2 + 44) * hb, 104, 14); ctx.fill();
    ctx.globalAlpha = (1 - out) * clamp(prog(t, 0.5, 0.8) * 2);
    ctx.fillStyle = R.PAL.ink;
    ctx.fillText(l2, 540, 420 + (1 - e2) * 60);
    ctx.restore();
    ctx.letterSpacing = '0px';
    const c = prog(t, 1.2, 1.5);
    if (c > 0) R.pill(540, 505, 'EM 2 MINUTOS', c * (1 - out), { size: 30 });
  }

  function render(t) {
    t = clamp(t, 0, R.DURATION);
    camera(t);
    R.screen();
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = R.PAL.bg; ctx.fillRect(0, 0, W, H);
    drawGrid();

    const scene = R.buildScene(t);
    R.world();
    for (const fn of scene.slabs) fn();
    scene.items.sort((a, b) => a.depth - b.depth);
    for (const it of scene.items) it.fn();

    R.screen();
    for (const fn of scene.tags) fn();
    drawTitle(t);
    R.drawCaptions(t);

    // papel + vinheta leve
    R.screen();
    ctx.globalAlpha = 0.55;
    ctx.drawImage(grain[Math.floor(t * 30) % 3], 0, 0, W, H);
    ctx.globalAlpha = 1;
    const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.8);
    v.addColorStop(0, 'rgba(60,50,40,0)'); v.addColorStop(1, 'rgba(60,50,40,0.18)');
    ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
    const fin = 1 - prog(t, 0, 0.2);
    if (fin > 0) { ctx.fillStyle = R.PAL.bg; ctx.globalAlpha = fin; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
  }

  async function load() {
    const svg = window.FLAG_SVG.replace('<svg ', '<svg width="700" height="490" ');
    const img = new Image();
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    await img.decode();
    flagTex = document.createElement('canvas'); flagTex.width = 700; flagTex.height = 490;
    flagTex.getContext('2d').drawImage(img, 0, 0, 700, 490);
    await Promise.all(['900 90px Inter', '800 30px Inter', '700 40px Inter'].map(f => document.fonts.load(f)));
    keys = R.cameraKeys().sort((a, b) => a.t - b.t);
    const r = rng(5);
    for (let n = 0; n < 3; n++) {
      const cv = document.createElement('canvas'); cv.width = 540; cv.height = 960;
      const g = cv.getContext('2d'); const im = g.createImageData(540, 960);
      for (let i = 0; i < im.data.length; i += 4) { const v = 90 + r() * 120; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 14; }
      g.putImageData(im, 0, 0); grain.push(cv);
    }
  }

  window.MOTION = { W, H, get DURATION() { return R.DURATION; }, canvas: R.canvas, render, ready: load() };
})();
