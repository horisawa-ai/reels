// Marca @plenarinho.decente: púlpito na frente de um plenarinho de lâmpadas.
// window.frame(t, modo) desenha o quadro t (s). modo: 'vinheta' | 'avatar' | 'logo'
(function () {
  const R = window.R, D = R.draw, P = R.P, ctx = R.ctx, PAL = R.PAL;
  const { clamp, lerp, prog, ease } = R.U;
  R.STYLE = { lw: 0, grad: false, rim: true, shadow: 'long', pattern: false, sides: [0.82, 0.62] };
  const cam = R.cam;
  let W = 1080, H = 1080;
  const size = (w, h) => { W = w; H = h; R.canvas.width = w; R.canvas.height = h; };

  // ---------- tempos da vinheta (s)
  const TL = { base: 0.05, pulp: 0.35, seats: [0.7, 1.45], blink: [1.6, 1.9], text: 1.25, dot: 1.6, end: 3.2 };
  window.TL = TL;

  // assentos: duas fileiras em meia-lua atrás do púlpito, ordem de acendimento da esquerda p/ direita
  const SEATS = [];
  for (const [r, n] of [[86, 5], [122, 7]]) for (let i = 0; i < n; i++) {
    const th = (135 + 180 * (i + 0.5) / n) * Math.PI / 180;
    SEATS.push({ x: Math.cos(th) * r, y: Math.sin(th) * r });
  }
  // esquerda na tela = X menor = x - y menor
  const order = SEATS.slice().sort((a, b) => (a.x - a.y) - (b.x - b.y));
  order.forEach((s, i) => { s.k = i; });
  window.SEAT_TIMES = order.map((s, i) => lerp(TL.seats[0], TL.seats[1], i / (order.length - 1)));

  function popAt(px, py, z, s, fn) {
    if (s <= 0.001) return;
    const c = P(px, py, z);
    ctx.save(); ctx.translate(c.X, c.Y); ctx.scale(s, s); ctx.translate(-c.X, -c.Y); fn(); ctx.restore();
  }
  function seat(s, on) {
    D.cyl(s.x, s.y, 16, 11, 13, PAL.sage);
    lampSoft(s.x, s.y, 36, on, 6.5);
  }
  // lâmpada com brilho mais contido (muitas juntas)
  function lampSoft(x, y, z, on, r) {
    const c = P(x, y, z);
    if (on > 0) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(c.X, c.Y, 0, c.X, c.Y, r * 3.2);
      g.addColorStop(0, `rgba(${PAL.glow},${0.42 * on})`); g.addColorStop(1, `rgba(${PAL.glow},0)`);
      ctx.fillStyle = g; ctx.fillRect(c.X - r * 4, c.Y - r * 4, r * 8, r * 8); ctx.restore();
    }
    ctx.beginPath(); ctx.arc(c.X, c.Y, r, 0, Math.PI * 2);
    ctx.fillStyle = on > 0.5 ? PAL.lampOn : PAL.lampOff; ctx.fill();
    ctx.beginPath(); ctx.arc(c.X - r * 0.3, c.Y - r * 0.35, r * 0.28, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.fill();
  }
  function pulpit(x, y, lamp, rings) {
    const z = 16;
    D.box(x - 36, y - 36, z, 72, 72, 10, R.shade(PAL.dark, 1.35));
    D.box(x - 27, y - 27, z + 10, 54, 54, 80, PAL.paper);
    D.onFace('left', x - 27, y + 27, z + 90, g => { g.fillStyle = PAL.slab; g.fillRect(9, 12, 36, 50); g.fillStyle = PAL.mustard; g.fillRect(9, 30, 36, 5); });
    D.onFace('right', x + 27, y + 27, z + 90, g => { g.fillStyle = 'rgba(0,0,0,0.08)'; g.fillRect(9, 12, 36, 50); });
    D.box(x - 32, y - 32, z + 90, 64, 64, 8, PAL.wood);
    D.lamp(x - 20, y - 20, z + 106, lamp, 9);
    // microfone de haste, na borda da frente, virado para quem assiste
    const a = P(x + 14, y + 14, z + 98), m = P(x + 30, y + 30, z + 128);
    ctx.strokeStyle = '#C9C2B2'; ctx.lineWidth = 3.4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(a.X, a.Y); ctx.quadraticCurveTo(a.X - 2, m.Y - 6, m.X, m.Y); ctx.stroke();
    ctx.fillStyle = R.shade(PAL.dark, 1.6);
    ctx.beginPath(); ctx.ellipse(m.X, m.Y, 6.5, 9.5, 0.35, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.beginPath(); ctx.ellipse(m.X - 2, m.Y - 3, 2.2, 3.4, 0.35, 0, Math.PI * 2); ctx.fill();
    if (rings > 0) {
      ctx.strokeStyle = PAL.mustard; ctx.lineCap = 'round';
      for (let i = 1; i <= 2; i++) {
        const k = clamp(rings * 2 - (i - 1) * 0.5);
        if (k <= 0) continue;
        ctx.globalAlpha = (1 - i * 0.25) * Math.sin(Math.PI * k);
        ctx.lineWidth = 3.2; ctx.beginPath(); ctx.arc(m.X, m.Y, 13 + i * 9 + k * 4, -0.7, 0.7); ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
  }
  function base(s) {
    popAt(0, 0, 0, s, () => {
      D.cyl(0, 0, -34, 150, 34, '#26302B');
      D.cyl(0, 0, 0, 153, 4, R.shade(PAL.paper, 0.86), { noShadow: true });
      D.cyl(0, 0, 4, 150, 12, PAL.slab, { noShadow: true });
    });
  }
  // luz da sessão: liga em t0 e pisca 2 vezes
  const blink = t => {
    if (t < TL.blink[0]) return 0;
    const u = (t - TL.blink[0]) / 0.15;
    if (u < 1) return 1; if (u < 2) return 0.15; if (u < 3) return 1; if (u < 4) return 0.15; return 1;
  };

  function scene(t) {
    base(ease.back(prog(t, TL.base, TL.base + 0.45)));
    const items = [];
    for (const s of SEATS) {
      const t0 = window.SEAT_TIMES[s.k];
      const sp = ease.back(prog(t, t0 - 0.35, t0 - 0.05));
      items.push({ d: s.x + s.y, fn: () => popAt(s.x, s.y, 16, sp, () => seat(s, prog(t, t0, t0 + 0.06))) });
    }
    const pp = ease.back(prog(t, TL.pulp, TL.pulp + 0.45));
    items.push({ d: 26 + 26 + 10, fn: () => popAt(26, 26, 16, pp, () => pulpit(26, 26, blink(t), prog(t, TL.blink[0], TL.blink[0] + 0.9))) });
    items.sort((a, b) => a.d - b.d).forEach(it => it.fn());
  }

  function bgFill(cx, cy, r) {
    ctx.fillStyle = PAL.bg; ctx.fillRect(0, 0, W, H);
    const g = ctx.createRadialGradient(cx, cy, 40, cx, cy, r);
    g.addColorStop(0, '#1F2A25'); g.addColorStop(1, PAL.bg);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }

  // "plenarinho.decente" com o ponto em forma de lâmpada
  function wordmark(t, cx, y, px, reveal = true) {
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.font = `700 ${px}px "Inter Display", Inter`; ctx.letterSpacing = `${-px * 0.025}px`; ctx.textBaseline = 'alphabetic';
    const a = 'plenarinho', b = 'decente';
    const wa = ctx.measureText(a).width, wb = ctx.measureText(b).width;
    const dotW = px * 0.36, r = px * 0.095;
    const x0 = cx - (wa + dotW + wb) / 2;
    const pa = reveal ? ease.outQuint(prog(t, TL.text, TL.text + 0.55)) : 1;
    const pb = reveal ? ease.outQuint(prog(t, TL.text + 0.12, TL.text + 0.67)) : 1;
    ctx.beginPath(); ctx.rect(0, y - px * 1.05, W, px * 1.35); ctx.clip();
    ctx.fillStyle = PAL.paper;
    ctx.fillText(a, x0, y + (1 - pa) * px * 1.2);
    ctx.fillText(b, x0 + wa + dotW, y + (1 - pb) * px * 1.2);
    // ponto-lâmpada
    const on = reveal ? blink(t) * clamp(prog(t, TL.dot, TL.dot + 0.05)) : 1;
    const ds = reveal ? ease.back(prog(t, TL.dot - 0.25, TL.dot)) : 1;
    const dx = x0 + wa + dotW / 2, dy = y - r;
    if (ds > 0) {
      if (on > 0.5) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        const g = ctx.createRadialGradient(dx, dy, 0, dx, dy, r * 3.6);
        g.addColorStop(0, `rgba(${PAL.glow},${0.55 * on})`); g.addColorStop(1, `rgba(${PAL.glow},0)`);
        ctx.fillStyle = g; ctx.fillRect(dx - r * 5, dy - r * 5, r * 10, r * 10); ctx.restore();
      }
      ctx.fillStyle = on > 0.5 ? PAL.lampOn : '#5A5F55';
      ctx.beginPath(); ctx.arc(dx, dy, r * ds, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  window.frame = function (t, mode) {
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.letterSpacing = '0px';
    if (mode === 'avatar') {
      size(1080, 1080); bgFill(540, 480, 620);
      cam.zoom = 1.9; cam.fx = 0; cam.fy = 10; cam.cx = 540; cam.cy = 570;
      R.world(); scene(9);
    } else if (mode === 'logo') {
      size(1080, 1080); bgFill(540, 380, 600);
      cam.zoom = 1.6; cam.fx = 0; cam.fy = -42; cam.cx = 540; cam.cy = 430;
      R.world(); scene(9); wordmark(9, 540, 860, 96, false);
    } else if (mode === 'banner') {
      size(1600, 600); bgFill(330, 280, 500);
      cam.zoom = 1.12; cam.fx = 0; cam.fy = -42; cam.cx = 300; cam.cy = 320;
      R.world(); scene(9); wordmark(9, 1010, 340, 104, false);
    } else { // vinheta quadrada ou vertical
      const vert = mode === 'vertical';
      size(1080, vert ? 1920 : 1080);
      const cy = vert ? 860 : 430;
      bgFill(540, cy - 40, 640);
      const z = lerp(1.45, 1.6, ease.out(prog(t, 0, TL.end)));
      cam.zoom = z; cam.fx = 0; cam.fy = -42; cam.cx = 540; cam.cy = cy;
      R.world(); scene(t);
      wordmark(t, 540, cy + 430, 96, true);
      // saída suave
      const out = prog(t, TL.end - 0.35, TL.end);
      if (out > 0) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = `rgba(16,21,19,${out})`; ctx.fillRect(0, 0, W, H); }
    }
    return R.canvas.toDataURL('image/png').split(',')[1];
  };
  window.MARCA_READY = document.fonts.load('700 96px "Inter Display"').then(() => true);
})();
