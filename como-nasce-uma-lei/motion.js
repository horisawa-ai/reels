// Monta o quadro: fundo, maquete (ordenada por profundidade), rótulos, título e legenda.
(function () {
  const R = window.R;
  const { clamp, lerp, prog, ease, rng } = R.U;
  const ctx = R.ctx, W = R.W, H = R.H;
  let flagTex, keys, grain = [];
  const VARIANT = (new URLSearchParams(location.search).get('v') || 'A').toUpperCase();
  R.CAPTIONS = new URLSearchParams(location.search).has('legenda'); // legenda desligada por padrão

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

  // título do guia: rótulo Inter 30px em y=314, Anton em duas linhas a partir de y=367 (x=120)
  function drawTitle(t) {
    const tin = VARIANT === 'B' ? 0.6 : 0.3;
    const tout = VARIANT === 'B' ? R.HERO.END - 0.7 : R.INTRO_END - 0.15;
    const a = prog(t, tin, tin + 0.5), out = prog(t, tout, tout + 0.5);
    if (a <= 0 || out >= 1) return;
    R.screen();
    ctx.save();
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    // rótulo
    ctx.globalAlpha = clamp(a * 2) * (1 - out);
    ctx.font = '600 30px Inter'; ctx.letterSpacing = '3px';
    ctx.fillStyle = 'rgba(240,233,216,0.72)';
    ctx.fillText('COMO FUNCIONA', 120, 300 - ease.in(out) * 20);
    // linhas do título, reveladas por máscara
    ctx.font = '400 98px Anton'; ctx.letterSpacing = '1px';
    ['COMO UMA IDEIA', 'VIRA LEI?'].forEach((line, i) => {
      const p = ease.outQuint(prog(t, tin + 0.08 + i * 0.14, tin + 0.7 + i * 0.14));
      const q = ease.in(prog(t, tout + i * 0.06, tout + 0.45 + i * 0.06));
      const y = 367 + i * 108;
      ctx.save();
      ctx.beginPath(); ctx.rect(100, y - 6, 820, 112); ctx.clip();
      ctx.globalAlpha = 1;
      ctx.fillStyle = R.PAL.paper;
      ctx.shadowColor = 'rgba(0,0,0,0.55)'; ctx.shadowBlur = 24; ctx.shadowOffsetY = 6;
      ctx.fillText(line, 120, y + (1 - p) * 112 - q * 112);
      ctx.restore();
    });
    // filete
    const r = ease.inOut(prog(t, tin + 0.6, tin + 1.1)) * (1 - ease.in(out));
    ctx.fillStyle = R.PAL.paper; ctx.globalAlpha = 1;
    ctx.fillRect(122, 367 + 216 + 12, 92 * r, 3);
    ctx.restore();
    ctx.letterSpacing = '0px';
  }

  // fechamento: mesmo padrão do título, sobre a maquete inteira acesa
  function drawOutro(t) {
    const t0 = R.T.w(7, 'Agora') + 0.9;
    const a = prog(t, t0, t0 + 0.5);
    if (a <= 0) return;
    R.screen();
    ctx.save();
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.globalAlpha = clamp(a * 2);
    ctx.font = '600 30px Inter'; ctx.letterSpacing = '3px';
    ctx.fillStyle = 'rgba(240,233,216,0.72)';
    ctx.fillText('AGORA VOCÊ SABE', 120, 300);
    ctx.font = '400 98px Anton'; ctx.letterSpacing = '1px';
    ['COMO UMA IDEIA', 'VIRA LEI.'].forEach((line, i) => {
      const p = ease.outQuint(prog(t, t0 + 0.08 + i * 0.14, t0 + 0.7 + i * 0.14));
      const y = 367 + i * 108;
      ctx.save(); ctx.beginPath(); ctx.rect(100, y - 6, 820, 112); ctx.clip();
      ctx.globalAlpha = 1; ctx.fillStyle = R.PAL.paper;
      ctx.shadowColor = 'rgba(0,0,0,0.55)'; ctx.shadowBlur = 24; ctx.shadowOffsetY = 6;
      ctx.fillText(line, 120, y + (1 - p) * 112);
      ctx.restore();
    });
    ctx.fillStyle = R.PAL.paper; ctx.globalAlpha = 1;
    ctx.fillRect(122, 367 + 216 + 12, 92 * ease.inOut(prog(t, t0 + 0.6, t0 + 1.1)), 3);
    ctx.restore();
    ctx.letterSpacing = '0px';
    const c = prog(t, R.T.w(7, 'Salva'), R.T.w(7, 'Salva') + 0.3);
    if (c > 0) R.pill(498, 1190, 'SALVA E MANDA PRA ALGUÉM', c, { size: 30, fill: R.PAL.mustard });
  }

  // assinatura fixa: canto superior direito da área segura (x ≤ 900, y ≥ 288).
  // Uma família só (Inter), selo com contorno fino e um ponto que pulsa.
  function drawHandle(t) {
    R.screen();
    ctx.save();
    const label = '@pulsar.science';
    ctx.font = '600 25px Inter'; ctx.letterSpacing = '0.6px';
    const tw = ctx.measureText(label).width;
    const h = 46, padL = 40, padR = 20, w = padL + tw + padR;
    const x = 900 - w, y = 290;
    ctx.fillStyle = 'rgba(16,21,19,0.55)';
    ctx.strokeStyle = 'rgba(240,233,216,0.35)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect(x, y, w, h, h / 2); ctx.fill(); ctx.stroke();
    const cx = x + 22, cy = y + h / 2;
    const ph = (t * 0.8) % 1;
    ctx.strokeStyle = `rgba(240,233,216,${0.45 * (1 - ph)})`; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.arc(cx, cy, 4 + ph * 9, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = R.PAL.paper; ctx.beginPath(); ctx.arc(cx, cy, 3.6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = R.PAL.paper; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    ctx.fillText(label, x + padL, cy + 1);
    ctx.restore();
    ctx.letterSpacing = '0px';
  }

  // lente macro: desfoca topo e base (efeito miniatura)
  let tsSmall, tsBlur, tsMask;
  function tiltShift() {
    if (!tsSmall) {
      tsSmall = document.createElement('canvas'); tsSmall.width = 270; tsSmall.height = 480;
      tsBlur = document.createElement('canvas'); tsBlur.width = 270; tsBlur.height = 480;
      tsMask = document.createElement('canvas'); tsMask.width = W; tsMask.height = H;
    }
    const s = tsSmall.getContext('2d'), b = tsBlur.getContext('2d'), m = tsMask.getContext('2d');
    s.clearRect(0, 0, 270, 480); s.drawImage(R.canvas, 0, 0, 270, 480);
    b.clearRect(0, 0, 270, 480); b.filter = 'blur(2.6px)'; b.drawImage(tsSmall, 0, 0); b.filter = 'none';
    m.globalCompositeOperation = 'source-over'; m.clearRect(0, 0, W, H);
    m.imageSmoothingQuality = 'high'; m.drawImage(tsBlur, 0, 0, W, H);
    m.globalCompositeOperation = 'destination-in';
    const g = m.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(0.3, 'rgba(0,0,0,0)');
    g.addColorStop(0.62, 'rgba(0,0,0,0)'); g.addColorStop(0.92, 'rgba(0,0,0,1)');
    m.fillStyle = g; m.fillRect(0, 0, W, H);
    R.screen(); ctx.drawImage(tsMask, 0, 0);
  }

  function render(t) {
    t = clamp(t, 0, R.DURATION);
    const hero = VARIANT === 'B' && t < R.HERO.END;
    if (hero) R.heroCamera(t); else camera(t);
    R.screen();
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = R.PAL.bg; ctx.fillRect(0, 0, W, H);
    const spot = ctx.createRadialGradient(W / 2, H * 0.52, 60, W / 2, H * 0.52, H * 0.62);
    spot.addColorStop(0, R.PAL.bgLight); spot.addColorStop(1, R.PAL.bg);
    ctx.fillStyle = spot; ctx.fillRect(0, 0, W, H);
    drawGrid();

    let tags = [];
    if (hero) R.drawHero(t);
    else {
      const scene = R.buildScene(t);
      R.world();
      for (const fn of scene.slabs) fn();
      scene.items.sort((a, b) => a.depth - b.depth);
      for (const it of scene.items) it.fn();
      tags = scene.tags;
    }
    tiltShift();

    // luz de estúdio + vinheta
    R.screen();
    const v = ctx.createRadialGradient(W / 2, H * 0.5, H * 0.25, W / 2, H * 0.5, H * 0.75);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.62)');
    ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 0.5;
    ctx.drawImage(grain[Math.floor(t * 30) % 3], 0, 0, W, H);
    ctx.globalAlpha = 1;

    for (const fn of tags) fn();
    drawTitle(t);
    drawOutro(t);
    if (R.CAPTIONS) R.drawCaptions(t);
    drawHandle(t);

    const fin = 1 - prog(t, 0, 0.25);
    if (fin > 0) { ctx.fillStyle = R.PAL.bg; ctx.globalAlpha = fin; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
  }

  async function load() {
    const svg = window.FLAG_SVG.replace('<svg ', '<svg width="700" height="490" ');
    const img = new Image();
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    await img.decode();
    flagTex = document.createElement('canvas'); flagTex.width = 700; flagTex.height = 490;
    flagTex.getContext('2d').drawImage(img, 0, 0, 700, 490);
    await Promise.all(['900 90px Inter', '800 30px Inter', '600 30px Inter', '700 40px Inter', '400 98px Anton', '500 23px "IBM Plex Mono"'].map(f => document.fonts.load(f)));
    keys = R.cameraKeys().sort((a, b) => a.t - b.t);
    const r = rng(5);
    for (let n = 0; n < 3; n++) {
      const cv = document.createElement('canvas'); cv.width = 540; cv.height = 960;
      const g = cv.getContext('2d'); const im = g.createImageData(540, 960);
      for (let i = 0; i < im.data.length; i += 4) { const v = 60 + r() * 140; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 14; }
      g.putImageData(im, 0, 0); grain.push(cv);
    }
  }

  window.MOTION = { W, H, get DURATION() { return R.DURATION; }, canvas: R.canvas, render, ready: load() };
})();
