// Reels "Como nasce uma lei" — abertura (teste de estilo, 0–9.5s)
// Tudo é desenhado por render(t): o mesmo t sempre gera o mesmo quadro,
// então o player e o render.mjs produzem exatamente a mesma imagem.
(function () {
  const W = 1080, H = 1920;
  const DURATION = 9.5;

  // ---------- utilidades
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const lerp = (a, b, t) => a + (b - a) * t;
  const prog = (t, a, b) => clamp((t - a) / (b - a));
  const ease = {
    inOut: x => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
    out: x => 1 - Math.pow(1 - x, 3),
    outQuint: x => 1 - Math.pow(1 - x, 5),
    back: x => { const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); },
  };
  function rng(seed) {
    return () => {
      seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const C = {
    green: '#009C3B', greenLit: '#1DB954', yellow: '#FFDF00', blue: '#002776',
    paper: '#F7F6F1', ink: '#0B1638',
  };

  const canvas = document.getElementById('stage');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');

  // ---------- mundo (coordenadas da cena aberta, câmera z = 1)
  const HORIZON = 1330;
  const MAST = { x: 170, top: 556, bottom: 1800 };
  const FLAG = { x: 175, y: 566, w: 470 };
  FLAG.h = FLAG.w * 0.7;
  const FLAG_C = { x: FLAG.x + FLAG.w / 2, y: FLAG.y + FLAG.h / 2 };
  const SUN = { x: 540, y: 1295 };

  let flagTex, silhouette, grain = [];
  const stars = [], motes = [];

  // ---------- câmera
  // Fase A: close na bandeira, panorâmica lenta. Fase B: dolly-out revelando o Congresso.
  function camera(t) {
    const a = prog(t, 0, 2.9);
    const zA = lerp(6.6, 7.1, a);
    const panX = lerp(-0.11, 0.06, ease.inOut(a)) * FLAG.w;
    const panY = lerp(0.03, -0.005, a) * FLAG.h;
    const sA = { x: 540 - panX * zA, y: 960 - panY * zA }; // onde o centro da bandeira cai na tela

    const b = ease.inOut(prog(t, 2.85, 4.75));
    const zB = lerp(1.0, 1.05, ease.inOut(prog(t, 4.75, DURATION)));
    const fyB = lerp(1010, 975, ease.inOut(prog(t, 4.75, DURATION)));
    const sB = { x: 540 + (FLAG_C.x - 540) * zB, y: 960 + (FLAG_C.y - fyB) * zB };

    const z = Math.exp(lerp(Math.log(zA), Math.log(zB), b));
    const s = { x: lerp(sA.x, sB.x, b), y: lerp(sA.y, sB.y, b) };
    return {
      z,
      fx: FLAG_C.x - (s.x - 540) / z,
      fy: FLAG_C.y - (s.y - 960) / z,
      roll: lerp(-0.03, 0, ease.inOut(prog(t, 0, 4.75))),
      // arco lateral: o primeiro plano (bandeira) sai pela esquerda, o Congresso fica parado
      px: 520 * ease.inOut(prog(t, 5.7, 6.9)),
      b,
    };
  }
  // profundidade d: 1 = primeiro plano (mastro), 0 = infinito (céu)
  function layer(cam, d) {
    const zd = 1 + (cam.z - 1) * d;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.translate(W / 2, H / 2);
    ctx.rotate(cam.roll * d);
    ctx.scale(zd, zd);
    ctx.translate(-cam.fx - cam.px * (d - 0.6) / 0.4, -cam.fy);
    return zd;
  }
  function toScreen(cam, d, x, y) {
    const zd = 1 + (cam.z - 1) * d;
    const px = (x - cam.fx - cam.px * (d - 0.6) / 0.4) * zd, py = (y - cam.fy) * zd;
    const c = Math.cos(cam.roll * d), s = Math.sin(cam.roll * d);
    return { x: W / 2 + px * c - py * s, y: H / 2 + px * s + py * c };
  }

  // ---------- bandeira tremulando (faixas verticais deslocadas + sombreamento pela inclinação)
  function drawFlag(x, y, w, t, amp, pxPerUnit) {
    const h = w * 0.7, tw = flagTex.width, th = flagTex.height;
    const N = Math.round(clamp((w * pxPerUnit) / 3, 60, 1000));
    const sw = w / N;
    for (let i = 0; i < N; i++) {
      const u = i / N, um = (i + 0.5) / N;
      const k = 0.12 + 0.88 * um; // preso no mastro, solto na ponta
      const p1 = um * Math.PI * 2 * 1.25 - t * 4.3;
      const p2 = um * Math.PI * 2 * 2.6 - t * 6.4 + 1.3;
      const wave = Math.sin(p1) * 0.75 + Math.sin(p2) * 0.25;
      const slope = (Math.cos(p1) * 0.75 + Math.cos(p2) * 0.52) * k;
      const dh = h * (1 - 0.035 * k * Math.abs(Math.sin(p1)));
      const dx = x + u * w;
      const top = y + wave * amp * h * k + (h - dh) / 2;
      const srcW = Math.min(tw / N + 1, tw - u * tw);
      ctx.drawImage(flagTex, u * tw, 0, srcW, th, dx, top, sw + 0.6, dh);
      const L = slope * 0.17;
      ctx.fillStyle = L > 0 ? `rgba(255,255,255,${L})` : `rgba(0,0,20,${-L * 1.5})`;
      ctx.fillRect(dx, top, sw + 0.6, dh);
    }
  }

  // ---------- Congresso Nacional (silhueta, desenhada uma vez em offscreen 2x)
  function buildSilhouette() {
    const S = 2, X0 = -60, Y0 = 700, WW = 1200, HH = 640;
    const cv = document.createElement('canvas');
    cv.width = WW * S; cv.height = HH * S;
    const g = cv.getContext('2d');
    g.scale(S, S); g.translate(-X0, -Y0);
    const body = g.createLinearGradient(0, 760, 0, 1330);
    body.addColorStop(0, '#171C45'); body.addColorStop(1, '#070A1E');
    const rim = 'rgba(255,176,105,0.75)';
    const r = rng(7);

    // edifício principal (laje) e rampa
    g.fillStyle = body;
    g.fillRect(40, 1288, 1000, 44);
    g.beginPath(); g.moveTo(90, 1332); g.lineTo(250, 1288); g.lineTo(262, 1288); g.lineTo(112, 1332); g.fill();
    // torres gêmeas + passarela
    const towers = [[466, 528], [552, 614]];
    for (const [a, b] of towers) g.fillRect(a, 760, b - a, 530);
    g.fillRect(528, 1000, 24, 46);
    // andares e janelas acesas
    for (const [a, b] of towers) {
      for (let y = 772; y < 1285; y += 13) {
        g.fillStyle = 'rgba(255,255,255,0.045)'; g.fillRect(a + 3, y, b - a - 6, 1.2);
        for (let c = 0; c < 4; c++) {
          if (r() < 0.13) {
            g.fillStyle = `rgba(255,${190 + r() * 40},${110 + r() * 50},${0.35 + r() * 0.45})`;
            g.fillRect(a + 5 + c * 14, y + 3, 10, 6);
          }
        }
      }
    }
    // Senado (cúpula) à esquerda
    g.fillStyle = body;
    g.beginPath(); g.ellipse(290, 1290, 98, 64, 0, Math.PI, 0); g.fill();
    // Câmara (cuia) à direita
    g.beginPath();
    g.moveTo(640, 1222);
    g.bezierCurveTo(660, 1268, 712, 1288, 745, 1289);
    g.lineTo(835, 1289);
    g.bezierCurveTo(868, 1288, 920, 1268, 940, 1222);
    g.closePath(); g.fill();
    g.fillStyle = '#1E2556';
    g.beginPath(); g.ellipse(790, 1222, 150, 15, 0, 0, Math.PI * 2); g.fill();

    // luz de recorte (o sol está atrás)
    g.strokeStyle = rim; g.lineWidth = 2.2; g.lineCap = 'round';
    g.beginPath(); g.ellipse(290, 1290, 98, 64, 0, Math.PI, 0); g.stroke();
    g.beginPath(); g.ellipse(790, 1222, 150, 15, 0, Math.PI, Math.PI * 2); g.stroke();
    for (const [a, b] of towers) {
      g.beginPath(); g.moveTo(a, 1288); g.lineTo(a, 760); g.lineTo(b, 760); g.lineTo(b, 1288); g.stroke();
    }
    g.beginPath(); g.moveTo(40, 1288); g.lineTo(1040, 1288); g.stroke();
    silhouette = { cv, X0, Y0, WW, HH };
  }

  function buildGrain() {
    const r = rng(99);
    for (let n = 0; n < 4; n++) {
      const cv = document.createElement('canvas'); cv.width = 540; cv.height = 960;
      const g = cv.getContext('2d'); const img = g.createImageData(540, 960);
      for (let i = 0; i < img.data.length; i += 4) {
        const v = r() * 255; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 20;
      }
      g.putImageData(img, 0, 0); grain.push(cv);
    }
  }

  function buildParticles() {
    const r = rng(42);
    for (let i = 0; i < 170; i++) stars.push({ x: -300 + r() * 1700, y: -500 + r() * 1350, s: 0.6 + r() * 1.8, ph: r() * 6.28 });
    for (let i = 0; i < 60; i++) motes.push({ x: r() * W, y: r() * H, s: 2 + r() * 7, sp: 12 + r() * 30, ph: r() * 6.28, dr: r() * 2 - 1 });
  }

  // ---------- camadas da cena
  function drawSky(cam, t) {
    layer(cam, 0.15);
    const g = ctx.createLinearGradient(0, -400, 0, HORIZON);
    g.addColorStop(0, '#040819');
    g.addColorStop(0.35, '#0D1A45');
    g.addColorStop(0.62, '#2A2A5F');
    g.addColorStop(0.8, '#7B3F6D');
    g.addColorStop(0.92, '#E1745A');
    g.addColorStop(1, '#FFB36A');
    ctx.fillStyle = g;
    ctx.fillRect(-3000, -3000, 7000, HORIZON + 3000);
    for (const s of stars) {
      const tw = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * 2.2 + s.ph));
      const fade = clamp(1 - (s.y - 200) / 600);
      ctx.fillStyle = `rgba(255,255,255,${0.75 * tw * fade})`;
      ctx.beginPath(); ctx.arc(s.x, s.y, s.s, 0, Math.PI * 2); ctx.fill();
    }
  }

  function drawSun(cam, t) {
    layer(cam, 0.35);
    const g = ctx.createRadialGradient(SUN.x, SUN.y, 0, SUN.x, SUN.y, 950);
    g.addColorStop(0, 'rgba(255,214,150,0.85)');
    g.addColorStop(0.12, 'rgba(255,170,100,0.45)');
    g.addColorStop(0.45, 'rgba(255,110,90,0.12)');
    g.addColorStop(1, 'rgba(255,110,90,0)');
    ctx.fillStyle = g; ctx.fillRect(SUN.x - 1000, SUN.y - 1000, 2000, 2000);
    // raios de luz
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 11; i++) {
      const ang = -Math.PI / 2 + (i - 5) * 0.17 + Math.sin(t * 0.35 + i) * 0.03;
      const wdt = 0.025 + 0.02 * Math.sin(i * 3.1);
      const al = 0.035 + 0.025 * Math.sin(t * 1.3 + i * 1.7);
      const L = 1500;
      const gr = ctx.createLinearGradient(SUN.x, SUN.y, SUN.x + Math.cos(ang) * L, SUN.y + Math.sin(ang) * L);
      gr.addColorStop(0, `rgba(255,200,140,${al})`); gr.addColorStop(1, 'rgba(255,200,140,0)');
      ctx.fillStyle = gr;
      ctx.beginPath(); ctx.moveTo(SUN.x, SUN.y);
      ctx.lineTo(SUN.x + Math.cos(ang - wdt) * L, SUN.y + Math.sin(ang - wdt) * L);
      ctx.lineTo(SUN.x + Math.cos(ang + wdt) * L, SUN.y + Math.sin(ang + wdt) * L);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawCongress(cam, t) {
    layer(cam, 0.6);
    const s = silhouette;
    ctx.drawImage(s.cv, s.X0, s.Y0, s.WW, s.HH);
    // chão e espelho d'água
    const gg = ctx.createLinearGradient(0, HORIZON, 0, 2300);
    gg.addColorStop(0, '#0C1334'); gg.addColorStop(0.35, '#060A1D'); gg.addColorStop(1, '#020309');
    ctx.fillStyle = gg; ctx.fillRect(-3000, HORIZON, 7000, 3000);
    const pool = ctx.createLinearGradient(0, HORIZON + 4, 0, 1560);
    pool.addColorStop(0, 'rgba(255,160,110,0.35)'); pool.addColorStop(0.25, 'rgba(70,60,120,0.25)'); pool.addColorStop(1, 'rgba(20,30,70,0)');
    ctx.fillStyle = pool; ctx.fillRect(-3000, HORIZON + 4, 7000, 260);
    // reflexo ondulado da silhueta
    ctx.save(); ctx.globalAlpha = 0.32;
    const reflH = 560, step = 3;
    for (let yy = 0; yy < reflH; yy += step) {
      const srcY = (HORIZON - s.Y0 - yy - step) * 2; // linha espelhada na textura 2x
      if (srcY < 0) break;
      const off = Math.sin(yy * 0.09 + t * 2.4) * (1 + yy * 0.02);
      ctx.globalAlpha = 0.34 * (1 - yy / reflH);
      ctx.drawImage(s.cv, 0, srcY, s.cv.width, step * 2, s.X0 + off, HORIZON + 4 + yy, s.WW, step);
    }
    ctx.restore();
    // brilho do sol na água
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const sg = ctx.createRadialGradient(SUN.x, HORIZON + 30, 0, SUN.x, HORIZON + 30, 300);
    sg.addColorStop(0, 'rgba(255,190,120,0.35)'); sg.addColorStop(1, 'rgba(255,190,120,0)');
    ctx.translate(SUN.x, HORIZON + 30); ctx.scale(1, 0.22); ctx.translate(-SUN.x, -(HORIZON + 30));
    ctx.fillStyle = sg; ctx.fillRect(SUN.x - 320, HORIZON - 300, 640, 660);
    ctx.restore();
  }

  function drawMastAndFlag(cam, t) {
    const zd = layer(cam, 1);
    const mg = ctx.createLinearGradient(MAST.x - 5, 0, MAST.x + 5, 0);
    mg.addColorStop(0, '#5A6075'); mg.addColorStop(0.45, '#E9E3D6'); mg.addColorStop(1, '#3A3F52');
    ctx.fillStyle = mg; ctx.fillRect(MAST.x - 4.5, MAST.top, 9, MAST.bottom - MAST.top);
    const bg = ctx.createRadialGradient(MAST.x - 3, MAST.top - 10, 1, MAST.x, MAST.top - 7, 10);
    bg.addColorStop(0, '#FFF3C4'); bg.addColorStop(1, '#B8892A');
    ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(MAST.x, MAST.top - 7, 9, 0, Math.PI * 2); ctx.fill();
    const amp = lerp(0.026, 0.05, cam.b);
    drawFlag(FLAG.x, FLAG.y, FLAG.w, t, amp, zd);
  }

  function drawMotes(t, alpha) {
    if (alpha <= 0) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const m of motes) {
      const y = ((m.y - t * m.sp) % H + H) % H;
      const x = m.x + Math.sin(t * 0.6 + m.ph) * 22 * m.dr;
      const a = alpha * (0.25 + 0.35 * Math.sin(t * 1.7 + m.ph) ** 2);
      const g = ctx.createRadialGradient(x, y, 0, x, y, m.s * 3);
      g.addColorStop(0, `rgba(255,214,160,${a})`); g.addColorStop(1, 'rgba(255,214,160,0)');
      ctx.fillStyle = g; ctx.fillRect(x - m.s * 3, y - m.s * 3, m.s * 6, m.s * 6);
    }
    ctx.restore();
  }

  function drawFlare(cam, t) {
    const a = 0.9 * prog(t, 3.7, 4.9);
    if (a <= 0) return;
    const sp = toScreen(cam, 0.35, SUN.x, SUN.y);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const dx = W / 2 - sp.x, dy = H * 0.42 - sp.y;
    const spots = [[0.35, 26, 0.10], [0.7, 60, 0.05], [1.1, 16, 0.12], [1.5, 95, 0.035]];
    for (const [k, r, al] of spots) {
      const x = sp.x + dx * k, y = sp.y + dy * k;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(255,220,170,${al * a})`); g.addColorStop(0.7, `rgba(255,170,120,${al * a * 0.5})`); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  // ---------- legenda cinética (sincronizada com a narração estimada)
  // k = palavra-chave (amarela). Tempos em segundos; ajustar quando a narração for gravada.
  const CAPTIONS = [
    { end: 1.42, words: [['Você', 0.3], ['sabe', 0.55], ['o', 0.8], ['caminho', 0.92, 'k']] },
    { end: 2.52, words: [['que', 1.45], ['uma', 1.6], ['lei', 1.78, 'k'], ['faz', 2.05]] },
    { end: 4.45, words: [['até', 2.6], ['chegar', 2.85], ['na', 3.25], ['sua', 3.4, 'k'], ['vida?', 3.62, 'k']] },
    { end: 5.55, words: [['Em', 4.6], ['2', 4.82, 'k'], ['minutos', 5.02, 'k']] },
    { end: 6.6, words: [['eu', 5.58], ['te', 5.75], ['mostro.', 5.9, 'k']] },
  ];
  function drawCaptions(t) {
    const line = CAPTIONS.find(l => t >= l.words[0][1] - 0.05 && t < l.end + 0.2);
    if (!line) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const size = 96;
    ctx.font = `900 ${size}px Inter`;
    ctx.letterSpacing = '-1px';
    const space = size * 0.28, maxW = 900;
    const items = line.words.map(([w, at, k]) => ({ w: w.toUpperCase(), at, k, width: ctx.measureText(w.toUpperCase()).width }));
    const rows = [[]]; let rw = 0;
    for (const it of items) {
      if (rows[rows.length - 1].length && rw + space + it.width > maxW) { rows.push([]); rw = 0; }
      rw += (rows[rows.length - 1].length ? space : 0) + it.width;
      rows[rows.length - 1].push(it);
    }
    const out = prog(t, line.end, line.end + 0.18);
    const baseY = 1420 - (rows.length - 1) * size * 0.55 - out * 40;
    ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    rows.forEach((row, ri) => {
      const total = row.reduce((s, it) => s + it.width, 0) + space * (row.length - 1);
      let x = (W - total) / 2;
      const y = baseY + ri * size * 1.08;
      for (const it of row) {
        const p = prog(t, it.at, it.at + 0.22);
        if (p > 0) {
          const sc = lerp(0.45, 1, ease.back(p)) * (1 + 0.08 * Math.sin(Math.PI * prog(t, it.at + 0.1, it.at + 0.45)));
          const cx = x + it.width / 2;
          ctx.save();
          ctx.globalAlpha = clamp(p * 2) * (1 - out);
          ctx.translate(cx, y + (1 - ease.out(p)) * 30); ctx.scale(sc, sc);
          ctx.lineJoin = 'round'; ctx.lineWidth = 16; ctx.strokeStyle = 'rgba(2,6,20,0.92)';
          ctx.shadowColor = 'rgba(0,0,0,0.55)'; ctx.shadowBlur = 24; ctx.shadowOffsetY = 6;
          ctx.strokeText(it.w, -it.width / 2, 0);
          ctx.shadowColor = 'transparent';
          ctx.fillStyle = it.k ? C.yellow : '#FFFFFF';
          ctx.fillText(it.w, -it.width / 2, 0);
          ctx.restore();
        }
        x += it.width + space;
      }
    });
    ctx.letterSpacing = '0px';
  }

  // ---------- título + personagem "PL"
  function drawTitle(t) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
    const lines = [
      { text: 'COMO NASCE', y: 520, size: 118, color: '#FFFFFF', at: 6.3 },
      { text: 'UMA LEI', y: 690, size: 178, color: C.yellow, at: 6.55 },
    ];
    for (const L of lines) {
      ctx.font = `900 ${L.size}px "Inter Display"`;
      ctx.letterSpacing = '-3px';
      const chars = [...L.text];
      const widths = chars.map(ch => ctx.measureText(ch).width);
      const total = widths.reduce((a, b) => a + b, 0);
      let x = (W - total) / 2;
      chars.forEach((ch, i) => {
        const p = prog(t, L.at + i * 0.035, L.at + i * 0.035 + 0.4);
        if (p > 0) {
          ctx.save();
          ctx.globalAlpha = clamp(p * 1.6);
          ctx.translate(x, L.y + (1 - ease.outQuint(p)) * 70);
          ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 8;
          ctx.fillStyle = L.color; ctx.fillText(ch, 0, 0);
          ctx.restore();
        }
        x += widths[i];
      });
      L.total = total;
    }
    ctx.letterSpacing = '0px';
    // sublinhado verde desenhado
    const u = ease.inOut(prog(t, 6.95, 7.55));
    if (u > 0) {
      const x0 = (W - lines[1].total) / 2 - 10, x1 = (W + lines[1].total) / 2 + 10, y = 735;
      ctx.save();
      ctx.strokeStyle = C.greenLit; ctx.lineWidth = 16; ctx.lineCap = 'round';
      ctx.shadowColor = 'rgba(29,185,84,0.6)'; ctx.shadowBlur = 24;
      ctx.beginPath(); ctx.moveTo(x0, y); ctx.quadraticCurveTo((x0 + x1) / 2, y + 22, lerp(x0, x1, u), y - 4 * u);
      ctx.stroke(); ctx.restore();
    }
    // selo "em 2 minutos"
    const c = prog(t, 7.35, 7.75);
    if (c > 0) {
      ctx.save();
      ctx.font = '800 36px Inter'; ctx.letterSpacing = '3px';
      const label = 'EM 2 MINUTOS', tw = ctx.measureText(label).width;
      const pw = tw + 110, ph = 72, px = W / 2, py = 812;
      ctx.translate(px, py); ctx.scale(lerp(0.6, 1, ease.back(c)), lerp(0.6, 1, ease.back(c)));
      ctx.globalAlpha = clamp(c * 2);
      ctx.fillStyle = C.blue; ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.roundRect(-pw / 2, -ph / 2, pw, ph, ph / 2); ctx.fill(); ctx.stroke();
      // relógio
      const cx = -pw / 2 + 44;
      ctx.strokeStyle = C.yellow; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(cx, 0, 17, 0, Math.PI * 2); ctx.stroke();
      const hand = -Math.PI / 2 + t * 4;
      ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx + Math.cos(hand) * 11, Math.sin(hand) * 11); ctx.stroke();
      ctx.fillStyle = '#FFFFFF'; ctx.textBaseline = 'middle';
      ctx.fillText(label, cx + 32, 2);
      ctx.restore();
    }
  }

  function drawDoc(t) {
    const p = prog(t, 7.6, 8.5);
    if (p <= 0) return;
    const e = ease.back(p);
    const float = Math.sin((t - 8.5) * 2.2) * 8 * prog(t, 8.3, 8.9);
    const cx = 540, cy = lerp(-260, 1090, e) + float;
    const rot = lerp(0.55, -0.05, e) + Math.sin(t * 1.6) * 0.015;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.save();
    ctx.translate(cx, cy); ctx.rotate(rot); ctx.scale(1.05, 1.05);
    // halo
    const halo = ctx.createRadialGradient(0, 0, 40, 0, 0, 330);
    halo.addColorStop(0, `rgba(255,223,0,${0.28 * p})`); halo.addColorStop(1, 'rgba(255,223,0,0)');
    ctx.fillStyle = halo; ctx.fillRect(-340, -340, 680, 680);
    const w = 260, h = 340;
    ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 18;
    ctx.fillStyle = C.paper;
    ctx.beginPath();
    ctx.moveTo(-w / 2 + 18, -h / 2); ctx.lineTo(w / 2 - 46, -h / 2); ctx.lineTo(w / 2, -h / 2 + 46);
    ctx.lineTo(w / 2, h / 2 - 18); ctx.quadraticCurveTo(w / 2, h / 2, w / 2 - 18, h / 2);
    ctx.lineTo(-w / 2 + 18, h / 2); ctx.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - 18);
    ctx.lineTo(-w / 2, -h / 2 + 18); ctx.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + 18, -h / 2);
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.fillStyle = '#D9D6CB';
    ctx.beginPath(); ctx.moveTo(w / 2 - 46, -h / 2); ctx.lineTo(w / 2 - 46, -h / 2 + 46); ctx.lineTo(w / 2, -h / 2 + 46); ctx.fill();
    // cabeçalho
    ctx.fillStyle = C.green;
    ctx.beginPath(); ctx.roundRect(-w / 2 + 18, -h / 2 + 20, w - 82, 50, 10); ctx.fill();
    ctx.fillStyle = '#FFFFFF'; ctx.font = '800 17px Inter'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.letterSpacing = '1px';
    ctx.fillText('PROJETO DE LEI', -w / 2 + 18 + (w - 82) / 2, -h / 2 + 46);
    ctx.letterSpacing = '0px';
    ctx.fillStyle = C.ink; ctx.font = '900 34px Inter'; ctx.textAlign = 'left';
    ctx.fillText('Nº 1/2026', -w / 2 + 22, -h / 2 + 108);
    // linhas sendo "digitadas"
    const widths = [210, 186, 214, 150, 200, 120];
    widths.forEach((lw, i) => {
      const q = ease.out(prog(t, 8.35 + i * 0.12, 8.6 + i * 0.12));
      if (q <= 0) return;
      ctx.fillStyle = '#C7CBD6';
      ctx.beginPath(); ctx.roundRect(-w / 2 + 22, -h / 2 + 145 + i * 26, lw * q, 9, 4.5); ctx.fill();
    });
    // selo
    const sp = ease.back(prog(t, 9.0, 9.3));
    if (sp > 0) {
      ctx.save(); ctx.translate(w / 2 - 52, h / 2 - 50); ctx.scale(sp, sp); ctx.rotate(-0.2);
      ctx.fillStyle = C.yellow; ctx.strokeStyle = C.green; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.arc(0, 0, 32, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = C.blue; ctx.font = '900 24px Inter'; ctx.textAlign = 'center';
      ctx.fillText('PL', 0, 2);
      ctx.restore();
    }
    ctx.restore();
  }

  // ---------- quadro completo
  function render(t) {
    t = clamp(t, 0, DURATION);
    const cam = camera(t);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);

    drawSky(cam, t);
    drawSun(cam, t);
    drawCongress(cam, t);
    drawMastAndFlag(cam, t);
    drawFlare(cam, t);
    drawMotes(t, 0.9 * prog(t, 3.4, 5));

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    // brilho varrendo a bandeira no close
    const sw = prog(t, 0.35, 2.1);
    if (sw > 0 && sw < 1) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const x = lerp(-700, W + 700, ease.inOut(sw));
      const g = ctx.createLinearGradient(x - 260, 0, x + 260, 0);
      g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,240,0.16)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.translate(W / 2, H / 2); ctx.rotate(0.35); ctx.translate(-W / 2, -H / 2);
      ctx.fillStyle = g; ctx.fillRect(-800, -800, W + 1600, H + 1600);
      ctx.restore();
    }
    // escurece embaixo para a legenda
    const lg = ctx.createLinearGradient(0, 1050, 0, H);
    lg.addColorStop(0, 'rgba(0,0,0,0)'); lg.addColorStop(1, 'rgba(0,0,0,0.6)');
    ctx.fillStyle = lg; ctx.fillRect(0, 1050, W, H - 1050);

    drawTitle(t);
    drawDoc(t);
    drawCaptions(t);

    // vinheta + granulação + fade de entrada
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.28, W / 2, H / 2, H * 0.78);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.6)');
    ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 0.5;
    ctx.drawImage(grain[Math.floor(t * 30) % 4], 0, 0, W, H);
    ctx.globalAlpha = 1;
    const fin = 1 - prog(t, 0, 0.3);
    if (fin > 0) { ctx.fillStyle = `rgba(0,0,0,${fin})`; ctx.fillRect(0, 0, W, H); }
  }

  async function load() {
    const svg = window.FLAG_SVG.replace('<svg ', '<svg width="2800" height="1960" ');
    const img = new Image();
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    await img.decode();
    flagTex = document.createElement('canvas');
    flagTex.width = 2800; flagTex.height = 1960;
    flagTex.getContext('2d').drawImage(img, 0, 0, 2800, 1960);
    await Promise.all([
      document.fonts.load('900 100px Inter'), document.fonts.load('800 30px Inter'),
      document.fonts.load('900 100px "Inter Display"'),
    ]);
    buildSilhouette(); buildGrain(); buildParticles();
  }

  window.MOTION = { W, H, DURATION, canvas, render, ready: load() };
})();
