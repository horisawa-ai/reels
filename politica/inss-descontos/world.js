// Maquete do episódio "INSS": o cano do benefício sai do INSS e vai até a casa do aposentado;
// no meio, as associações furam o cano. Cada estação anima pelas palavras da narração (R.T.w).
(function () {
  const R = window.R, D = R.draw, P = R.P;
  const { clamp, lerp, prog, ease, pulse, rng } = R.U;
  const ctx = R.ctx;
  const PAL = () => R.PAL;
  const SLAB = 24, PZ = 46;
  const NO = '#B4806E', NO_HI = '#D39A82', BLUE = '#5B86D6', RED = '#D65B5B';

  // ---------- ilhas
  const ISL = {
    inss: { x: 0, y: 0, s: 300 },
    assoc: { x: 850, y: 0, s: 300 },
    casa: { x: 1700, y: 0, s: 300 },
    graf: { x: 0, y: 850, s: 300 },
    alerta: { x: 850, y: 850, s: 300 },
    cgu: { x: 1700, y: 850, s: 300 },
  };
  const C = k => ({ x: ISL[k].x + ISL[k].s / 2, y: ISL[k].y + ISL[k].s / 2 });
  R.FOCUS = {};
  for (const k in ISL) { const c = C(k); R.FOCUS[k] = P(c.x, c.y, 50); }
  const mid = (a, b) => ({ X: (a.X + b.X) / 2, Y: (a.Y + b.Y) / 2 });
  R.FOCUS.all = P(1000, 575, 0);
  R.FOCUS.pipe = P(1000, 150, 60);
  R.FOCUS.pipeL = P(620, 150, 60);
  R.FOCUS.pipeR = P(1380, 150, 60);
  R.FOCUS.ga = mid(R.FOCUS.graf, R.FOCUS.alerta);
  R.FOCUS.ac = mid(R.FOCUS.alerta, R.FOCUS.cgu);
  R.FOCUS.ia = mid(R.FOCUS.inss, R.FOCUS.assoc);

  // ---------- base de maquete (pedestal, filete creme, bandeja verde)
  function drawBase(x, y, w, d) {
    let z = -46;
    const c = [P(x, y + d, z), P(x + w, y + d, z), P(x + w, y, z)];
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 50; ctx.shadowOffsetY = 26;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath(); ctx.moveTo(c[0].X, c[0].Y); ctx.lineTo(c[1].X, c[1].Y); ctx.lineTo(c[2].X, c[2].Y);
    const b = P(x, y, z); ctx.lineTo(b.X, b.Y); ctx.closePath(); ctx.fill();
    ctx.restore();
    D.box(x, y, z, w, d, 46, '#26302B', { noShadow: true });
    D.box(x - 3, y - 3, 0, w + 6, d + 6, 4, R.shade(PAL().paper, 0.86), { noShadow: true });
    D.box(x, y, 4, w, d, SLAB - 4, PAL().slab, { noShadow: true });
    D.onFace('top', x, y, SLAB, g => {
      const gr = g.createLinearGradient(0, 0, w, d);
      gr.addColorStop(0, 'rgba(255,250,236,0.07)'); gr.addColorStop(1, 'rgba(0,0,0,0.10)');
      g.fillStyle = gr; g.fillRect(0, 0, w, d);
      g.strokeStyle = 'rgba(240,233,216,0.10)'; g.lineWidth = 2; g.strokeRect(12, 12, w - 24, d - 24);
    });
  }
  function tree(x, y, k) {
    const z = SLAB;
    D.cyl(x, y, z, 2.6 * k, 9 * k, R.shade(PAL().wood, 0.8));
    D.sphere(x + 3 * k, y - 2 * k, z + 13 * k, 7.5 * k, R.shade(PAL().tree, 1.0));
    D.sphere(x, y, z + 17 * k, 9 * k, R.shade(PAL().tree, 1.18));
    D.sphere(x - 2.5 * k, y + 2 * k, z + 23 * k, 6 * k, R.shade(PAL().tree, 1.42));
  }
  function person(x, y, z, color, o = {}) {
    const k = o.k || 1;
    D.cyl(x, y, z, 9 * k, 20 * k, color);
    D.sphere(x, y, z + 21 * k, 9 * k, color);
    D.sphere(x, y, z + 36 * k, 8 * k, o.head || PAL().skin);
    if (o.hair) D.sphere(x - 1.5 * k, y - 1.5 * k, z + 41 * k, 5.5 * k, o.hair);
  }
  // painel em pé virado para a câmera (face +y)
  function board(x, y, z, w, h, color, fn, legs = true) {
    if (legs) { D.box(x + 6, y, SLAB, 6, 6, z - SLAB, PAL().gray); D.box(x + w - 12, y, SLAB, 6, 6, z - SLAB, PAL().gray); }
    D.box(x, y, z, w, 8, h, color);
    D.onFace('left', x, y + 8, z + h, fn);
  }
  // telhado de duas águas (cumeeira ao longo de x)
  function roof(x, y, z, w, d, h, color) {
    const a = [P(x, y + d, z), P(x + w, y + d, z), P(x + w, y + d / 2, z + h), P(x, y + d / 2, z + h)];
    const g = [P(x + w, y, z), P(x + w, y + d, z), P(x + w, y + d / 2, z + h)];
    const q = pts => { ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p.X, p.Y) : ctx.moveTo(p.X, p.Y))); ctx.closePath(); };
    q(a); ctx.fillStyle = R.shade(color, 0.9); ctx.fill();
    q(g); ctx.fillStyle = R.shade(color, 0.66); ctx.fill();
    ctx.strokeStyle = 'rgba(255,250,236,0.35)'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(a[3].X, a[3].Y); ctx.lineTo(a[2].X, a[2].Y); ctx.stroke();
  }
  function glow(c, r, a, rgb) {
    if (a <= 0) return;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(c.X, c.Y, 0, c.X, c.Y, r);
    g.addColorStop(0, `rgba(${rgb || PAL().glow},${a})`); g.addColorStop(1, `rgba(${rgb || PAL().glow},0)`);
    ctx.fillStyle = g; ctx.fillRect(c.X - r, c.Y - r, r * 2, r * 2); ctx.restore();
  }
  function lampC(x, y, z, on, r, col, rgb) {
    const c = P(x, y, z);
    glow(c, r * 5, 0.55 * on, rgb);
    ctx.beginPath(); ctx.arc(c.X, c.Y, r, 0, Math.PI * 2);
    ctx.fillStyle = on > 0.5 ? col : PAL().lampOff; ctx.fill();
    ctx.beginPath(); ctx.arc(c.X - r * 0.3, c.Y - r * 0.35, r * 0.28, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.fill();
  }
  function dashArc(A, B, bend, p, o = {}) {
    if (p <= 0) return null;
    const Cc = { X: (A.X + B.X) / 2 + bend.X, Y: (A.Y + B.Y) / 2 + bend.Y };
    const pt = u => ({ X: (1 - u) * (1 - u) * A.X + 2 * (1 - u) * u * Cc.X + u * u * B.X, Y: (1 - u) * (1 - u) * A.Y + 2 * (1 - u) * u * Cc.Y + u * u * B.Y });
    ctx.save();
    ctx.globalAlpha = o.alpha == null ? 1 : o.alpha;
    ctx.strokeStyle = o.color || PAL().paper; ctx.lineWidth = o.w || 6; ctx.lineCap = 'round';
    ctx.setLineDash([(o.w || 6) * 2.6, (o.w || 6) * 2.2]);
    ctx.beginPath();
    const N = 40, M = Math.max(1, Math.round(N * p));
    for (let i = 0; i <= M; i++) { const q = pt(i / N); i ? ctx.lineTo(q.X, q.Y) : ctx.moveTo(q.X, q.Y); }
    ctx.stroke(); ctx.restore();
    return pt;
  }
  // rótulo preso a um ponto do mundo
  const tagAt = (tags, x, y, z, text, p, o = {}) => tags.push(() => { const s = R.S(x, y, z); R.pill(s.x + (o.ox || 0), s.y, text, p, Object.assign({ anchorBottom: true, size: 28 }, o)); });
  // aparece em [a, a+d] e some em [b, b+d]
  const span = (t, a, b, d = 0.25) => prog(t, a, a + d) * (1 - prog(t, b, b + d));

  // ======================================================================
  // CANO DO BENEFÍCIO + MOEDAS
  // ======================================================================
  const PX0 = 190, PX1 = 1860, PY = 150, TAP = 1000, BR_Y = 92;
  function pipeLine(x0, y0, x1, y1, lit = 0) {
    const A = P(x0, y0, PZ), B = P(x1, y1, PZ);
    const line = (w, c, dy = 0) => { ctx.strokeStyle = c; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(A.X, A.Y + dy); ctx.lineTo(B.X, B.Y + dy); ctx.stroke(); };
    ctx.lineCap = 'butt';
    line(17, R.shade(PAL().pipe, 0.55)); line(13.5, PAL().pipe);
    if (lit > 0) { ctx.globalAlpha = lit; line(13.5, PAL().pipeLit); ctx.globalAlpha = 1; }
    line(3, 'rgba(255,255,255,0.8)', -3.6);
  }
  function addPipe(add, t) {
    const STEP = 60;
    for (let x = PX0; x < PX1; x += STEP) {
      const x1 = Math.min(x + STEP, PX1);
      add(x + PY + 30, () => pipeLine(x, PY, x1, PY));
      if (((x - PX0) / STEP) % 3 === 1) {
        const inIsl = Object.values(ISL).some(i => x > i.x && x < i.x + i.s && PY > i.y && PY < i.y + i.s);
        add(x + PY + 29, () => { if (!inIsl) D.cyl(x, PY, 0, 4.5, PZ - 8, PAL().gray); const c = P(x, PY, PZ); ctx.fillStyle = PAL().line; ctx.beginPath(); ctx.ellipse(c.X, c.Y, 6, 13.5, 0, 0, Math.PI * 2); ctx.fill(); });
      }
    }
    // registro (torneira) e desvio para a associação
    const tapOn = ease.back(prog(t, R.T.w(2, 'cobrar') - 0.1, R.T.w(2, 'cobrar') + 0.3));
    if (tapOn > 0) {
      add(TAP + BR_Y + 2, () => {
        const c = P(TAP, PY, PZ);
        ctx.save(); ctx.translate(c.X, c.Y); ctx.scale(tapOn, tapOn); ctx.translate(-c.X, -c.Y);
        pipeLine(TAP, BR_Y, TAP, PY);
        D.box(TAP - 13, PY - 13, PZ - 13, 26, 26, 26, NO);
        D.cyl(TAP, PY, PZ + 13, 3, 12, PAL().gray);
        D.box(TAP - 18, PY - 4, PZ + 25, 36, 8, 5, PAL().mustard);
        ctx.restore();
      });
    }
  }
  // moedas: saem do INSS a cada 0,42 s; depois que o desconto começa, uma em cada duas vai para a associação
  const SPEED = 330, EVERY = 0.42;
  function coinsAt(t) {
    const out = [];
    const start = 4.2, divert = R.T.w(2, 'cobrar') + 0.2;
    const travel = (PX1 - PX0) / SPEED;
    const n0 = Math.max(0, Math.floor((t - start - travel - 1) / EVERY)), n1 = Math.floor((t - start) / EVERY);
    for (let n = n0; n <= n1; n++) {
      const t0 = start + n * EVERY, dt = t - t0;
      if (dt < 0) continue;
      const x = PX0 + dt * SPEED;
      const tTap = t0 + (TAP - PX0) / SPEED;
      const div = n % 2 === 0 && tTap > divert;
      if (div && x > TAP) {
        const yy = PY - (x - TAP) * 0.9;
        if (yy < BR_Y - 6) continue;
        out.push({ x: TAP, y: yy, a: 1 - prog(yy, PY - 20, BR_Y - 6) * 0.2, div: true });
      } else if (x < PX1) out.push({ x, y: PY, a: 1 - prog(x, PX1 - 50, PX1), div: false });
    }
    return out;
  }
  function coin(x, y, a, hot) {
    const c = P(x, y, PZ + 11);
    ctx.save(); ctx.globalAlpha = a;
    ctx.fillStyle = R.shade(PAL().mustard, 0.62); ctx.beginPath(); ctx.ellipse(c.X, c.Y + 3.5, 13, 7, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = hot ? NO_HI : PAL().mustard; ctx.beginPath(); ctx.ellipse(c.X, c.Y, 13, 7, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.ellipse(c.X, c.Y, 8, 4.2, 0, Math.PI, Math.PI * 1.9); ctx.stroke();
    ctx.restore();
  }

  // ======================================================================
  // ESTAÇÕES
  // ======================================================================
  const T = () => R.T;

  // casa do aposentado + extrato
  function stCasa(t, add, O, tags) {
    const w = T().w.bind(T());
    const hx = O.x + 150, hy = O.y + 60;
    const dim = 1 - 0.85 * prog(t, w(8, 'Quem') + 0.3, w(8, 'parado'));
    add(hx + 60 + hy + 55, () => {
      D.box(hx, hy, SLAB, 120, 110, 70, PAL().paper);
      D.onFace('left', hx, hy + 110, SLAB + 70, g => {
        g.fillStyle = PAL().wood; g.fillRect(20, 30, 22, 40);
        g.fillStyle = dim > 0.5 ? PAL().lampOn : '#4A5149'; g.globalAlpha = 0.35 + 0.65 * dim; g.fillRect(62, 22, 38, 26); g.globalAlpha = 1;
        g.strokeStyle = R.shade(PAL().paper, 0.7); g.lineWidth = 2; g.strokeRect(62, 22, 38, 26);
      });
      roof(hx - 6, hy - 6, SLAB + 70, 132, 122, 44, PAL().terracotta);
      glow(P(hx + 80, hy + 110, SLAB + 35), 70, 0.35 * dim);
    });
    // aposentado
    add(O.x + 215 + O.y + 215, () => person(O.x + 215, O.y + 215, SLAB, PAL().slate, { hair: '#E8E4DA' }));
    // extrato em pé
    const show = ease.back(prog(t, 4.6, 5.1));
    const rows = [
      ['BENEFÍCIO INSS', '+ R$ ●●●●', w(1, 'extrato'), 'ok'],
      ['EMPRÉSTIMO', '—', w(1, 'empréstimo'), 'x'],
      ['PLANO DE SAÚDE', '—', w(1, 'plano'), 'x'],
      ['MENSALIDADE ASSOC.', '− R$ 81,57', w(1, 'mensalidade'), 'no'],
    ];
    const BX = O.x + 12, BY = O.y + 232, BW = 186, BH = 150;
    add(BX + BW / 2 + BY + 4, () => {
      if (show <= 0) return;
      const c = P(BX + BW / 2, BY, SLAB);
      ctx.save(); ctx.translate(c.X, c.Y); ctx.scale(show, show); ctx.translate(-c.X, -c.Y);
      board(BX, BY, SLAB + 26, BW, BH, PAL().paper, g => {
        g.fillStyle = PAL().ink; g.font = '800 14px Inter'; g.fillText('EXTRATO DO BENEFÍCIO', 12, 24);
        g.fillStyle = 'rgba(16,21,19,0.25)'; g.fillRect(12, 32, BW - 24, 2);
        rows.forEach(([lab, val, at, kind], i) => {
          const a = prog(t, at, at + 0.25);
          if (a <= 0) return;
          const y = 58 + i * 26;
          g.globalAlpha = a;
          if (kind === 'no') { g.fillStyle = NO; g.globalAlpha = a * (0.3 + 0.15 * Math.sin(t * 8)); g.fillRect(6, y - 17, BW - 12, 24); g.globalAlpha = a; }
          g.fillStyle = kind === 'no' ? '#6E2F21' : PAL().ink; g.font = '700 10.5px Inter'; g.fillText(lab, 12, y);
          g.font = '500 10.5px "IBM Plex Mono"'; g.fillText(val, 116, y);
          if (kind === 'x') { g.strokeStyle = NO; g.lineWidth = 2.5; g.beginPath(); g.moveTo(10, y - 4); g.lineTo(10 + (BW - 20) * prog(t, at + 0.1, at + 0.4), y - 4); g.stroke(); }
          g.globalAlpha = 1;
        });
      }, true);
      ctx.restore();
    });
    tagAt(tags, O.x + 105, O.y + 232, SLAB + 200, 'NUNCA AUTORIZOU', prog(t, w(1, 'nunca'), w(1, 'nunca') + 0.3), { at: w(1, 'nunca'), fill: PAL().mustard });
    tagAt(tags, O.x + 105, O.y + 232, SLAB + 200, '✕  NÃO É EMPRÉSTIMO', prog(t, w(1, 'empréstimo'), w(1, 'empréstimo') + 0.3), { at: w(1, 'empréstimo') });
    tagAt(tags, O.x + 105, O.y + 232, SLAB + 200, '✕  NÃO É PLANO DE SAÚDE', prog(t, w(1, 'plano'), w(1, 'plano') + 0.3), { at: w(1, 'plano') });
    tagAt(tags, O.x + 105, O.y + 232, SLAB + 200, 'MENSALIDADE ASSOCIATIVA', span(t, w(1, 'mensalidade'), R.BEATS[1].end + 0.4), { at: w(1, 'mensalidade'), fill: NO_HI });
    tagAt(tags, O.x + 150, O.y + 60, SLAB + 150, 'QUEM PAGOU A CONTA', span(t, w(8, 'Quem') + 0.6, w(9, 'Faltam')), { at: w(8, 'Quem') + 0.6, fill: NO_HI });
    add(O.x + 270 + O.y + 270, () => tree(O.x + 272, O.y + 272, 1.4));
    add(O.x + 270 + O.y + 30, () => tree(O.x + 272, O.y + 28, 1.3));
  }

  // INSS + ministério + mesa do presidente do INSS
  function stInss(t, add, O, tags) {
    const w = T().w.bind(T());
    const bx = O.x + 30, by = O.y + 95;
    add(bx + 80 + by + 52, () => {
      D.box(bx, by, SLAB, 160, 105, 78, PAL().paper);
      D.onFace('left', bx, by + 105, SLAB + 78, g => {
        for (let i = 0; i < 6; i++) { g.fillStyle = 'rgba(16,21,19,0.13)'; g.fillRect(14 + i * 24, 24, 9, 54); }
        g.fillStyle = PAL().slab; g.fillRect(48, 4, 64, 16);
        g.fillStyle = PAL().paper; g.font = '800 12px Inter'; g.fillText('INSS', 66, 16.5);
      });
      D.box(bx - 6, by - 6, SLAB + 78, 172, 117, 7, R.shade(PAL().paper, 0.86));
    });
    // ministério (atrás, à direita)
    const mx = O.x + 200, my = O.y + 12;
    const lupiOut = prog(t, w(6, 'Lupi', 2), w(6, 'Lupi', 2) + 0.3);
    add(mx + 45 + my + 40, () => {
      D.box(mx, my, SLAB, 90, 70, 128, R.shade(PAL().stone, 0.95));
      D.onFace('left', mx, my + 70, SLAB + 128, g => {
        for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
          const on = (r * 4 + c) % 3 !== 0 ? 1 - lupiOut : 0;
          g.fillStyle = on > 0.5 ? PAL().lampOn : 'rgba(16,21,19,0.25)'; g.fillRect(10 + c * 19, 14 + r * 26, 11, 14);
        }
      });
      lampC(mx + 45, my + 35, SLAB + 140, 1 - lupiOut, 7, PAL().lampOn);
    });
    // mesa do presidente do INSS (frente)
    const dx = O.x + 70, dy = O.y + 236;
    const gone = prog(t, w(6, 'demitido'), w(6, 'demitido') + 0.5);
    add(dx + dy - 14, () => {
      if (gone < 1) { ctx.save(); ctx.globalAlpha = 1 - gone; person(dx + 20, dy - 14, SLAB + 0 - gone * 10, PAL().dark); ctx.restore(); }
    });
    add(dx + 20 + dy + 15, () => {
      D.box(dx, dy, SLAB, 44, 26, 26, PAL().wood);
      D.box(dx - 2, dy - 2, SLAB + 26, 48, 30, 4, R.shade(PAL().wood, 1.15));
      D.box(dx + 8, dy + 20, SLAB + 30, 26, 4, 9, PAL().mustard);
    });
    // grade (preso pela PF)
    const jail = ease.back(prog(t, w(6, 'preso'), w(6, 'preso') + 0.35));
    if (jail > 0) add(dx + dy + 40, () => {
      const c = P(dx + 20, dy + 10, SLAB);
      ctx.save(); ctx.translate(c.X, c.Y); ctx.scale(jail, jail); ctx.translate(-c.X, -c.Y);
      for (let i = 0; i <= 5; i++) D.cyl(dx - 6 + i * 11, dy + 34, SLAB, 2.2, 62, PAL().dark, { noShadow: true });
      D.box(dx - 10, dy + 30, SLAB + 62, 66, 8, 5, PAL().dark, { noShadow: true });
      ctx.restore();
    });
    tagAt(tags, dx + 20, dy, SLAB + 80, 'ALESSANDRO STEFANUTTO · PRESIDENTE DO INSS', prog(t, w(6, 'presidente'), w(6, 'presidente') + 0.3), { at: w(6, 'presidente'), size: 22 });
    tagAt(tags, dx + 20, dy, SLAB + 80, 'INDICADO POR LUPI', prog(t, w(6, 'indicado'), w(6, 'indicado') + 0.3), { at: w(6, 'indicado'), fill: PAL().mustard });
    tagAt(tags, dx + 20, dy, SLAB + 80, 'DEMITIDO NO MESMO DIA', prog(t, w(6, 'demitido'), w(6, 'demitido') + 0.3), { at: w(6, 'demitido'), fill: NO_HI });
    tagAt(tags, dx + 20, dy, SLAB + 100, 'PRESO PELA PF · NOV/2025', prog(t, w(6, 'preso'), w(6, 'preso') + 0.3), { at: w(6, 'preso'), fill: NO_HI });
    tagAt(tags, mx + 45, my + 35, SLAB + 165, '9 DIAS DEPOIS', prog(t, w(6, 'Nove'), w(6, 'Nove') + 0.3), { at: w(6, 'Nove') });
    tagAt(tags, mx + 45, my + 35, SLAB + 165, 'LUPI DEIXA O MINISTÉRIO · 02/05/2025', prog(t, w(6, 'Lupi', 2), w(6, 'Lupi', 2) + 0.3), { at: w(6, 'Lupi', 2), fill: NO_HI, size: 24 });
    add(O.x + 270 + O.y + 270, () => tree(O.x + 272, O.y + 268, 1.4));
    add(O.x + 25 + O.y + 25, () => tree(O.x + 24, O.y + 26, 1.2));
  }

  // associações: o acordo, o desconto, a operação e o sindicato que cresce
  function stAssoc(t, add, O, tags) {
    const w = T().w.bind(T());
    // associação que recebe o desvio
    const ax = O.x + 112, ay = O.y + 22;
    add(ax + 38 + ay + 34, () => {
      D.box(ax, ay, SLAB, 76, 68, 74, PAL().sage);
      D.onFace('left', ax, ay + 68, SLAB + 74, g => {
        g.fillStyle = PAL().paper; g.fillRect(8, 8, 60, 13);
        g.fillStyle = PAL().ink; g.font = '800 7.5px Inter'; g.fillText('ASSOCIAÇÃO', 13, 17.5);
        for (let i = 0; i < 3; i++) { g.fillStyle = 'rgba(240,233,216,0.25)'; g.fillRect(10 + i * 20, 34, 12, 16); }
      });
    });
    // outra associação (esquerda)
    add(O.x + 40 + O.y + 50, () => {
      D.box(O.x + 12, O.y + 22, 62, 56, 50, 56, R.shade(PAL().sage, 1.12));
      D.onFace('left', O.x + 12, O.y + 78, SLAB + 50, g => { g.fillStyle = PAL().paper; g.fillRect(6, 6, 44, 10); g.fillStyle = PAL().ink; g.font = '800 6px Inter'; g.fillText('ASSOC.', 14, 13.5); });
    });
    // sindicato que cresce 414 %
    const sx = O.x + 206, sy = O.y + 24;
    const gp = ease.inOut(prog(t, w(7, 'subir') - 0.3, w(7, 'quatrocentos') + 0.5));
    const sh = 46 * (1 + 4.14 * gp);
    add(sx + 36 + sy + 32, () => {
      D.box(sx, sy, SLAB, 72, 64, sh, R.shade(PAL().sage, 0.9));
      D.onFace('left', sx, sy + 64, SLAB + sh, g => {
        g.fillStyle = PAL().paper; g.fillRect(7, 6, 58, 11);
        g.fillStyle = PAL().ink; g.font = '800 6.6px Inter'; g.fillText('SINDICATO', 16, 14);
        const rows = Math.floor((sh - 24) / 18);
        for (let r = 0; r < rows; r++) for (let c = 0; c < 3; c++) { g.fillStyle = 'rgba(242,221,164,0.55)'; g.fillRect(10 + c * 19, 24 + r * 18, 11, 10); }
      });
    });
    // acordo voando da associação para o INSS
    const a0 = w(2, 'acordo') - 0.2, a1 = a0 + 1.1;
    const fly = ease.inOut(prog(t, a0, a1)), stay = 1 - prog(t, w(2, 'cobrar') + 0.6, w(2, 'cobrar') + 0.9);
    if (fly > 0 && stay > 0) {
      add(2e6, () => {
        const A = P(ax + 38, ay + 34, SLAB + 110), B = P(ISL.inss.x + 110, ISL.inss.y + 150, SLAB + 120);
        const pt = dashArc(A, B, { X: 0, Y: -180 }, fly, { alpha: 0.75 * stay, color: PAL().mustard, w: 5 });
        if (pt) { const q = pt(fly); ctx.save(); ctx.globalAlpha = stay; D.sheet(q.X, q.Y, 1.3, Math.sin(t * 6) * 0.1, { tag: 'ACT', check: t > a1 - 0.05 }); ctx.restore(); }
      });
    }
    tagAt(tags, ax + 38, ay + 34, SLAB + 140, 'ACORDO COM O INSS', prog(t, w(2, 'acordo'), w(2, 'acordo') + 0.3), { at: w(2, 'acordo'), fill: PAL().mustard });
    tagAt(tags, TAP - O.x + O.x, PY, PZ + 80, 'DIRETO NO BENEFÍCIO', prog(t, w(2, 'cobrar'), w(2, 'cobrar') + 0.3), { at: w(2, 'cobrar'), fill: NO_HI });
    tagAt(tags, TAP, PY, PZ + 80, '✕  SEM CARNÊ', prog(t, w(2, 'carnê'), w(2, 'carnê') + 0.25), { at: w(2, 'carnê') });
    tagAt(tags, TAP, PY, PZ + 80, '✕  SEM ASSINATURA', prog(t, w(2, 'assinatura'), w(2, 'assinatura') + 0.25), { at: w(2, 'assinatura') });
    tagAt(tags, TAP, PY, PZ + 80, '✕  SEM LIGAÇÃO', prog(t, w(2, 'ligação'), w(2, 'ligação') + 0.25), { at: w(2, 'ligação') });
    tagAt(tags, TAP, PY, PZ + 80, 'ATÉ R$ 81 POR MÊS', prog(t, w(2, 'Até'), w(2, 'Até') + 0.3), { at: w(2, 'Até'), fill: PAL().mustard, size: 32 });
    tagAt(tags, 1450, PY, PZ + 80, 'ANTES DE CAIR NA CONTA', span(t, w(2, 'descontados') + 0.2, R.BEATS[2].end + 0.3), { at: w(2, 'descontados') + 0.2 });
    // operação: luzes azul e vermelha
    const op = prog(t, w(6, 'Polícia'), w(6, 'Polícia') + 0.3) * (1 - prog(t, w(7, 'Segundo') + 0.5, w(7, 'Segundo') + 1));
    const posts = [[O.x + 30, O.y + 200], [O.x + 120, O.y + 262], [O.x + 230, O.y + 250], [O.x + 280, O.y + 150]];
    if (op > 0) posts.forEach(([px, py], i) => {
      add(px + py, () => {
        const s = ease.back(op);
        const c = P(px, py, SLAB);
        ctx.save(); ctx.translate(c.X, c.Y); ctx.scale(s, s); ctx.translate(-c.X, -c.Y);
        D.cyl(px, py, SLAB, 4, 44, PAL().dark);
        const ph = Math.floor(t * 6 + i) % 2;
        lampC(px - 5, py + 5, SLAB + 52, ph ? 1 : 0.15, 6.5, BLUE, '91,134,214');
        lampC(px + 5, py - 5, SLAB + 52, ph ? 0.15 : 1, 6.5, RED, '214,91,91');
        ctx.restore();
      });
    });
    tagAt(tags, O.x + 150, O.y + 150, SLAB + 170, '23 DE ABRIL DE 2025', prog(t, w(6, 'vinte'), w(6, 'vinte') + 0.3), { at: w(6, 'vinte') });
    tagAt(tags, O.x + 150, O.y + 150, SLAB + 170, 'PF · OPERAÇÃO SEM DESCONTO', prog(t, w(6, 'Polícia'), w(6, 'Polícia') + 0.3), { at: w(6, 'Polícia'), fill: PAL().mustard });
    // sindicato: rótulo e contador
    const pct = Math.round(414 * gp);
    tagAt(tags, sx + 36, sy + 32, SLAB + sh + 30, 'UM DOS SINDICATOS INVESTIGADOS', prog(t, w(7, 'sindicatos'), w(7, 'sindicatos') + 0.3), { at: w(7, 'sindicatos'), size: 24 });
    tagAt(tags, sx + 36, sy + 32, SLAB + sh + 30, `RECEITA +${pct}%`, prog(t, w(7, 'subir') - 0.2, w(7, 'subir') + 0.1), { at: w(7, 'subir') - 0.2, fill: NO_HI, size: 34 });
    add(O.x + 30 + O.y + 275, () => tree(O.x + 28, O.y + 276, 1.3));
  }

  // gráfico: o salto dos descontos
  function stGraf(t, add, O, tags) {
    const w = T().w.bind(T());
    const bars = [
      { yr: '2022', v: 706, lab: 'R$ 706 MI', at: w(3, 'setecentos'), col: PAL().sage },
      { yr: '2023', v: 1300, lab: 'R$ 1,3 BI', at: w(3, 'para') - 0.35, col: NO },
      { yr: '2024', v: 2600, lab: 'R$ 2,6 BI', at: w(3, 'para'), col: NO },
    ];
    const k = 0.1;
    const lula = prog(t, w(3, 'governo'), w(3, 'governo') + 0.4);
    bars.forEach((b, i) => {
      const x = O.x + 50 + i * 78, y = O.y + 130;
      const g = ease.out(prog(t, b.at, b.at + 0.9));
      const h = Math.max(3, b.v * k * g);
      add(x + y + 25, () => {
        D.box(x, y, SLAB, 52, 52, h, b.col);
        if (i > 0 && t > w(3, 'Mais')) glow(P(x + 26, y + 26, SLAB + h), 90, 0.25 + 0.1 * Math.sin(t * 5));
        D.onFace('left', x, y + 52, SLAB + Math.max(h, 20), gg => { gg.fillStyle = 'rgba(240,233,216,0.85)'; gg.font = '700 11px "IBM Plex Mono"'; gg.fillText(b.yr, 10, Math.max(h, 20) - 6); });
      });
      tagAt(tags, x + 26, y + 26, SLAB + h + 26, b.lab, span(t, b.at + 0.5, R.BEATS[3].end + 0.8), { size: 24, fill: i ? NO_HI : PAL().paper });
    });
    // faixa "governo Lula" no chão, sob 2023 e 2024
    add(O.x + O.y + 330, () => {
      if (lula <= 0) return;
      ctx.save(); ctx.globalAlpha = lula;
      D.box(O.x + 122, O.y + 196, SLAB, 136 * ease.out(lula), 26, 3, PAL().mustard, { noShadow: true });
      D.onFace('top', O.x + 122, O.y + 196, SLAB + 3, g => { g.fillStyle = PAL().ink; g.font = '800 11px Inter'; g.fillText('GOVERNO LULA', 22, 17); });
      ctx.restore();
    });
    tagAt(tags, O.x + 190, O.y + 160, SLAB + 300, 'NO GOVERNO LULA', prog(t, w(3, 'governo'), w(3, 'governo') + 0.3), { at: w(3, 'governo'), fill: PAL().mustard, size: 32 });
    tagAt(tags, O.x + 190, O.y + 160, SLAB + 300, '+60% DOS R$ 6,3 BI EM SÓ 2 ANOS', span(t, w(3, 'Mais'), R.BEATS[3].end + 0.5), { at: w(3, 'Mais'), fill: NO_HI, size: 26 });
    add(O.x + 30 + O.y + 40, () => tree(O.x + 26, O.y + 36, 1.3));
    add(O.x + 275 + O.y + 275, () => tree(O.x + 274, O.y + 272, 1.4));
  }

  // o alerta: reunião do conselho, calendário de 10 meses, recomendação da CGU
  function stAlerta(t, add, O, tags) {
    const w = T().w.bind(T());
    const tx = O.x + 70, ty = O.y + 150;
    // mesa da reunião com conselheiros
    const seats = [[tx + 20, ty - 14], [tx + 60, ty - 14], [tx + 100, ty - 14], [tx + 20, ty + 54], [tx + 60, ty + 54], [tx + 100, ty + 54]];
    seats.slice(0, 3).forEach(([x, y], i) => add(x + y, () => person(x, y, SLAB, [PAL().slate, PAL().gray, PAL().sage][i], { k: 0.85 })));
    add(tx + 65 + ty + 20, () => { D.box(tx, ty, SLAB, 130, 40, 22, PAL().wood); D.box(tx - 3, ty - 3, SLAB + 22, 136, 46, 4, R.shade(PAL().wood, 1.15)); });
    seats.slice(3).forEach(([x, y], i) => add(x + y, () => person(x, y, SLAB, [PAL().gray, PAL().sage, PAL().slate][i], { k: 0.85 })));
    // ministro na cabeceira
    const mxx = tx + 152, myy = ty + 20;
    add(mxx + myy, () => person(mxx, myy, SLAB, PAL().dark, { k: 0.95 }));
    // alerta: lâmpada sobre a conselheira e arco até o ministro
    const al = w(4, 'alerta');
    const aOn = prog(t, al - 0.2, al + 0.1);
    add(2e6 - 1, () => {
      if (aOn <= 0) return;
      lampC(tx + 20, ty - 14, SLAB + 62, Math.floor(t * 3) % 2 ? 1 : 0.4, 7, PAL().lampOn);
      dashArc(P(tx + 20, ty - 14, SLAB + 62), P(mxx, myy, SLAB + 62), { X: 0, Y: -60 }, ease.inOut(prog(t, al, al + 0.8)), { color: PAL().mustard, w: 4, alpha: 0.85 * (1 - prog(t, w(4, 'primeira'), w(4, 'primeira') + 0.3)) });
    });
    // calendário: JUN 2023 → MAR 2024 (10 meses)
    const months = ['JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ', 'JAN', 'FEV', 'MAR'];
    const c0 = w(4, 'primeira'), c1 = w(4, 'depois') + 0.1;
    const mi = Math.min(9, Math.floor(9 * prog(t, c0, c1)));
    const calOn = ease.back(prog(t, w(4, 'junho') - 0.2, w(4, 'junho') + 0.2));
    add(O.x + 40 + O.y + 40, () => {
      if (calOn <= 0) return;
      const c = P(O.x + 60, O.y + 40, SLAB);
      ctx.save(); ctx.translate(c.X, c.Y); ctx.scale(calOn, calOn); ctx.translate(-c.X, -c.Y);
      board(O.x + 18, O.y + 36, SLAB + 36, 92, 82, PAL().paper, g => {
        g.fillStyle = NO; g.fillRect(0, 0, 92, 20);
        g.fillStyle = PAL().paper; g.font = '800 10px Inter'; g.fillText(mi >= 7 ? '2024' : '2023', 30, 14);
        g.fillStyle = PAL().ink; g.font = '800 30px Inter'; g.textAlign = 'center'; g.fillText(months[mi], 46, 56); g.textAlign = 'left';
        g.font = '600 8px "IBM Plex Mono"'; g.fillStyle = 'rgba(16,21,19,0.6)'; g.fillText(mi ? `+${mi} ${mi > 1 ? 'MESES' : 'MÊS'}` : 'ALERTA', 22, 74);
      });
      ctx.restore();
    });
    // placa da CGU
    const cg = w(4, 'CGU');
    const cgOn = ease.back(prog(t, cg - 0.1, cg + 0.3));
    add(O.x + 240 + O.y + 60, () => {
      if (cgOn <= 0) return;
      const c = P(O.x + 240, O.y + 60, SLAB);
      ctx.save(); ctx.translate(c.X, c.Y); ctx.scale(cgOn, cgOn); ctx.translate(-c.X, -c.Y);
      board(O.x + 186, O.y + 56, SLAB + 36, 104, 76, PAL().slab, g => {
        g.fillStyle = PAL().paper; g.font = '800 12px Inter'; g.fillText('CGU', 10, 18);
        g.font = '700 8.5px Inter'; g.fillText('RECOMENDA:', 10, 34); g.fillText('BLOQUEAR NOVOS', 10, 48); g.fillText('DESCONTOS', 10, 60);
        const st = prog(t, w(4, 'continuaram') - 0.1, w(4, 'continuaram') + 0.2);
        if (st > 0) {
          g.save(); g.translate(52, 40); g.rotate(-0.25); g.scale(1.5 - 0.5 * st, 1.5 - 0.5 * st); g.globalAlpha = st;
          g.strokeStyle = NO_HI; g.lineWidth = 2.5; g.strokeRect(-46, -12, 92, 24);
          g.fillStyle = NO_HI; g.font = '800 11px Inter'; g.textAlign = 'center'; g.fillText('CONTINUARAM', 0, 4); g.restore();
        }
      });
      ctx.restore();
    });
    tagAt(tags, tx + 65, ty + 20, SLAB + 120, 'O GOVERNO FOI AVISADO', prog(t, w(4, 'avisado') - 0.3, w(4, 'avisado')), { at: w(4, 'avisado') - 0.3, fill: PAL().mustard });
    tagAt(tags, O.x + 64, O.y + 40, SLAB + 150, 'JUNHO DE 2023', prog(t, w(4, 'junho'), w(4, 'junho') + 0.3), { at: w(4, 'junho') });
    tagAt(tags, mxx, myy, SLAB + 90, 'CARLOS LUPI · MINISTRO DA PREVIDÊNCIA', prog(t, w(4, 'Carlos'), w(4, 'Carlos') + 0.3), { at: w(4, 'Carlos'), size: 23 });
    tagAt(tags, tx + 65, ty + 20, SLAB + 120, 'ALERTA NO CONSELHO DA PREVIDÊNCIA', prog(t, al, al + 0.3), { at: al, fill: PAL().mustard, size: 23 });
    tagAt(tags, O.x + 64, O.y + 40, SLAB + 150, '1ª MEDIDA: SÓ 10 MESES DEPOIS', prog(t, c1, c1 + 0.3), { at: c1, fill: NO_HI, size: 25 });
    tagAt(tags, O.x + 238, O.y + 60, SLAB + 140, 'ELES CONTINUARAM', prog(t, w(4, 'continuaram'), w(4, 'continuaram') + 0.3), { at: w(4, 'continuaram'), fill: NO_HI, size: 30 });
    add(O.x + 275 + O.y + 270, () => tree(O.x + 272, O.y + 270, 1.4));
  }

  // CGU: 100 aposentados ouvidos, 97 não autorizaram
  const order = (() => { const r = rng(9), a = Array.from({ length: 100 }, (_, i) => i); for (let i = 99; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; })();
  function stCgu(t, add, O, tags) {
    const w = T().w.bind(T());
    const p0 = w(5, 'ouviu') - 0.2, n0 = w(5, 'noventa') - 0.1, n1 = n0 + 1.1;
    const nNo = Math.round(97 * prog(t, n0, n1));
    for (let i = 0; i < 100; i++) {
      const r = Math.floor(i / 10), c = i % 10;
      const x = O.x + 42 + c * 24, y = O.y + 42 + r * 24;
      const s = ease.back(prog(t, p0 + (r + c) * 0.035, p0 + (r + c) * 0.035 + 0.3));
      if (s <= 0) continue;
      const no = order.indexOf(i) < nNo;
      add(x + y, () => {
        const cc = P(x, y, SLAB);
        ctx.save(); ctx.translate(cc.X, cc.Y); ctx.scale(s, s); ctx.translate(-cc.X, -cc.Y);
        D.cyl(x, y, SLAB, 5.5, 11, no ? NO : PAL().paper, { noShadow: true });
        D.sphere(x, y, SLAB + 18, 5, no ? NO_HI : PAL().skin);
        ctx.restore();
      });
    }
    tagAt(tags, O.x + 150, O.y + 150, SLAB + 110, '+1.000 APOSENTADOS OUVIDOS', prog(t, w(5, 'mil'), w(5, 'mil') + 0.3), { at: w(5, 'mil') });
    tagAt(tags, O.x + 150, O.y + 150, SLAB + 110, '+97% NUNCA AUTORIZARAM', span(t, n0 + 0.3, R.BEATS[5].end + 0.6), { at: n0 + 0.3, fill: NO_HI, size: 34 });
  }

  const STATIONS = { casa: stCasa, inss: stInss, assoc: stAssoc, graf: stGraf, alerta: stAlerta, cgu: stCgu };

  // ======================================================================
  R.buildScene = function (t) {
    const slabs = [], items = [], tags = [];
    let n = 0;
    for (const k in ISL) {
      const I = ISL[k];
      const at = 3.6 + 0.08 * n++;
      const appear = ease.back(prog(t, at, at + 0.5));
      if (appear <= 0) continue;
      const pv = P(I.x + I.s / 2, I.y + I.s / 2, 0);
      const wrap = fn => () => {
        if (appear < 0.999) { ctx.save(); ctx.translate(pv.X, pv.Y); ctx.scale(appear, appear); ctx.translate(-pv.X, -pv.Y); fn(); ctx.restore(); }
        else fn();
      };
      slabs.push(wrap(() => drawBase(I.x, I.y, I.s, I.s)));
      STATIONS[k](t, (d, fn) => items.push({ depth: d, fn: wrap(fn) }), I, tags);
    }
    if (t > 3.6) {
      addPipe((d, fn) => items.push({ depth: d, fn }), t);
      for (const c of coinsAt(t)) items.push({ depth: c.x + c.y + 31, fn: () => coin(c.x, c.y, c.a, c.div) });
    }
    return { slabs, items, tags };
  };
})();
