// Monta o quadro: foto de abertura com o bordão, maquete, rótulos, fechamento e assinatura.
(function () {
  const R = window.R;
  const { clamp, lerp, prog, ease, rng } = R.U;
  const ctx = R.ctx, W = R.W, H = R.H;
  let flagTex, photo, keys, grain = [];
  const NO_HI = '#D39A82';

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

  // bandeira tremulando (coordenadas de tela)
  function drawFlag(x, y, w, t, alpha = 1) {
    const h = w * 0.7, tw = flagTex.width, th = flagTex.height, N = 48, sw = w / N;
    ctx.save(); ctx.globalAlpha = alpha;
    for (let i = 0; i < N; i++) {
      const u = i / N, k = 0.15 + 0.85 * u, p1 = u * Math.PI * 2 * 1.2 - t * 4.2;
      const dy = Math.sin(p1) * 0.06 * h * k, L = Math.cos(p1) * k * 0.14;
      ctx.drawImage(flagTex, u * tw, 0, tw / N + 1, th, x + u * w, y + dy, sw + 0.6, h);
      ctx.fillStyle = L > 0 ? `rgba(255,255,255,${L})` : `rgba(0,0,20,${-L * 1.4})`;
      ctx.fillRect(x + u * w, y + dy, sw + 0.6, h);
    }
    ctx.fillStyle = '#C9C2B2'; ctx.fillRect(x - 6, y - 4, 5, h + 40);
    ctx.restore();
  }

  function drawGrid() {
    R.world();
    ctx.strokeStyle = R.PAL.grid; ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = -1500; i <= 3500; i += 100) {
      let a = R.P(i, -1500), b = R.P(i, 3500); ctx.moveTo(a.X, a.Y); ctx.lineTo(b.X, b.Y);
      a = R.P(-1500, i); b = R.P(3500, i); ctx.moveTo(a.X, a.Y); ctx.lineTo(b.X, b.Y);
    }
    ctx.stroke();
  }

  // ---------- abertura: foto + "isso não é narrativa. É fato."
  const P0 = { s: 0.34, x: 250, y: 560, r: -0.09 };
  function drawIntro(t) {
    const T = R.T;
    const shrink = ease.inOut(prog(t, 4.0, 4.75)), leave = ease.in(prog(t, 4.75, 5.35));
    if (leave >= 1) return;
    R.screen();
    ctx.save();
    // transformação foto → cartão
    const s = lerp(1, P0.s, shrink), cx = lerp(W / 2, P0.x, shrink), cy = lerp(H / 2, P0.y, shrink) - leave * 500;
    ctx.globalAlpha = 1 - leave;
    ctx.translate(cx, cy); ctx.rotate(P0.r * shrink); ctx.scale(s, s);
    // moldura de papel e sombra (só aparecem ao encolher)
    if (shrink > 0) {
      ctx.shadowColor = `rgba(0,0,0,${0.55 * shrink})`; ctx.shadowBlur = 60; ctx.shadowOffsetY = 30;
      ctx.fillStyle = R.PAL.paper; const m = 34 * shrink;
      ctx.fillRect(-W / 2 - m, -H / 2 - m, W + 2 * m, H + 2 * m + 60 * shrink);
      ctx.shadowColor = 'transparent';
    }
    ctx.beginPath(); ctx.rect(-W / 2, -H / 2, W, H); ctx.clip();
    // foto com zoom lento (empurra em direção ao rosto)
    const z = 1 + 0.06 * ease.out(prog(t, 0, 4.2));
    const iw = photo.width, ih = photo.height, base = Math.max(W / iw, H / ih) * z;
    const fx = 0.52, fy = 0.36; // ponto de foco (rosto)
    ctx.drawImage(photo, -iw * base * fx + (fx - 0.5) * W, -ih * base * fy + (fy - 0.5) * H, iw * base, ih * base);
    // escurece a base para o texto
    const g = ctx.createLinearGradient(0, -H / 2 + 900, 0, H / 2);
    g.addColorStop(0, 'rgba(10,14,12,0)'); g.addColorStop(0.55, 'rgba(10,14,12,0.72)'); g.addColorStop(1, 'rgba(10,14,12,0.92)');
    ctx.fillStyle = g; ctx.fillRect(-W / 2, -H / 2, W, H);
    const fin = 1 - prog(t, 0, 0.3);
    if (fin > 0) { ctx.fillStyle = `rgba(16,21,19,${fin})`; ctx.fillRect(-W / 2, -H / 2, W, H); }
    // texto
    ctx.translate(-W / 2, -H / 2);
    const tIsso = T.w(0, 'isso') - 0.1, tNar = T.w(0, 'narrativa') - 0.05, tFato = T.w(0, 'fato') - 0.12;
    ctx.textBaseline = 'top'; ctx.textAlign = 'left';
    const la = prog(t, tIsso, tIsso + 0.3);
    ctx.globalAlpha *= 1;
    if (la > 0) {
      ctx.save(); ctx.globalAlpha = la * (1 - leave);
      ctx.font = '600 34px Inter'; ctx.letterSpacing = '4px'; ctx.fillStyle = 'rgba(240,233,216,0.85)';
      ctx.fillText('ISSO NÃO É', 120, 1130 - (1 - ease.out(la)) * 14);
      ctx.restore();
    }
    const na = ease.outQuint(prog(t, tNar, tNar + 0.5));
    if (na > 0) {
      ctx.save(); ctx.beginPath(); ctx.rect(100, 1170, 900, 150); ctx.clip();
      ctx.font = '400 132px Anton'; ctx.letterSpacing = '1px'; ctx.fillStyle = R.PAL.paper;
      ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 24; ctx.shadowOffsetY = 6;
      ctx.fillText('NARRATIVA.', 116, 1176 + (1 - na) * 150);
      ctx.restore();
      // risco
      const st = ease.inOut(prog(t, tFato, tFato + 0.2));
      if (st > 0) {
        ctx.save(); ctx.strokeStyle = NO_HI; ctx.lineWidth = 14; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(110, 1258); ctx.lineTo(110 + 660 * st, 1246); ctx.stroke(); ctx.restore();
      }
    }
    // carimbo "É FATO."
    const fp = prog(t, tFato + 0.1, tFato + 0.28);
    if (fp > 0) {
      ctx.save();
      ctx.translate(410, 1420); ctx.rotate(-0.07); const ss = lerp(1.6, 1, ease.out(fp)); ctx.scale(ss, ss);
      ctx.globalAlpha = clamp(fp * 2) * (1 - leave);
      ctx.font = '400 150px Anton'; ctx.letterSpacing = '2px';
      const tw = ctx.measureText('É FATO.').width;
      ctx.fillStyle = R.PAL.mustard; ctx.beginPath(); ctx.roundRect(-tw / 2 - 40, -98, tw + 80, 200, 18); ctx.fill();
      ctx.fillStyle = R.PAL.ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('É FATO.', 0, 8);
      ctx.restore();
    }
    ctx.letterSpacing = '0px';
    ctx.restore();
  }
  // tremida curta quando o carimbo bate
  function shake(t) {
    const tf = R.T.w(0, 'fato') + 0.05, u = prog(t, tf, tf + 0.22);
    if (u <= 0 || u >= 1) return [0, 0];
    const a = (1 - u) * 9; return [Math.sin(t * 90) * a, Math.cos(t * 77) * a];
  }

  // ---------- fechamento
  function drawOutro(t) {
    const T = R.T;
    const t0 = T.w(9, 'Faltam') + 0.1, t1 = T.w(9, 'Faça') - 0.05, t2 = T.w(9, 'Vamos') - 0.05;
    if (t < t0) return;
    R.screen(); ctx.save();
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.globalAlpha = clamp(prog(t, t0, t0 + 0.3) * 2);
    ctx.font = '600 30px Inter'; ctx.letterSpacing = '3px'; ctx.fillStyle = 'rgba(240,233,216,0.75)';
    ctx.fillText('FALTAM POUCOS DIAS PARA', 120, 380);
    ctx.globalAlpha = 1;
    const line = (txt, y, size, color, a, h) => {
      const p = ease.outQuint(prog(t, a, a + 0.6));
      if (p <= 0) return;
      ctx.save(); ctx.beginPath(); ctx.rect(100, y - 6, 860, h); ctx.clip();
      ctx.font = `400 ${size}px Anton`; ctx.letterSpacing = '1px'; ctx.fillStyle = color;
      ctx.shadowColor = 'rgba(0,0,0,0.55)'; ctx.shadowBlur = 24; ctx.shadowOffsetY = 6;
      ctx.fillText(txt, 120, y + (1 - p) * h); ctx.restore();
    };
    line('25 DE OUTUBRO.', 430, 112, R.PAL.paper, t0 + 0.1, 128);
    ctx.fillStyle = R.PAL.paper; ctx.fillRect(122, 568, 96 * ease.inOut(prog(t, t0 + 0.6, t0 + 1.1)), 3);
    line('FAÇA A ESCOLHA CERTA.', 590, 70, R.PAL.mustard, t1, 84);
    const fa = ease.out(prog(t, t2, t2 + 0.5));
    if (fa > 0) {
      drawFlag(126, 702 + (1 - fa) * 20, 132, t, fa);
      ctx.globalAlpha = fa; ctx.font = '800 36px Inter'; ctx.letterSpacing = '1px'; ctx.fillStyle = R.PAL.paper;
      ctx.fillText('VAMOS TRAZER O', 290, 704 + (1 - fa) * 14);
      ctx.fillText('BRASIL DE VOLTA.', 290, 748 + (1 - fa) * 14);
    }
    ctx.restore(); ctx.letterSpacing = '0px';
  }

  function drawHandle(t) {
    R.screen();
    ctx.save();
    const label = '@plenarinho.decente';
    ctx.font = '600 25px Inter'; ctx.letterSpacing = '0.6px';
    const tw = ctx.measureText(label).width;
    const h = 46, padL = 40, padR = 20, w = padL + tw + padR;
    const x = 900 - w, y = 290;
    ctx.fillStyle = 'rgba(16,21,19,0.55)';
    ctx.strokeStyle = 'rgba(240,233,216,0.35)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect(x, y, w, h, h / 2); ctx.fill(); ctx.stroke();
    const cx = x + 22, cy = y + h / 2, ph = (t * 0.8) % 1;
    ctx.strokeStyle = `rgba(240,233,216,${0.45 * (1 - ph)})`; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.arc(cx, cy, 4 + ph * 9, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = R.PAL.paper; ctx.beginPath(); ctx.arc(cx, cy, 3.6, 0, Math.PI * 2); ctx.fill();
    ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    ctx.fillText(label, x + padL, cy + 1);
    ctx.restore(); ctx.letterSpacing = '0px';
  }

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
    camera(t);
    const [sx, sy] = shake(t);
    R.cam.cx = W / 2 + sx; R.cam.cy = H / 2 + sy;
    R.screen();
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = R.PAL.bg; ctx.fillRect(0, 0, W, H);
    const spot = ctx.createRadialGradient(W / 2, H * 0.52, 60, W / 2, H * 0.52, H * 0.62);
    spot.addColorStop(0, R.PAL.bgLight); spot.addColorStop(1, R.PAL.bg);
    ctx.fillStyle = spot; ctx.fillRect(0, 0, W, H);
    let tags = [];
    if (t > 3.5) {
      drawGrid();
      const scene = R.buildScene(t);
      R.world();
      for (const fn of scene.slabs) fn();
      scene.items.sort((a, b) => a.depth - b.depth);
      for (const it of scene.items) it.fn();
      tags = scene.tags;
      tiltShift();
    }
    R.screen();
    const v = ctx.createRadialGradient(W / 2, H * 0.5, H * 0.25, W / 2, H * 0.5, H * 0.75);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.62)');
    ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 0.5; ctx.drawImage(grain[Math.floor(t * 30) % 3], 0, 0, W, H); ctx.globalAlpha = 1;
    R.beginLabels();
    for (const fn of tags) fn();
    R.flushLabels(t);
    drawIntro(t);
    drawOutro(t);
    drawHandle(t);
  }

  async function load() {
    const svg = window.FLAG_SVG.replace('<svg ', '<svg width="700" height="490" ');
    const img = new Image();
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    await img.decode();
    flagTex = document.createElement('canvas'); flagTex.width = 700; flagTex.height = 490;
    flagTex.getContext('2d').drawImage(img, 0, 0, 700, 490);
    photo = new Image(); photo.src = window.FOTO; await photo.decode();
    await Promise.all(['800 30px Inter', '600 30px Inter', '700 40px Inter', '400 98px Anton', '500 23px "IBM Plex Mono"'].map(f => document.fonts.load(f)));
    keys = R.cameraKeys();
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
