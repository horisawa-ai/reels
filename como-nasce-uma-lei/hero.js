// Abertura opção B: o Congresso Nacional em miniatura sobre um bloco verde.
// A câmera se aproxima em diagonal; a folha do Projeto de Lei levanta e parte para a primeira cena.
(function () {
  const R = window.R, D = R.draw, P = R.P;
  const { clamp, lerp, prog, ease, rng } = R.U;
  const ctx = R.ctx;
  const PAL = () => R.PAL;
  const END = 5.0;
  R.HERO = { END };

  R.heroCamera = function (t) {
    const e = ease.inOut(prog(t, 0, END));
    const z = Math.exp(lerp(Math.log(0.92), Math.log(1.5), e));
    const f = P(lerp(-40, 20, e), lerp(40, -10, e), 60);
    const sy = lerp(1150, 1090, e);
    R.cam.zoom = z; R.cam.fx = f.X; R.cam.fy = f.Y - (sy - R.H / 2) / z;
  };

  function pop(s, pivot, fn) {
    if (s <= 0.01) return;
    if (s >= 0.999) return fn();
    ctx.save(); ctx.translate(pivot.X, pivot.Y); ctx.scale(s, s); ctx.translate(-pivot.X, -pivot.Y); fn(); ctx.restore();
  }

  // árvores fixas (semente) ao redor do prédio
  const trees = [];
  { const r = rng(21);
    while (trees.length < 26) {
      const x = -210 + r() * 420, y = -210 + r() * 420;
      const inBuilding = x > -175 && x < 175 && y > -70 && y < 60;
      const inWater = x > -170 && x < 170 && y > 70 && y < 170;
      const ramp = x < -150 && y > -20 && y < 20;
      if (inBuilding || inWater || ramp) continue;
      trees.push({ x, y, r: 9 + r() * 7, d: r() * 0.6 });
    }
  }

  R.drawHero = function (t) {
    R.world();
    const B = 230;
    // bloco de base
    pop(ease.back(prog(t, 0, 0.6)), P(0, 0, -70), () => R.drawBase(-B, -B, -70, 2 * B, 2 * B, 70));
    // espelho d'água
    const wa = prog(t, 0.3, 0.8);
    if (wa > 0) {
      D.onFace('top', -170, 70, 0, g => {
        g.globalAlpha = wa;
        g.fillStyle = PAL().water; g.fillRect(0, 0, 340, 100);
        g.strokeStyle = PAL().line; g.lineWidth = 2.4; g.strokeRect(0, 0, 340, 100);
        // reflexo das torres + brilhos
        const gr = g.createLinearGradient(0, 0, 0, 100);
        gr.addColorStop(0, 'rgba(240,233,216,0.10)'); gr.addColorStop(1, 'rgba(240,233,216,0)');
        g.fillStyle = gr; g.fillRect(150, 0, 40, 100);
        for (let i = 0; i < 7; i++) {
          const x = (i * 53 + t * 22) % 330;
          g.fillStyle = 'rgba(240,233,216,0.12)'; g.fillRect(x, 18 + (i * 29) % 70, 22, 1.6);
        }
      });
    }
    // plataforma (anexo baixo)
    const pl = ease.back(prog(t, 0.3, 0.9));
    pop(pl, P(0, 0, 0), () => {
      D.box(-160, -50, 0, 320, 100, 14, PAL().stone);
      D.onFace('left', -160, 50, 14, g => {
        g.fillStyle = 'rgba(9,12,11,0.55)';
        for (let i = 4; i < 320; i += 9) g.fillRect(i, 3, 4.2, 8);
      });
      // rampa
      const a = P(-218, -7, 0), b = P(-160, -7, 14), c = P(-160, 7, 14), d = P(-218, 7, 0);
      D.face([a, b, c, d], PAL().sand);
      D.face([d, c, P(-160, 7, 0)], R.shade(PAL().sand, 0.8));
    });
    // Senado (cúpula)
    pop(ease.back(prog(t, 0.8, 1.3)), P(-95, 0, 14), () => D.dome(-95, 0, 14, 34, 30, PAL().paper));
    // torres
    const tw = ease.out(prog(t, 0.5, 1.6));
    if (tw > 0) {
      const h = 175 * tw;
      const r = rng(3);
      for (const x0 of [-24, 8]) {
        D.box(x0, -38, 14, 16, 50, h, PAL().sand);
        D.onFace('left', x0, 12, 14 + h, g => {
          g.fillStyle = 'rgba(9,12,11,0.35)';
          for (let y = 5; y < h - 2; y += 6.2) g.fillRect(1.5, y, 13, 1.1);
        });
        D.onFace('right', x0 + 16, 12, 14 + h, g => {
          for (let y = 5; y < h - 2; y += 6.2) {
            g.fillStyle = 'rgba(9,12,11,0.28)'; g.fillRect(2, y, 46, 1.1);
            if (r() < 0.25 && t > 1.6) { g.fillStyle = `rgba(${PAL().glow},${0.35 + r() * 0.4})`; g.fillRect(4 + r() * 36, y - 3.6, 6, 3.2); }
          }
        });
      }
      if (tw > 0.55) D.box(-8, -24, 14 + h * 0.48, 16, 22, 10, PAL().stone);
    }
    // Câmara (cuia)
    pop(ease.back(prog(t, 1.0, 1.5)), P(95, 0, 14), () => D.frustum(95, 0, 14, 16, 50, 24, PAL().paper, { hollow: true, bulge: 6 }));
    // árvores
    const sorted = trees.slice().sort((a, b) => a.x + a.y - (b.x + b.y));
    for (const tr of sorted) {
      const s = ease.back(prog(t, 1.1 + tr.d, 1.5 + tr.d));
      pop(s, P(tr.x, tr.y, 0), () => {
        D.cyl(tr.x, tr.y, 0, 2, 7, PAL().wood);
        D.sphere(tr.x, tr.y, 7 + tr.r, tr.r, PAL().tree);
      });
    }
    // folha do Projeto de Lei: deitada no canto, levanta e parte
    const px = 175, py = 190;
    const lift = prog(t, 2.2, 4.8);
    if (lift <= 0) {
      const a = prog(t, 0.9, 1.4);
      if (a > 0) D.onFace('top', px - 34, py - 24, 0.5, g => {
        g.globalAlpha = a; g.fillStyle = PAL().paper; g.fillRect(0, 0, 60, 46);
        g.strokeStyle = PAL().line; g.lineWidth = 1.6; g.strokeRect(0, 0, 60, 46);
        g.fillStyle = 'rgba(16,21,19,0.45)';
        for (let i = 0; i < 5; i++) g.fillRect(6, 12 + i * 6, i % 2 ? 34 : 46, 1.8);
        g.fillStyle = PAL().ink; g.font = '600 5.4px Inter'; g.fillText('PROJETO DE LEI', 6, 7.5);
      });
    } else {
      const e = ease.in(lift);
      const x = lerp(px, px + 240, e), y = lerp(py, py - 380, e);
      const z = 6 + Math.sin(Math.PI * Math.min(1, lift * 1.4)) * 60 + e * 260;
      const c = P(x, y, z);
      D.sheet(c.X, c.Y, lerp(1.0, 1.6, ease.out(Math.min(1, lift * 2))), Math.sin(lift * 7) * 0.25 - 0.2 * e, { tag: 'PL', glow: 0.8 });
    }
  };
})();
