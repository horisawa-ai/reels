// Maquete: ilhas, cano principal, estações e o Projeto de Lei correndo pelo cano.
// Cada estação desenha em função do tempo t, usando os tempos das palavras da narração (R.T.w).
(function () {
  const R = window.R, D = R.draw, P = R.P;
  const { clamp, lerp, prog, ease, pulse, rng } = R.U;
  const ctx = R.ctx;
  const PAL = () => R.PAL;

  const SLAB = 24, PZ = 46;

  // ---------- ilhas (origem x,y e lado s)
  const ISL = {
    cn: { x: -460, y: -460, s: 320, at: 0.05 },
    vote: { x: -40, y: -40, s: 240, at: 0.15 },
    s1: { x: 90, y: 470, s: 300, at: 0.25 },
    s2: { x: 940, y: 560, s: 300, at: 0.4 },
    s3: { x: 1030, y: 1410, s: 300, at: 0.55 },
    s4: { x: 1880, y: 1500, s: 300, at: 0.7 },
    s5: { x: 1970, y: 2350, s: 300, at: 0.85 },
    s6: { x: 2820, y: 2440, s: 300, at: 1.0 },
  };
  const NAMES = { s1: '1 · PROPOSTA', s2: '2 · COMISSÕES', s3: '3 · PLENÁRIO', s4: '4 · SENADO', s5: '5 · SANÇÃO OU VETO', s6: '6 · PUBLICAÇÃO' };
  const center = k => ({ x: ISL[k].x + ISL[k].s / 2, y: ISL[k].y + ISL[k].s / 2 });

  R.FOCUS = { all: { X: 0, Y: 1205 } };
  for (const k in ISL) { const c = center(k); R.FOCUS[k] = P(c.x, c.y, k === 'cn' ? 75 : 50); }

  // ---------- cano principal (escada: alterna +x e +y)
  const PIPE = [[280, 650], [1150, 650], [1150, 1600], [2050, 1600], [2050, 2540], [2970, 2540]];
  const SEG = [];
  let LEN = 0;
  for (let i = 0; i < PIPE.length - 1; i++) {
    const a = PIPE[i], b = PIPE[i + 1];
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    SEG.push({ a, b, s0: LEN, l }); LEN += l;
  }
  function at(s) {
    s = clamp(s, 0, LEN);
    for (const g of SEG) if (s <= g.s0 + g.l) {
      const u = (s - g.s0) / g.l;
      return { x: lerp(g.a[0], g.b[0], u), y: lerp(g.a[1], g.b[1], u) };
    }
    const e = PIPE[PIPE.length - 1]; return { x: e[0], y: e[1] };
  }
  // trechos escondidos dentro das máquinas
  const HIDE = [[0, 14], [700, 750], [778, 822], [928, 972], [1758, 1802], [2628, 2672], [3566, 3614], [4536, 4600]];
  const MACH = { relator: 725, emendas: 800, ccj: 950, s2in: 660, s3in: 1630, mesa: 1780, rev: 2650, pres: 3590, press: 4560 };
  const inIsland = (x, y) => Object.values(ISL).some(i => x > i.x && x < i.x + i.s && y > i.y && y < i.y + i.s);

  // ---------- desenho do cano
  function line(A, B, w, color, dy = 0) {
    ctx.strokeStyle = color; ctx.lineWidth = w;
    ctx.beginPath(); ctx.moveTo(A.X, A.Y + dy); ctx.lineTo(B.X, B.Y + dy); ctx.stroke();
  }
  function pipePiece(p, q, lit) {
    const A = P(p.x, p.y, PZ), B = P(q.x, q.y, PZ);
    ctx.lineCap = 'butt';
    line(A, B, R.STYLE.lw ? 21 : 17, R.STYLE.lw ? PAL().line : R.shade(PAL().pipe, 0.55));
    line(A, B, 13.5, PAL().pipe);
    if (lit > 0) {
      const M = { X: lerp(A.X, B.X, lit), Y: lerp(A.Y, B.Y, lit) };
      line(A, M, 13.5, PAL().pipeLit);
    }
    line(A, B, 3, 'rgba(255,255,255,0.8)', -3.6);
  }
  function collar(p) {
    const c = P(p.x, p.y, PZ);
    ctx.fillStyle = PAL().line; ctx.beginPath(); ctx.ellipse(c.X, c.Y, 6, 13.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = PAL().gray; ctx.beginPath(); ctx.ellipse(c.X - 0.5, c.Y, 3.6, 10.5, 0, 0, Math.PI * 2); ctx.fill();
  }
  function elbow(p, lit) {
    const c = P(p.x, p.y, PZ);
    ctx.beginPath(); ctx.arc(c.X, c.Y, 12.5, 0, Math.PI * 2);
    ctx.fillStyle = lit ? PAL().pipeLit : PAL().pipe; ctx.fill(); D.ink(3.2); ctx.stroke();
    ctx.beginPath(); ctx.arc(c.X - 3, c.Y - 4, 3.2, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.fill();
  }
  function addPipe(add, built, litLen) {
    const STEP = 40;
    for (const g of SEG) {
      for (let s = g.s0; s < g.s0 + g.l - 0.01; s += STEP) {
        const s1 = Math.min(s + STEP, g.s0 + g.l);
        let a0 = s, a1 = Math.min(s1, built);
        if (a1 <= a0) continue;
        // recorta trechos escondidos
        let parts = [[a0, a1]];
        for (const [h0, h1] of HIDE) parts = parts.flatMap(([u, v]) => (v <= h0 || u >= h1 ? [[u, v]] : [[u, Math.min(v, h0)], [Math.max(u, h1), v]].filter(([x, y]) => y - x > 0.5)));
        for (const [u, v] of parts) {
          const p = at(u), q = at(v);
          const lit = litLen <= u ? 0 : litLen >= v ? 1 : (litLen - u) / (v - u);
          add((p.x + q.x + p.y + q.y) / 2, () => pipePiece(p, q, lit));
        }
        // colares e pés
        if (Math.round((s - g.s0) / STEP) % 3 === 1 && s < built && !HIDE.some(([h0, h1]) => s > h0 - 8 && s < h1 + 8)) {
          const p = at(s);
          add(p.x + p.y + 0.5, () => collar(p));
          if (!inIsland(p.x, p.y)) add(p.x + p.y - 0.5, () => {
            D.cyl(p.x, p.y, 0, 4.5, PZ - 8, PAL().gray);
          });
        }
      }
    }
    for (let i = 1; i < PIPE.length - 1; i++) {
      const s = SEG[i].s0;
      if (s > built) continue;
      const p = { x: PIPE[i][0], y: PIPE[i][1] };
      add(p.x + p.y + 1, () => elbow(p, litLen >= s));
    }
  }

  // ---------- Projeto de Lei correndo pelo cano
  function plPos(t) {
    const T = R.T, B = R.BEATS;
    const K = [
      [B[1].end - 0.5, 0],
      [T.w(2, 'Câmara') - 0.2, MACH.s2in],
      [T.w(2, 'relator') - 0.15, MACH.relator],
      [T.w(2, 'propor') - 0.15, MACH.relator],
      [T.w(2, 'propor') + 0.35, MACH.emendas],
      [T.w(2, 'CCJ') - 0.6, MACH.emendas],
      [T.w(2, 'CCJ') - 0.05, MACH.ccj],
      [T.w(3, 'outros'), MACH.ccj],
      [T.w(3, 'plenário', 2) + 0.6, MACH.mesa],
      [B[3].end + 0.6, MACH.mesa],
      [T.w(4, 'revisa'), MACH.rev],
      [B[4].end + 0.5, MACH.rev],
      [T.w(5, 'Presidente') + 0.4, MACH.pres],
      [B[5].end + 0.5, MACH.pres],
      [T.w(6, 'publicada'), MACH.press],
    ];
    if (t < K[0][0]) return null;
    for (let i = 0; i < K.length - 1; i++) {
      const [ta, sa] = K[i], [tb, sb] = K[i + 1];
      if (t <= tb) {
        const u = prog(t, ta, tb);
        return { s: lerp(sa, sb, ease.inOut(u)), moving: sa !== sb ? Math.sin(Math.PI * u) : 0 };
      }
    }
    return { s: K[K.length - 1][1], moving: 0 };
  }
  function lift(s) {
    let l = 0;
    for (const m of [MACH.relator, MACH.emendas, MACH.ccj, MACH.mesa, MACH.rev, MACH.pres]) l = Math.max(l, 1 - clamp(Math.abs(s - m) / 34));
    return ease.inOut(l);
  }
  R.PIPE = { at, LEN, plPos };

  // ---------- pessoinha
  function person(x, y, z, color, o = {}) {
    D.cyl(x, y, z, 9, 20, color);
    D.sphere(x, y, z + 21, 9, color);
    D.sphere(x, y, z + 36, 8, PAL().skin);
    if (o.lamp != null) D.lamp(x, y, z + 52, o.lamp, 5);
  }

  // ---------- rótulo preso a um ponto do mundo
  function tag(list, x, y, z, text, p, o = {}) {
    list.push(() => { const s = R.S(x, y, z); R.pill(s.x, s.y, text, p, Object.assign({ anchorBottom: true, size: 29 }, o)); });
  }

  // ======================================================================
  // ESTAÇÕES
  // ======================================================================
  function stVote(t, add, ov, O) {
    const T = R.T;
    const X = (x, y) => [O.x + x, O.y + y];
    // placar de cargos (fundo)
    const offices = [['DEPUTADO', 'deputado'], ['SENADOR', 'senador'], ['PRESIDENTE', 'presidente']];
    add(O.x + O.y + 40, () => {
      const [bx, by] = X(28, 8);
      D.box(bx + 6, by, SLAB, 8, 8, 70, PAL().gray);
      D.box(bx + 170, by, SLAB, 8, 8, 70, PAL().gray);
      D.box(bx, by, SLAB + 62, 184, 10, 70, PAL().paper);
      D.onFace('left', bx, by + 10, SLAB + 132, g => {
        offices.forEach(([lab, w], i) => {
          const on = prog(t, T.w(0, w), T.w(0, w) + 0.25);
          const cx = 32 + i * 60;
          g.beginPath(); g.arc(cx, 24, 11, 0, Math.PI * 2);
          g.fillStyle = on > 0.5 ? PAL().lampOn : PAL().lampOff; g.fill(); D.ink(2.6); g.stroke();
          g.fillStyle = PAL().ink; g.font = '800 10.5px Inter'; g.textAlign = 'center';
          g.fillText(lab, cx, 52);
        });
      });
      offices.forEach(([, w], i) => {
        const on = pulse(t, T.w(0, w), T.w(0, w) + 1.2);
        if (on > 0) { const c = P(bx + 32 + i * 60, by + 10, SLAB + 108); glowAt(c, on); }
      });
    });
    // mastro com a bandeira (canto do fundo)
    const [mx, my] = X(18, 200);
    const hoist = ease.inOut(prog(t, 0.5, 2.2));
    add(mx + my + 10, () => {
      D.box(mx - 10, my - 10, SLAB, 20, 20, 8, PAL().stone);
      D.cyl(mx, my, SLAB + 8, 3.2, 230, PAL().gray);
      D.sphere(mx, my, SLAB + 242, 5, PAL().mustard);
      const top = P(mx, my, SLAB + lerp(70, 232, hoist));
      R.drawFlag(top.X + 2, top.Y, 96, t);
    });
    // urnas e filas
    [[150, 62], [150, 150]].forEach(([ux, uy], k) => {
      const [x, y] = X(ux, uy);
      add(x + y + 20, () => {
        D.box(x, y, SLAB, 44, 34, 30, PAL().wood);
        D.box(x + 6, y + 6, SLAB + 30, 30, 22, 10, PAL().stone);
        D.onFace('top', x + 6, y + 6, SLAB + 40, g => {
          g.fillStyle = PAL().dark; g.fillRect(3, 3, 13, 16);
          g.fillStyle = PAL().paper; for (let i = 0; i < 9; i++) g.fillRect(19 + (i % 3) * 3.4, 4 + Math.floor(i / 3) * 5, 2.4, 3.4);
        });
        // biiip a cada voto
        const beat = (t * 0.9 + k * 0.45) % 1;
        D.lamp(x + 38, y + 4, SLAB + 46, beat < 0.18 && t > 2.6 ? 1 : 0, 4.5);
      });
      // fila andando até a urna
      const colors = [PAL().slate, PAL().sage, PAL().lilac, PAL().sand, PAL().wood, PAL().gray];
      for (let i = 0; i < 5; i++) {
        let q = ((i / 5) + t * 0.18 + k * 0.1) % 1;
        if (t < R.INTRO_END) q = (i / 5 + k * 0.1) % 1;
        const px = O.x + lerp(14, ux - 14, q), py = O.y + uy + 18;
        const sc = Math.min(prog(q, 0, 0.08), 1 - prog(q, 0.92, 1));
        add(px + py + 5, () => {
          if (sc <= 0.01) return;
          const c = P(px, py, SLAB);
          ctx.save(); ctx.translate(c.X, c.Y); ctx.scale(sc, sc); ctx.translate(-c.X, -c.Y);
          person(px, py, SLAB + Math.abs(Math.sin(q * 40)) * 2, colors[(i + k * 2) % colors.length]);
          ctx.restore();
        });
      }
    });
    if (ov > 0.5) return;
  }

  function stS1(t, add, ov, O, tags) {
    const T = R.T;
    const fx = O.x + 190, fy = O.y + 180;
    // painel de assinaturas (fundo)
    add(O.x + O.y + 30, () => {
      const bx = O.x + 36, by = O.y + 8;
      D.box(bx + 8, by, SLAB, 8, 8, 56, PAL().gray);
      D.box(bx + 200, by, SLAB, 8, 8, 56, PAL().gray);
      D.box(bx, by, SLAB + 50, 216, 10, 96, PAL().paper);
      const c0 = T.w(1, 'assinatura'), c1 = T.w(1, 'eleitores') + 0.2;
      const pct = ease.out(prog(t, c0, c1));
      const lit = [2, 6, 12, 19, 23];
      const l0 = T.w(1, 'pelo') - 0.1, l1 = T.w(1, 'estados') + 0.3;
      D.onFace('left', bx, by + 10, SLAB + 146, g => {
        g.fillStyle = PAL().ink; g.font = '800 10px Inter'; g.textAlign = 'left';
        g.fillText('ASSINATURAS', 10, 15);
        g.font = '900 34px Inter';
        g.fillText(pct >= 0.999 ? '1%' : (pct).toFixed(1).replace('.', ',') + '%', 10, 56);
        g.font = '700 9px Inter'; g.fillText('DOS ELEITORES', 10, 72);
        for (let i = 0; i < 27; i++) {
          const cx = 104 + (i % 9) * 11.5, cy = 22 + Math.floor(i / 9) * 14;
          const k = lit.indexOf(i);
          const on = k >= 0 ? prog(t, l0 + k * (l1 - l0) / 5, l0 + k * (l1 - l0) / 5 + 0.15) : 0;
          g.beginPath(); g.arc(cx, cy, 4.3, 0, Math.PI * 2);
          g.fillStyle = on > 0.5 ? PAL().lampOn : PAL().lampOff; g.fill(); D.ink(1.6); g.stroke();
        }
        const nOn = lit.filter((_, k) => t > l0 + k * (l1 - l0) / 5).length;
        g.font = '800 9.5px Inter'; g.fillText(`${nOn} DE 27 ESTADOS`, 104, 76);
      });
    });
    // mesas de quem pode propor (em arco ao redor do funil)
    const roles = [
      ['DEPUTADOS', 'Deputados', PAL().sage], ['SENADORES', 'senadores', PAL().slate],
      ['PRESIDENTE', 'Presidente', PAL().sand], ['STF', 'STF', PAL().lilac],
      ['TRIBUNAIS SUPERIORES', 'tribunais', PAL().stone], ['PGR', 'Procurador', PAL().gray],
      ['VOCÊ', 'você', PAL().mustard],
    ];
    roles.forEach(([lab, w, color], i) => {
      const ang = (105 + i * 30) * Math.PI / 180, r = 104;
      const dx = Math.cos(ang), dy = Math.sin(ang);
      const px = fx + dx * r, py = fy + dy * r;
      const tw = T.w(1, w);
      const on = prog(t, tw, tw + 0.2);
      add(px + py, () => {
        desk(px - 20, py - 15, 40, 30, 24, PAL().wood);
        D.box(px - 10, py - 8, SLAB + 24, 14, 10, 2, PAL().paper);
        D.lamp(px + 12, py - 6, SLAB + 30, on, 4.5);
      });
      const hx = px + dx * 30, hy = py + dy * 30;
      add(hx + hy - 2, () => person(hx, hy, SLAB, color));
      tags.push(() => {
        const a = clamp(1 - prog(t, tw + 2.1, tw + 2.5));
        if (on > 0 && a > 0) { const s = R.S(hx, hy, SLAB + 60); R.pill(s.x, s.y, lab, on, { at: tw, anchorBottom: true, size: 29, alpha: a }); }
      });
      // folha voando da mesa para o funil
      const fp = prog(t, tw + 0.1, tw + 0.85);
      if (fp > 0 && fp < 1) {
        const e = ease.inOut(fp);
        const x = lerp(px, fx, e), y = lerp(py, fy, e), z = lerp(SLAB + 30, SLAB + 96, e) + Math.sin(Math.PI * fp) * 90;
        add(x + y + 200, () => { const c = P(x, y, z); D.sheet(c.X, c.Y, lerp(0.75, 0.45, e), Math.sin(fp * 9) * 0.3); });
      }
    });
    // funil
    add(fx + fy + 1, () => {
      D.cyl(fx, fy, SLAB, 16, 22, PAL().gray);
      D.frustum(fx, fy, SLAB + 22, 13, 42, 58, PAL().stone, { hollow: true });
      const g = pulse(t, T.w(1, 'Deputados'), T.w(1, 'estados') + 1);
      if (g > 0) glowAt(P(fx, fy, SLAB + 80), g * 0.6);
    });
    // Projeto de Lei apresentado acima do funil
    const a0 = T.w(1, 'projeto') - 0.1, a1 = T.w(1, 'Quem') + 0.2;
    const show = prog(t, a0, a0 + 0.4), drop = ease.in(prog(t, a1, a1 + 0.5));
    if (show > 0 && drop < 1) {
      const z = SLAB + 190 + Math.sin(t * 2.4) * 8 - drop * 110;
      add(fx + fy + 300, () => { const c = P(fx, fy, z); D.sheet(c.X, c.Y, lerp(0.4, 1.6, ease.back(show)) * (1 - drop * 0.6), Math.sin(t * 2) * 0.08, { tag: 'PL', glow: 1 - drop }); });
      tags.push(() => { const s = R.S(fx, fy, SLAB + 290); R.pill(s.x, s.y, 'PROJETO DE LEI', show * (1 - drop), { at: a0, anchorBottom: true, size: 29 }); });
    }
  }

  function stS2(t, add, ov, O, tags) {
    const T = R.T;
    // Câmara: base + cuia
    const cOn = prog(t, T.w(2, 'Câmara'), T.w(2, 'Câmara') + 0.3);
    add(O.x + 75 + O.y + 225, () => {
      D.box(O.x + 20, O.y + 170, SLAB, 110, 110, 34, PAL().stone);
      for (let i = 0; i < 4; i++) D.lamp(O.x + 36 + i * 26, O.y + 280, SLAB + 18, cOn > 0 && t > T.w(2, 'Câmara') + i * 0.08 ? 1 : 0, 4.5);
      D.frustum(O.x + 75, O.y + 225, SLAB + 34, 30, 64, 34, PAL().paper, { hollow: true, bulge: 10 });
    });
    tags.push(() => { const s = R.S(O.x + 75, O.y + 225, SLAB + 110); R.pill(s.x, s.y, 'CÂMARA DOS DEPUTADOS', cOn * (1 - prog(t, T.w(2, 'comissões'), T.w(2, 'comissões') + 0.4)), { at: T.w(2, 'Câmara'), anchorBottom: true, size: 29 }); });

    const pl = R.PIPE.plPos(t);
    const plAt = m => (pl && Math.abs(pl.s - m) < 3 ? 1 : 0);

    // Relator: mesa com máquina de escrever
    const rx = O.x + 42, ry = O.y + 68;
    const typing = t > T.w(2, 'relator') && t < T.w(2, 'propor');
    add(rx + 23 + ry + 22, () => {
      D.box(rx, ry, SLAB, 46, 44, 30, PAL().wood);
      D.box(rx + 8, ry + 12, SLAB + 30, 30, 22, 7, PAL().dark);
      for (let i = 0; i < 4; i++) {
        const jump = typing ? Math.max(0, Math.sin(t * 22 + i * 1.7)) * 2.5 : 0;
        D.box(rx + 11 + i * 6.5, ry + 26, SLAB + 37 + jump, 4.5, 4.5, 2.5, PAL().paper);
      }
      D.lamp(rx + 42, ry + 4, SLAB + 36, prog(t, T.w(2, 'relator'), T.w(2, 'relator') + 0.2), 4.5);
    });
    add(rx + ry + 10, () => person(rx + 20, ry - 18, SLAB, PAL().slate));
    tags.push(() => { const s = R.S(rx + 20, ry - 18, SLAB + 64); R.pill(s.x, s.y, 'RELATOR', prog(t, T.w(2, 'relator'), T.w(2, 'relator') + 0.3) * (1 - prog(t, T.w(2, 'propor') + 0.3, T.w(2, 'propor') + 0.6)), { at: T.w(2, 'relator'), anchorBottom: true, size: 29 }); });
    tags.push(() => { const s = R.S(rx + 60, ry + 40, SLAB + 120); R.pill(s.x, s.y, 'PARECER', prog(t, T.w(2, 'parecer'), T.w(2, 'parecer') + 0.3) * (1 - prog(t, T.w(2, 'propor') + 0.3, T.w(2, 'propor') + 0.6)), { at: T.w(2, 'parecer'), anchorBottom: true, size: 29, fill: PAL().sage }); });

    // Emendas: prensa de carimbo
    const ex = O.x + 120, ey = O.y + 70;
    const m0 = T.w(2, 'mudanças');
    const press = Math.max(pulse(t, m0 - 0.1, m0 + 0.25), pulse(t, m0 + 0.35, m0 + 0.7));
    add(ex + 20 + ey + 20, () => {
      D.box(ex, ey, SLAB, 40, 40, 18, PAL().stone);
      D.box(ex + 2, ey + 2, SLAB + 18, 5, 5, 62, PAL().gray);
      D.box(ex + 33, ey + 2, SLAB + 18, 5, 5, 62, PAL().gray);
      D.box(ex - 2, ey - 2, SLAB + 80 - press * 30, 44, 44, 12, PAL().slate);
      D.onFace('left', ex - 2, ey + 42, SLAB + 92 - press * 30, g => { g.fillStyle = PAL().paper; g.font = '800 7.5px Inter'; g.fillText('EMENDAS', 6, 9); });
    });
    tags.push(() => { const s = R.S(ex + 20, ey + 20, SLAB + 130); R.pill(s.x, s.y, 'MUDANÇAS', prog(t, m0, m0 + 0.3) * (1 - prog(t, T.w(2, 'CCJ') - 0.4, T.w(2, 'CCJ'))), { at: m0, anchorBottom: true, size: 29 }); });

    // CCJ: caixa sobre o cano + balança + Constituição
    const cx = O.x + 188, cy = O.y + 148;
    const c0 = T.w(2, 'CCJ'), c1 = T.w(2, 'Constituição');
    const okv = prog(t, c1 + 0.2, c1 + 0.5);
    add(cx + 22 + cy + 22, () => {
      D.box(cx, cy, SLAB, 44, 44, 30, PAL().stone);
      D.onFace('left', cx, cy + 44, SLAB + 30, g => { g.fillStyle = PAL().ink; g.font = '900 12px Inter'; g.fillText('CCJ', 10, 19); });
      D.lamp(cx + 40, cy + 4, SLAB + 36, okv, 5);
    });
    // balança
    const bx = O.x + 262, by = O.y + 150;
    add(bx + by, () => {
      D.cyl(bx, by, SLAB, 14, 6, PAL().gray);
      D.cyl(bx, by, SLAB + 6, 2.6, 64, PAL().gray);
      const tilt = t < c0 ? 0 : Math.sin((t - c0) * 5) * 0.32 * (1 - prog(t, c1 - 0.3, c1 + 0.3));
      const top = P(bx, by, SLAB + 72);
      const L = 34, dxp = Math.cos(tilt) * L, dyp = Math.sin(tilt) * L;
      D.inkForce(3); ctx.beginPath(); ctx.moveTo(top.X - dxp, top.Y - dyp); ctx.lineTo(top.X + dxp, top.Y + dyp); ctx.stroke();
      for (const sgn of [-1, 1]) {
        const ax = top.X + sgn * dxp, ay = top.Y + sgn * dyp;
        D.inkForce(2); ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ax - 9, ay + 20); ctx.moveTo(ax, ay); ctx.lineTo(ax + 9, ay + 20); ctx.stroke();
        ctx.beginPath(); ctx.ellipse(ax, ay + 21, 13, 5, 0, 0, Math.PI * 2); ctx.fillStyle = PAL().mustard; ctx.fill(); D.ink(2.6); ctx.stroke();
      }
      D.sphere(bx, by, SLAB + 74, 4.5, PAL().mustard);
    });
    // livro da Constituição
    const kx = O.x + 244, ky = O.y + 218;
    const kOn = prog(t, c1, c1 + 0.3);
    add(kx + ky + 20, () => {
      D.box(kx, ky, SLAB, 44, 32, 14, PAL().slate, { top: PAL().slate });
      D.onFace('top', kx, ky, SLAB + 14, g => { g.fillStyle = PAL().paper; g.font = '900 10px Inter'; g.fillText('CF/88', 7, 20); });
      if (kOn > 0) glowAt(P(kx + 22, ky + 16, SLAB + 20), pulse(t, c1, c1 + 1.6));
    });
    tags.push(() => { const s = R.S(cx + 22, cy + 22, SLAB + 120); R.pill(s.x, s.y, 'CCJ: RESPEITA A CONSTITUIÇÃO?', prog(t, c0, c0 + 0.3) * (1 - okv), { at: c0, anchorBottom: true, size: 29 }); });
    tags.push(() => { const s = R.S(cx + 22, cy + 22, SLAB + 120); R.pill(s.x, s.y, 'CONSTITUCIONAL', okv * (1 - prog(t, R.BEATS[2].end + 0.6, R.BEATS[2].end + 1)), { at: c1 + 0.2, anchorBottom: true, size: 29, fill: PAL().sage }); });
    void plAt;
  }

  // ---------- auxiliares das estações finais
  // curva tracejada com seta (coordenadas de tela do mundo), desenhada até a fração p
  function dashArc(A, B, bend, p, o = {}) {
    if (p <= 0) return;
    const C = { X: (A.X + B.X) / 2 + bend.X, Y: (A.Y + B.Y) / 2 + bend.Y };
    const pt = u => ({ X: (1 - u) * (1 - u) * A.X + 2 * (1 - u) * u * C.X + u * u * B.X, Y: (1 - u) * (1 - u) * A.Y + 2 * (1 - u) * u * C.Y + u * u * B.Y });
    ctx.save();
    ctx.globalAlpha = o.alpha == null ? 1 : o.alpha;
    ctx.strokeStyle = o.color || PAL().paper; ctx.lineWidth = o.w || 7; ctx.lineCap = 'round';
    ctx.setLineDash([o.w ? o.w * 2.6 : 18, o.w ? o.w * 2.2 : 15]);
    ctx.beginPath();
    const N = 40, M = Math.max(1, Math.round(N * p));
    for (let i = 0; i <= M; i++) { const q = pt(i / N); i ? ctx.lineTo(q.X, q.Y) : ctx.moveTo(q.X, q.Y); }
    ctx.stroke(); ctx.setLineDash([]);
    const e = pt(M / N), e0 = pt(Math.max(0, M - 1) / N), a = Math.atan2(e.Y - e0.Y, e.X - e0.X), s = (o.w || 7) * 3.2;
    ctx.fillStyle = o.color || PAL().paper;
    ctx.beginPath(); ctx.moveTo(e.X + Math.cos(a) * s, e.Y + Math.sin(a) * s);
    ctx.lineTo(e.X + Math.cos(a + 2.4) * s, e.Y + Math.sin(a + 2.4) * s);
    ctx.lineTo(e.X + Math.cos(a - 2.4) * s, e.Y + Math.sin(a - 2.4) * s); ctx.fill();
    ctx.restore();
    return pt;
  }
  function ghostSheet(X, Y, sc, rot, alpha, o = {}) {
    if (alpha <= 0) return;
    ctx.save(); ctx.globalAlpha = alpha; D.sheet(X, Y, sc, rot, o); ctx.restore();
  }
  // mesa (gabinete + tampo com leve sobra)
  function desk(x, y, w, d, h, color) {
    D.box(x + 2, y + 2, SLAB, w - 4, d - 4, h - 4, R.shade(color, 0.9));
    D.box(x, y, SLAB + h - 4, w, d, 4, R.shade(color, 1.12));
  }
  // painel em pé virado para a câmera (face +y); fn desenha na face (largura w, altura h)
  function board(x, y, z, w, h, color, fn) {
    D.box(x + 6, y, SLAB, 6, 6, z - SLAB, PAL().gray);
    D.box(x + w - 12, y, SLAB, 6, 6, z - SLAB, PAL().gray);
    D.box(x, y, z, w, 8, h, color);
    D.onFace('left', x, y + 8, z + h, fn);
  }

  // 4 · Plenário da Câmara: assentos em arco que acendem até o quórum
  const seatOrder = (() => { const r = rng(17), a = Array.from({ length: 70 }, (_, i) => i); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; })();
  function stS3(t, add, ov, O, tags) {
    const T = R.T;
    const mx = O.x + 120, my = O.y + 150;
    const arrive = T.w(3, 'plenário', 2);
    const c0 = T.w(3, 'metade') - 0.3, c1 = T.w(3, 'presentes') + 0.4;
    const count = Math.round(257 * ease.out(prog(t, c0, c1)));
    const litN = Math.round(70 * count / 513);
    const rows = [46, 62, 78, 94, 110];
    let k = 0;
    rows.forEach((r, ri) => {
      const n = 8 + ri * 3;
      for (let i = 0; i < n; i++) {
        const a = (-86 + i * (82 / (n - 1))) * Math.PI / 180;
        const x = mx + Math.cos(a) * r, y = my + Math.sin(a) * r, h = 4 + ri * 5;
        const on = seatOrder.indexOf(k++) < litN ? 0.56 : 0;
        add(x + y, () => { D.box(x - 5, y - 5, SLAB, 10, 10, h, PAL().dark); D.lamp(x, y, SLAB + h + 4, on, 3.6); });
      }
    });
    add(mx + my, () => desk(mx - 22, my - 22, 44, 44, 28, PAL().wood));
    // placar
    const vOn = prog(t, T.w(3, 'maioria'), T.w(3, 'maioria') + 0.25);
    add(O.x + 65 + O.y + 250, () => board(O.x + 12, O.y + 248, SLAB + 34, 112, 74, PAL().dark, g => {
      g.fillStyle = 'rgba(240,233,216,0.7)'; g.font = '500 8px "IBM Plex Mono"'; g.fillText('PRESENTES', 8, 13);
      g.fillStyle = count >= 257 ? PAL().lampOn : PAL().paper; g.font = '500 27px "IBM Plex Mono"';
      g.fillText(String(count).padStart(3, '0'), 8, 41);
      g.fillStyle = 'rgba(240,233,216,0.7)'; g.font = '500 11px "IBM Plex Mono"'; g.fillText('/ 513', 62, 41);
      g.beginPath(); g.arc(12, 60, 4, 0, Math.PI * 2); g.fillStyle = vOn > 0.5 ? PAL().lampOn : PAL().lampOff; g.fill();
      g.fillStyle = PAL().paper; g.font = '600 7.5px Inter'; g.fillText('MAIORIA DOS VOTOS', 21, 63);
    }));
    tags.push(() => { const s = R.S(mx, my, SLAB + 120); R.pill(s.x, s.y, 'PLENÁRIO', prog(t, arrive, arrive + 0.3) * (1 - prog(t, c0, c0 + 0.3)), { at: arrive, anchorBottom: true, size: 29 }); });
    tags.push(() => { const s = R.S(O.x + 68, O.y + 252, SLAB + 130); R.pill(s.x, s.y, 'QUÓRUM: 257', prog(t, c1, c1 + 0.3) * (1 - prog(t, R.BEATS[3].end + 0.6, R.BEATS[3].end + 1)), { at: c1, anchorBottom: true, size: 29, fill: PAL().ok }); });
  }

  // 5 · Senado: revisão com três saídas
  function stS4(t, add, ov, O, tags) {
    const T = R.T;
    add(O.x + 70 + O.y + 200, () => {
      D.box(O.x + 20, O.y + 150, SLAB, 100, 100, 30, PAL().stone);
      D.dome(O.x + 70, O.y + 200, SLAB + 30, 42, 46, PAL().paper);
    });
    const rx = O.x + 100, ry = O.y + 100;
    const rv = prog(t, T.w(4, 'revisa'), T.w(4, 'revisa') + 0.25);
    add(rx + ry, () => {
      D.box(rx - 22, ry - 22, SLAB, 44, 44, 30, PAL().stone);
      D.onFace('left', rx - 22, ry + 22, SLAB + 30, g => { g.fillStyle = PAL().ink; g.font = '700 7.5px Inter'; g.fillText('REVISÃO', 7, 18); });
      D.lamp(rx + 18, ry - 18, SLAB + 36, rv, 5);
    });
    const bx = O.x + 240, by = O.y + 50;
    add(bx + by, () => D.frustum(bx, by, SLAB, 18, 23, 34, PAL().gray, { hollow: true }));
    tags.push(() => { const s = R.S(O.x + 70, O.y + 200, SLAB + 110); R.pill(s.x, s.y, 'SENADO', prog(t, T.w(4, 'Senado'), T.w(4, 'Senado') + 0.3) * (1 - prog(t, T.w(4, 'aprovar') - 0.2, T.w(4, 'aprovar') + 0.1)), { at: T.w(4, 'Senado'), anchorBottom: true, size: 29 }); });
    // três desfechos
    const a1 = T.w(4, 'aprovar'), a2 = T.w(4, 'rejeitar'), a3 = T.w(4, 'mudar'), end = R.BEATS[4].end;
    const fade = 1 - prog(t, end + 0.4, end + 0.9);
    tags.push(() => { const s = R.S(O.x + 170, O.y + 260, SLAB + 40); R.pill(s.x, s.y, 'APROVA → PRESIDENTE', prog(t, a1, a1 + 0.3) * fade, { at: a1, anchorBottom: true, size: 26, fill: PAL().ok }); });
    tags.push(() => { const s = R.S(bx, by, SLAB + 90); R.pill(s.x, s.y, 'REJEITA → ARQUIVO', prog(t, a2, a2 + 0.3) * fade, { at: a2, anchorBottom: true, size: 26 }); });
    tags.push(() => { const s = R.S(rx - 70, ry - 120, SLAB + 120); R.pill(s.x, s.y, 'MUDOU → VOLTA À CÂMARA', prog(t, a3, a3 + 0.3) * fade, { at: a3, anchorBottom: true, size: 26, fill: PAL().mustard }); });
    // folha fantasma indo para o arquivo
    const g1 = prog(t, a2 + 0.15, a2 + 1.1);
    if (g1 > 0 && g1 < 1) {
      const e = ease.inOut(g1), x = lerp(rx, bx, e), y = lerp(ry, by, e), z = SLAB + 40 + Math.sin(Math.PI * g1) * 70 - e * 10;
      add(x + y + 300, () => { const c = P(x, y, z); ghostSheet(c.X, c.Y, 0.9 * (1 - e * 0.4), g1 * 4, 0.85 * (1 - prog(g1, 0.8, 1))); });
    }
    // caminho de volta para a Câmara (seta tracejada até a estação 2)
    const g2 = ease.inOut(prog(t, a3 + 0.1, T.w(4, 'Câmara') + 0.5));
    if (g2 > 0) {
      const S2 = ISL.s2, A = P(rx, ry, SLAB + 60), Bp = P(S2.x + 210, S2.y + 260, SLAB + 60);
      add(1e6, () => {
        const pt = dashArc(A, Bp, { X: -260, Y: 0 }, g2, { alpha: 0.9 * fade, color: PAL().mustard, w: 6 });
        if (pt && g2 < 1) { const q = pt(g2); ghostSheet(q.X, q.Y, 0.9, -0.2, 0.9 * fade); }
      });
    }
  }

  // 6 · Sanção ou veto + derrubada do veto
  function stS5(t, add, ov, O, tags) {
    const T = R.T;
    add(O.x + 205 + O.y + 75, () => {
      D.box(O.x + 140, O.y + 40, SLAB, 130, 70, 10, PAL().stone);
      for (let i = 0; i < 6; i++) D.box(O.x + 146 + i * 22, O.y + 100, SLAB + 10, 6, 6, 30, PAL().paper);
      D.box(O.x + 132, O.y + 32, SLAB + 40, 146, 86, 8, PAL().paper);
    });
    // mesa do Presidente sobre o cano, com dois carimbos
    const dx = O.x + 80, dy = O.y + 120;
    const sA = T.w(5, 'sancionar'), sV = T.w(5, 'vetar');
    const hitA = pulse(t, sA, sA + 0.45), hitV = pulse(t, sV, sV + 0.45);
    add(dx + dy, () => {
      desk(dx - 24, dy - 24, 48, 48, 28, PAL().wood);
      D.cyl(dx - 12, dy - 12, SLAB + 28 + 14 - hitA * 12, 5, 9, PAL().ok);
      D.sphere(dx - 12, dy - 12, SLAB + 28 + 27 - hitA * 12, 5.5, PAL().ok);
      D.cyl(dx + 12, dy + 12, SLAB + 28 + 14 - hitV * 12, 5, 9, PAL().no);
      D.sphere(dx + 12, dy + 12, SLAB + 28 + 27 - hitV * 12, 5.5, PAL().no);
    });
    tags.push(() => { const s = R.S(dx, dy, SLAB + 120); R.pill(s.x, s.y, 'SANCIONA', prog(t, sA, sA + 0.25) * (1 - prog(t, sV - 0.1, sV + 0.1)), { at: sA, anchorBottom: true, size: 29, fill: PAL().ok }); });
    tags.push(() => { const s = R.S(dx, dy, SLAB + 120); R.pill(s.x, s.y, 'OU VETA (TOTAL OU PARCIAL)', prog(t, sV, sV + 0.25) * (1 - prog(t, T.w(5, 'silêncio') - 0.2, T.w(5, 'silêncio'))), { at: sV, anchorBottom: true, size: 26, fill: PAL().no }); });
    // relógio dos 15 dias úteis
    const kx = O.x + 225, ky = O.y + 160;
    const k0 = T.w(5, 'dias'), k1 = T.w(5, 'tácita');
    const turn = ease.inOut(prog(t, k0, k1));
    add(kx + ky, () => {
      D.cyl(kx, ky, SLAB, 9, 6, PAL().gray);
      D.cyl(kx, ky, SLAB + 6, 2.4, 54, PAL().gray);
      const c = P(kx, ky, SLAB + 86), r = 26;
      ctx.save();
      ctx.fillStyle = PAL().paper; ctx.beginPath(); ctx.arc(c.X, c.Y, r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = PAL().dark; ctx.lineWidth = 2.4; ctx.stroke();
      if (turn > 0) { ctx.fillStyle = `rgba(${PAL().glow},0.55)`; ctx.beginPath(); ctx.moveTo(c.X, c.Y); ctx.arc(c.X, c.Y, r - 3, -Math.PI / 2, -Math.PI / 2 + turn * Math.PI * 2); ctx.fill(); }
      for (let i = 0; i < 15; i++) { const a = -Math.PI / 2 + i / 15 * Math.PI * 2; ctx.strokeStyle = PAL().dark; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(c.X + Math.cos(a) * (r - 6), c.Y + Math.sin(a) * (r - 6)); ctx.lineTo(c.X + Math.cos(a) * (r - 2), c.Y + Math.sin(a) * (r - 2)); ctx.stroke(); }
      const a = -Math.PI / 2 + turn * Math.PI * 2;
      ctx.strokeStyle = PAL().ink; ctx.lineWidth = 3; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(c.X, c.Y); ctx.lineTo(c.X + Math.cos(a) * (r - 8), c.Y + Math.sin(a) * (r - 8)); ctx.stroke();
      ctx.fillStyle = PAL().ink; ctx.beginPath(); ctx.arc(c.X, c.Y, 3, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    });
    tags.push(() => { const s = R.S(kx, ky, SLAB + 130); R.pill(s.x, s.y, '15 DIAS ÚTEIS', prog(t, k0, k0 + 0.3) * (1 - prog(t, k1, k1 + 0.3)), { at: k0, anchorBottom: true, size: 28 }); });
    tags.push(() => { const s = R.S(kx, ky, SLAB + 130); R.pill(s.x, s.y, 'SILÊNCIO = SANÇÃO', prog(t, k1, k1 + 0.3) * (1 - prog(t, T.w(5, 'Congresso') - 0.2, T.w(5, 'Congresso'))), { at: k1, anchorBottom: true, size: 28, fill: PAL().mustard }); });
    // derrubada do veto: placar da sessão conjunta
    const d0 = T.w(5, 'Congresso'), d1 = T.w(5, 'deputados'), d2 = T.w(5, 'senadores');
    const nD = Math.round(257 * ease.out(prog(t, d1 - 0.2, d1 + 0.8))), nS = Math.round(41 * ease.out(prog(t, d2 - 0.2, d2 + 0.6)));
    add(O.x + 75 + O.y + 262, () => board(O.x + 14, O.y + 256, SLAB + 30, 124, 80, PAL().dark, g => {
      g.fillStyle = 'rgba(240,233,216,0.7)'; g.font = '500 7.5px "IBM Plex Mono"'; g.fillText('DERRUBADA DO VETO', 7, 12);
      g.fillStyle = nD >= 257 ? PAL().lampOn : PAL().paper; g.font = '500 22px "IBM Plex Mono"'; g.fillText(String(nD).padStart(3, '0'), 7, 40);
      g.fillStyle = 'rgba(240,233,216,0.75)'; g.font = '600 7.5px Inter'; g.fillText('DEPUTADOS', 56, 31); g.fillText('DE 513', 56, 41);
      g.fillStyle = nS >= 41 ? PAL().lampOn : PAL().paper; g.font = '500 22px "IBM Plex Mono"'; g.fillText(String(nS).padStart(3, '0'), 7, 68);
      g.fillStyle = 'rgba(240,233,216,0.75)'; g.font = '600 7.5px Inter'; g.fillText('SENADORES', 56, 59); g.fillText('DE 81', 56, 69);
    }));
    tags.push(() => { const s = R.S(O.x + 76, O.y + 260, SLAB + 140); R.pill(s.x, s.y, 'MAIORIA ABSOLUTA NAS DUAS CASAS', prog(t, T.w(5, 'absoluta'), T.w(5, 'absoluta') + 0.3) * (1 - prog(t, R.BEATS[5].end + 0.6, R.BEATS[5].end + 1)), { at: T.w(5, 'absoluta'), anchorBottom: true, size: 24, fill: PAL().mustard }); });
    void d0;
  }

  // 7 · Diário Oficial e vigência
  function stS6(t, add, ov, O, tags) {
    const T = R.T;
    const p0 = T.w(6, 'publicada');
    const hit = Math.max(pulse(t, p0 + 0.1, p0 + 0.5), pulse(t, p0 + 0.6, p0 + 1.0));
    add(O.x + 180 + O.y + 100, () => {
      D.box(O.x + 130, O.y + 60, SLAB, 100, 80, 60, PAL().gray);
      D.onFace('left', O.x + 130, O.y + 140, SLAB + 60, g => { g.fillStyle = PAL().paper; g.font = '600 9px Inter'; g.fillText('DIÁRIO OFICIAL', 10, 24); });
      D.box(O.x + 140, O.y + 70, SLAB + 60 + 8 - hit * 8, 80, 60, 10, PAL().dark);
    });
    add(O.x + 90 + O.y + 220, () => D.cyl(O.x + 90, O.y + 220, SLAB, 28, 40, PAL().paper));
    const outP = ease.out(prog(t, p0 + 0.9, p0 + 1.8));
    add(O.x + 220 + O.y + 225, () => {
      for (let i = 0; i < 4; i++) D.box(O.x + 200, O.y + 205, SLAB + i * 5, 40, 30, 5, PAL().paper);
      if (outP > 0) { const x = lerp(O.x + 185, O.x + 220, outP), y = lerp(O.y + 150, O.y + 220, outP), c = P(x, y, SLAB + 26 + Math.sin(Math.PI * outP) * 20); D.sheet(c.X, c.Y, 1.2, -0.1, { tag: 'LEI', glow: 1 - outP * 0.6 }); }
    });
    tags.push(() => { const s = R.S(O.x + 220, O.y + 220, SLAB + 120); R.pill(s.x, s.y, 'LEI PUBLICADA', prog(t, p0 + 1.4, p0 + 1.7) * (1 - prog(t, T.w(6, 'data') - 0.2, T.w(6, 'data'))), { at: p0 + 1.4, anchorBottom: true, size: 29, fill: PAL().ok }); });
    // calendário da vigência
    const cd = T.w(6, 'data'), c45 = T.w(6, '45');
    const n45 = Math.round(45 * ease.out(prog(t, c45 - 0.1, c45 + 1.0)));
    add(O.x + 45 + O.y + 25, () => board(O.x + 15, O.y + 22, SLAB + 22, 64, 70, PAL().paper, g => {
      g.fillStyle = PAL().sage; g.fillRect(0, 0, 64, 15);
      g.fillStyle = PAL().paper; g.font = '600 7px Inter'; g.fillText('VIGÊNCIA', 8, 10.5);
      g.fillStyle = PAL().ink;
      if (t >= c45 - 0.1) { g.font = '500 24px "IBM Plex Mono"'; g.fillText(String(n45), 8, 45); g.font = '600 7px Inter'; g.fillText('DIAS DEPOIS', 8, 59); }
      else if (t >= cd) { g.font = '600 8px Inter'; g.fillText('NA DATA', 8, 36); g.fillText('QUE A LEI', 8, 47); g.fillText('DEFINIR', 8, 58); }
    }));
    tags.push(() => { const s = R.S(O.x + 47, O.y + 26, SLAB + 120); R.pill(s.x, s.y, 'SE A LEI NÃO DISSER: 45 DIAS', prog(t, c45 + 0.9, c45 + 1.2) * (1 - prog(t, R.BEATS[6].end + 0.6, R.BEATS[6].end + 1)), { at: c45 + 0.9, anchorBottom: true, size: 24, fill: PAL().mustard }); });
  }

  // primeiro quadrado: o Congresso Nacional em miniatura (mesmo modelo da abertura B)
  function stCn(t, add, ov, O) {
    const cx = O.x + O.s / 2, cy = O.y + O.s / 2;
    add(cx + cy, () => {
      const c = P(cx, cy, SLAB);
      ctx.save(); ctx.translate(c.X, c.Y); ctx.scale(0.7, 0.7);
      R.drawCongressModel(t - 0.15);
      ctx.restore();
    });
  }
  const STATIONS = { cn: stCn, vote: stVote, s1: stS1, s2: stS2, s3: stS3, s4: stS4, s5: stS5, s6: stS6 };

  // base de maquete: sombra suave no chão + bloco verde com textura de pedra
  let stoneTex = null;
  function stonePattern() {
    if (stoneTex) return stoneTex;
    const cv = document.createElement('canvas'); cv.width = cv.height = 256;
    const g = cv.getContext('2d'), r = rng(11);
    for (let i = 0; i < 2600; i++) {
      g.fillStyle = r() < 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.08)';
      g.fillRect(r() * 256, r() * 256, 1 + r() * 2, 1 + r() * 2);
    }
    g.strokeStyle = 'rgba(240,233,216,0.06)'; g.lineWidth = 1.2;
    for (let i = 0; i < 5; i++) {
      g.beginPath(); let x = r() * 256, y = 0; g.moveTo(x, y);
      while (y < 256) { x += (r() - 0.5) * 30; y += 12 + r() * 20; g.lineTo(x, y); }
      g.stroke();
    }
    stoneTex = ctx.createPattern(cv, 'repeat');
    return stoneTex;
  }
  // visual 2 (padrão; ?look=1 volta ao anterior): pedestal de maquete, filete creme e árvores
  const LOOK2 = R.LOOK2 = new URLSearchParams(location.search).get('look') !== '1';
  function drawBase(x, y, z, w, d, h, color) {
    if (LOOK2) { z -= 46; }
    const c = [P(x, y + d, z), P(x + w, y + d, z), P(x + w, y, z)];
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 50; ctx.shadowOffsetY = 26;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath(); ctx.moveTo(c[0].X, c[0].Y); ctx.lineTo(c[1].X, c[1].Y); ctx.lineTo(c[2].X, c[2].Y);
    const b = P(x, y, z); ctx.lineTo(b.X, b.Y); ctx.closePath(); ctx.fill();
    ctx.restore();
    if (LOOK2) {
      D.box(x, y, z, w, d, 46, '#26302B', { noShadow: true });
      // filete creme entre o pedestal e a bandeja
      D.box(x - 3, y - 3, 0, w + 6, d + 6, 4, R.shade(PAL().paper, 0.86), { noShadow: true });
      z = 4; h -= 4;
      D.box(x, y, z, w, d, h, color || PAL().slab, { noShadow: true });
      D.onFace('top', x, y, z + h, g => {
        const gr = g.createLinearGradient(0, 0, w, d);
        gr.addColorStop(0, 'rgba(255,250,236,0.07)'); gr.addColorStop(1, 'rgba(0,0,0,0.10)');
        g.fillStyle = gr; g.fillRect(0, 0, w, d);
        g.strokeStyle = 'rgba(240,233,216,0.10)'; g.lineWidth = 2; g.strokeRect(12, 12, w - 24, d - 24);
      });
      return;
    }
    D.box(x, y, z, w, d, h, color || PAL().slab, { noShadow: true });
    D.onFace('top', x, y, z + h, g => {
      if (R.STYLE.pattern) { g.fillStyle = stonePattern(); g.fillRect(0, 0, w, d); }
      g.strokeStyle = 'rgba(240,233,216,0.07)'; g.lineWidth = 2; g.strokeRect(8, 8, w - 16, d - 16);
    });
    if (R.STYLE.pattern) {
      D.onFace('left', x, y + d, z + h, g => { g.fillStyle = stonePattern(); g.globalAlpha = 0.6; g.fillRect(0, 0, w, h); });
      D.onFace('right', x + w, y + d, z + h, g => { g.fillStyle = stonePattern(); g.globalAlpha = 0.6; g.fillRect(0, 0, d, h); });
    }
  }
  R.drawBase = drawBase;

  function tree(x, y, z, k) {
    D.cyl(x, y, z, 2.6 * k, 9 * k, R.shade(PAL().wood, 0.8));
    D.sphere(x + 3 * k, y - 2 * k, z + 13 * k, 7.5 * k, R.shade(PAL().tree, 1.0));
    D.sphere(x, y, z + 17 * k, 9 * k, R.shade(PAL().tree, 1.18));
    D.sphere(x - 2.5 * k, y + 2 * k, z + 23 * k, 6 * k, R.shade(PAL().tree, 1.42));
  }
  R.tree = tree;
  // posições (u, v em 0..1 da ilha, escala)
  const DECOR = R.DECOR = {
    vote: [[0.9, 0.08, 1], [0.08, 0.9, 0.9]],
    s1: [[0.93, 0.07, 1], [0.07, 0.93, 0.9]],
    s2: [[0.93, 0.07, 1], [0.07, 0.93, 0.9]],
    s3: [[0.07, 0.07, 1.1], [0.93, 0.07, 1], [0.07, 0.93, 0.9]],
    s4: [[0.07, 0.07, 1.1], [0.93, 0.07, 1], [0.07, 0.93, 0.9]],
    s5: [[0.93, 0.07, 1], [0.07, 0.93, 0.9]],
    s6: [[0.07, 0.07, 1.1], [0.93, 0.07, 1], [0.07, 0.93, 0.9]],
  };

  function glowAt(c, a) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(c.X, c.Y, 0, c.X, c.Y, 60);
    g.addColorStop(0, `rgba(${PAL().glow},${0.5 * a})`); g.addColorStop(1, `rgba(${PAL().glow},0)`);
    ctx.fillStyle = g; ctx.fillRect(c.X - 60, c.Y - 60, 120, 120);
    ctx.restore();
  }

  // ======================================================================
  // monta a cena do quadro t
  // ======================================================================
  R.buildScene = function (t) {
    const slabs = [], items = [], tags = [];
    const ov = clamp((0.7 - R.cam.zoom) / 0.25); // 1 = visão geral
    for (const k in ISL) {
      const I = ISL[k];
      const appear = ease.back(prog(t, I.at, I.at + 0.55));
      if (appear <= 0) continue;
      const pv = P(I.x + I.s / 2, I.y + I.s / 2, 0);
      const wrap = (fn, extra = 0) => () => {
        const s = extra ? ease.back(prog(t, I.at + 0.25 + extra, I.at + 0.7 + extra)) : appear;
        if (s <= 0.01) return;
        if (s < 0.999) { ctx.save(); ctx.translate(pv.X, pv.Y); ctx.scale(s, s); ctx.translate(-pv.X, -pv.Y); fn(); ctx.restore(); }
        else fn();
      };
      slabs.push(wrap(() => drawBase(I.x, I.y, 0, I.s, I.s, SLAB)));
      let n = 0;
      const add = (depth, fn) => { const extra = 0.04 * (n++ % 6); items.push({ depth, fn: wrap(fn, extra) }); };
      STATIONS[k](t, add, ov, I, tags);
      if (LOOK2) for (const [u, v, sc] of DECOR[k] || []) {
        const tx = I.x + u * I.s, ty = I.y + v * I.s;
        add(tx + ty, () => tree(tx, ty, SLAB, 1.5 * sc));
      }
      if (NAMES[k]) {
        const show = ov * clamp(prog(t, R.INTRO_END + 2, R.INTRO_END + 2.5));
        const qa = R.T.w(0, 'Mas'), qb = R.T.w(0, 'Vem');
        const q = pulse(t, qa + 0.6, qb + 0.2) > 0 ? clamp(Math.min(prog(t, qa + 0.6 + 0.08 * I.at * 6, qa + 0.9 + 0.08 * I.at * 6), 1 - prog(t, qb - 0.2, qb + 0.1))) : 0;
        const c = center(k);
        tags.push(() => {
          const s = R.S(c.x, c.y, 150);
          if (q > 0) R.pill(s.x, s.y, '?', q, { size: 40, anchorBottom: true, fill: PAL().mustard });
          else if (show > 0 && t > qb && t < R.T.w(7, 'Agora') + 0.6) R.pill(s.x, s.y, NAMES[k], show * (1 - prog(t, R.T.w(7, 'Agora'), R.T.w(7, 'Agora') + 0.6)), { size: 32, anchorBottom: true });
        });
      }
    }
    // cano (construído na intro) + PL
    const built = LEN * ease.inOut(prog(t, 0.7, 2.4));
    const pl = plPos(t);
    const T = R.T;
    const finale = ease.inOut(prog(t, T.w(7, 'Agora'), T.w(7, 'Agora') + 1.8));
    addPipe((d, fn) => items.push({ depth: d, fn }), built, Math.max(pl ? pl.s : 0, finale * LEN));
    // comissões aprovam sem plenário: atalho tracejado da estação 2 para o Senado
    const by = ease.inOut(prog(t, T.w(3, 'Muitas'), T.w(3, 'plenário') + 0.2));
    const byOut = 1 - prog(t, T.w(3, 'outros') - 0.1, T.w(3, 'outros') + 0.4);
    if (by > 0 && byOut > 0) {
      const A = P(ISL.s2.x + 250, ISL.s2.y + 200, 90), Bp = P(ISL.s4.x + 100, ISL.s4.y + 40, 90);
      items.push({ depth: 2e6, fn: () => dashArc(A, Bp, { X: 520, Y: -60 }, by, { alpha: byOut, color: PAL().mustard, w: 9 }) });
      tags.push(() => { const s = R.S(ISL.s3.x + 300, ISL.s3.y + 60, 200); R.pill(s.x + 150, s.y, 'SEM PLENÁRIO', prog(by, 0.5, 0.8) * byOut, { at: T.w(3, 'Muitas'), size: 30, fill: PAL().mustard }); });
    }
    if (pl && pl.s < MACH.press - 22) {
      const p = at(pl.s), l = lift(pl.s);
      const z = PZ + 8 + l * 40;
      items.push({
        depth: p.x + p.y + 2 + l * 80,
        fn: () => {
          const c = P(p.x, p.y, z);
          const T = R.T;
          D.sheet(c.X, c.Y, 1.05 + 0.35 * clamp((0.7 - R.cam.zoom) / 0.25), Math.sin(t * 7) * 0.12 * pl.moving, {
            tag: 'PL', glow: 0.35 + 0.65 * pl.moving,
            check: t > T.w(2, 'parecer') + 0.2, mark: t > T.w(2, 'mudanças') + 0.1,
          });
        },
      });
    }
    return { slabs, items, tags };
  };
})();
