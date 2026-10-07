// Motor isométrico: projeção, câmera e primitivas desenhadas em traço grosso.
// Coordenadas do mundo: x e y no chão, z para cima. Na tela: X = x - y, Y = (x + y) / 2 - z.
(function () {
  const R = (window.R = window.R || {});
  const W = 1080, H = 1920;
  R.W = W; R.H = H;

  // ---------- utilidades
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const lerp = (a, b, t) => a + (b - a) * t;
  const prog = (t, a, b) => clamp((t - a) / (b - a));
  const ease = {
    inOut: x => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
    out: x => 1 - Math.pow(1 - x, 3),
    outQuint: x => 1 - Math.pow(1 - x, 5),
    in: x => x * x * x,
    back: x => { const c1 = 1.7, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); },
  };
  function rng(seed) {
    return () => {
      seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  // pulso 0→1→0 entre a e b
  const pulse = (t, a, b) => Math.sin(Math.PI * prog(t, a, b));
  R.U = { clamp, lerp, prog, ease, rng, pulse };

  const canvas = document.getElementById('stage');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  R.canvas = canvas; R.ctx = ctx;

  function toRGB(c) {
    if (c[0] === '#') { const n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
    return c.match(/[\d.]+/g).slice(0, 3).map(Number);
  }
  function shade(c, f) {
    const [r, g, b] = toRGB(c);
    const k = v => Math.min(255, Math.round(v * f));
    return `rgb(${k(r)},${k(g)},${k(b)})`;
  }
  R.shade = shade;

  // ---------- câmera
  const cam = { fx: 0, fy: 0, zoom: 1, cx: W / 2, cy: H / 2 };
  R.cam = cam;
  const P = (x, y, z = 0) => ({ X: x - y, Y: (x + y) / 2 - z });
  const S = (x, y, z = 0) => {
    const p = P(x, y, z);
    return { x: (p.X - cam.fx) * cam.zoom + cam.cx, y: (p.Y - cam.fy) * cam.zoom + cam.cy };
  };
  R.P = P; R.S = S;
  R.world = () => ctx.setTransform(cam.zoom, 0, 0, cam.zoom, cam.cx - cam.fx * cam.zoom, cam.cy - cam.fy * cam.zoom);
  R.screen = () => ctx.setTransform(1, 0, 0, 1, 0, 0);

  // ---------- acabamentos (?s=line|soft|flat|thin)
  const STYLES = {
    line: { lw: 2.4, grad: false, rim: false, shadow: false, pattern: true },
    thin: { lw: 1.1, line: 'rgba(9,12,11,0.6)', grad: true, rim: true, shadow: true, pattern: true },
    soft: { lw: 0, grad: true, rim: true, shadow: true, pattern: false, gloss: true, bright: 1.1, soft: 1.8 },
    flat: { lw: 0, grad: false, rim: true, shadow: 'long', pattern: false, sides: [0.82, 0.62] },
  };
  R.STYLE_NAME = new URLSearchParams(location.search).get('s') || 'flat'; // escolhido: flat geométrico
  R.STYLE = STYLES[R.STYLE_NAME] || STYLES.line;

  // ---------- primitivas
  const LW = 2.4;
  function ink(w = LW) {
    const st = R.STYLE;
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    if (!st.lw) { ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(0,0,0,0)'; return; }
    ctx.lineWidth = w * st.lw / LW; ctx.strokeStyle = st.line || R.PAL.line;
  }
  // traço estrutural (hastes, fios): aparece em qualquer acabamento
  function inkForce(w = LW, color) {
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.lineWidth = R.STYLE.lw ? w : w * 0.8; ctx.strokeStyle = color || (R.STYLE.lw ? R.PAL.line : '#B9B2A2');
  }
  function poly(pts) {
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(p.X, p.Y) : ctx.moveTo(p.X, p.Y)));
    ctx.closePath();
  }
  function face(pts, fill, kind) {
    poly(pts);
    if (R.STYLE.grad && kind) {
      let y0 = Infinity, y1 = -Infinity;
      for (const p of pts) { y0 = Math.min(y0, p.Y); y1 = Math.max(y1, p.Y); }
      const g = ctx.createLinearGradient(0, y0, 0, y1 + 0.01);
      if (kind === 'top') { g.addColorStop(0, shade(fill, 1.08)); g.addColorStop(1, shade(fill, 0.97)); }
      else { g.addColorStop(0, shade(fill, 1.02)); g.addColorStop(1, shade(fill, 0.8)); }
      ctx.fillStyle = g;
    } else ctx.fillStyle = fill;
    ctx.fill(); ink(); ctx.stroke();
  }
  // sombra de contato no chão (acabamentos suave/flat/fino)
  function contactShadow(x, y, z, w, d, o = {}) {
    if (!R.STYLE.shadow || o.noShadow) return;
    if (R.STYLE.shadow === 'long') {
      const h = o.h || 20, sx = h * 0.9, sy = h * 0.1;
      const q = [[x, y], [x + w, y], [x + w, y + d], [x, y + d]];
      ctx.save(); ctx.beginPath();
      const quad = pts => { pts.forEach((p, i) => (i ? ctx.lineTo(p.X, p.Y) : ctx.moveTo(p.X, p.Y))); ctx.closePath(); };
      quad(q.map(([a, b]) => P(a, b, z))); quad(q.map(([a, b]) => P(a + sx, b + sy, z)));
      for (let i = 0; i < 4; i++) {
        const [a, b] = q[i], [c, e2] = q[(i + 1) % 4];
        quad([P(a, b, z), P(c, e2, z), P(c + sx, e2 + sy, z), P(a + sx, b + sy, z)]);
      }
      ctx.fillStyle = 'rgba(0,0,0,0.26)'; ctx.fill('nonzero'); ctx.restore();
      return;
    }
    const e = 3 * (R.STYLE.soft || 1);
    const pts = [P(x - e + 5, y - e + 2, z), P(x + w + e + 7, y - e + 2, z), P(x + w + e + 7, y + d + e + 6, z), P(x - e + 5, y + d + e + 6, z)];
    ctx.save();
    ctx.filter = `blur(${Math.max(1, 5 * (R.STYLE.soft || 1) * R.cam.zoom)}px)`;
    poly(pts); ctx.fillStyle = 'rgba(0,0,0,0.34)'; ctx.fill();
    ctx.restore();
  }
  function rim(pts, a = 0.38) {
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = `rgba(255,250,236,${a})`; ctx.lineWidth = 1.4;
    ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p.X, p.Y) : ctx.moveTo(p.X, p.Y))); ctx.stroke();
    ctx.restore();
  }

  // caixa: w ao longo de x, d ao longo de y, h para cima
  function box(x, y, z, w, d, h, color, o = {}) {
    const top = [P(x, y, z + h), P(x + w, y, z + h), P(x + w, y + d, z + h), P(x, y + d, z + h)];
    const left = [P(x, y + d, z + h), P(x + w, y + d, z + h), P(x + w, y + d, z), P(x, y + d, z)];
    const right = [P(x + w, y, z + h), P(x + w, y + d, z + h), P(x + w, y + d, z), P(x + w, y, z)];
    contactShadow(x, y, z, w, d, Object.assign({ h }, o));
    if (R.STYLE.bright && !o.noShadow) color = shade(color, R.STYLE.bright);
    const sd = R.STYLE.sides || [0.88, 0.76];
    face(left, o.left || shade(color, sd[0]), 'side');
    face(right, o.right || shade(color, sd[1]), 'side');
    face(top, o.top || color, 'top');
    if (R.STYLE.rim) {
      rim([P(x, y + d, z + h), P(x + w, y + d, z + h), P(x + w, y, z + h)]);
      rim([P(x + w, y + d, z + h), P(x + w, y + d, z)], 0.14);
    }
  }

  // desenha conteúdo 2D sobre uma face. Origem = canto superior esquerdo da face.
  // 'left' = face +y (u ao longo de +x), 'right' = face +x (u ao longo de -y), 'top' (u +x, v +y)
  function onFace(side, x, y, z, fn) {
    const o = P(x, y, z);
    ctx.save();
    if (side === 'left') ctx.transform(1, 0.5, 0, 1, o.X, o.Y);
    else if (side === 'right') ctx.transform(1, -0.5, 0, 1, o.X, o.Y);
    else ctx.transform(1, 0.5, -1, 0.5, o.X, o.Y);
    fn(ctx);
    ctx.restore();
  }

  // tronco de cone vertical (cilindro quando rb == rt); bulge > 0 curva as laterais (cuia)
  function frustum(x, y, z, rb, rt, h, color, o = {}) {
    const b = P(x, y, z), t = P(x, y, z + h);
    const rxb = rb * Math.SQRT2, ryb = rxb / 2, rxt = rt * Math.SQRT2, ryt = rxt / 2;
    const bulge = o.bulge || 0;
    if (R.STYLE.shadow === 'long' && !o.noShadow) {
      const s2 = P(x + h * 0.9, y + h * 0.1, z), rr = Math.max(rxb, rxt);
      ctx.save(); ctx.fillStyle = 'rgba(0,0,0,0.26)'; ctx.beginPath();
      ctx.ellipse(b.X, b.Y, rr, rr / 2, 0, 0, Math.PI * 2);
      ctx.moveTo(s2.X + rr, s2.Y); ctx.ellipse(s2.X, s2.Y, rr, rr / 2, 0, 0, Math.PI * 2);
      ctx.moveTo(b.X, b.Y - rr / 2); ctx.lineTo(s2.X, s2.Y - rr / 2); ctx.lineTo(s2.X, s2.Y + rr / 2); ctx.lineTo(b.X, b.Y + rr / 2); ctx.closePath();
      ctx.fill('nonzero'); ctx.restore();
    } else if (R.STYLE.shadow && !o.noShadow) {
      const k = R.STYLE.soft || 1;
      ctx.save(); ctx.filter = `blur(${Math.max(1, 5 * k * R.cam.zoom)}px)`;
      ctx.fillStyle = 'rgba(0,0,0,0.34)';
      ctx.beginPath(); ctx.ellipse(b.X + 5 * k, b.Y + 3 * k, rxb + 4 * k, ryb + 3 * k, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    if (R.STYLE.bright) color = shade(color, R.STYLE.bright);
    const g = ctx.createLinearGradient(t.X - rxt, 0, t.X + rxt, 0);
    g.addColorStop(0, shade(color, 0.95)); g.addColorStop(0.55, shade(color, 0.86)); g.addColorStop(1, shade(color, 0.7));
    ctx.beginPath();
    ctx.moveTo(t.X - rxt, t.Y);
    ctx.quadraticCurveTo(lerp(t.X - rxt, b.X - rxb, 0.5) - bulge, lerp(t.Y, b.Y, 0.5) + bulge * 0.6, b.X - rxb, b.Y);
    ctx.ellipse(b.X, b.Y, rxb, ryb, 0, Math.PI, 0, true);
    ctx.quadraticCurveTo(lerp(t.X + rxt, b.X + rxb, 0.5) + bulge, lerp(t.Y, b.Y, 0.5) + bulge * 0.6, t.X + rxt, t.Y);
    ctx.ellipse(t.X, t.Y, rxt, ryt, 0, 0, Math.PI, false);
    ctx.closePath();
    ctx.fillStyle = g; ctx.fill(); ink(); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(t.X, t.Y, rxt, ryt, 0, 0, Math.PI * 2);
    ctx.fillStyle = o.top || shade(color, o.hollow ? 0.84 : 1); ctx.fill(); ink(); ctx.stroke();
    if (R.STYLE.rim) { ctx.save(); ctx.strokeStyle = 'rgba(255,250,236,0.35)'; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.ellipse(t.X, t.Y, rxt, ryt, 0, 0.15, Math.PI - 0.15); ctx.stroke(); ctx.restore(); }
    if (o.hollow) {
      ctx.save(); ctx.beginPath(); ctx.ellipse(t.X, t.Y, rxt, ryt, 0, 0, Math.PI * 2); ctx.clip();
      ctx.fillStyle = shade(color, 0.7);
      ctx.beginPath(); ctx.ellipse(t.X, t.Y - ryt * 0.35, rxt * 0.95, ryt * 0.8, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      ctx.beginPath(); ctx.ellipse(t.X, t.Y, rxt, ryt, 0, 0, Math.PI * 2); ink(); ctx.stroke();
    }
  }
  const cyl = (x, y, z, r, h, color, o) => frustum(x, y, z, r, r, h, color, o);

  // cúpula (meia esfera achatada)
  function dome(x, y, z, r, h, color) {
    const b = P(x, y, z);
    const rx = r * Math.SQRT2, ry = rx / 2;
    const g = ctx.createRadialGradient(b.X - rx * 0.35, b.Y - h * 0.8, 4, b.X, b.Y - h * 0.3, rx * 1.2);
    g.addColorStop(0, shade(color, 1)); g.addColorStop(1, shade(color, 0.72));
    ctx.beginPath();
    ctx.ellipse(b.X, b.Y, rx, h + ry * 0.0, 0, Math.PI, 0);
    ctx.ellipse(b.X, b.Y, rx, ry, 0, 0, Math.PI, false);
    ctx.closePath(); ctx.fillStyle = g; ctx.fill(); ink(); ctx.stroke();
  }

  function sphere(x, y, z, r, color) {
    const c = P(x, y, z);
    if (R.STYLE.bright) color = shade(color, R.STYLE.bright);
    const g = ctx.createRadialGradient(c.X - r * 0.35, c.Y - r * 0.4, r * 0.1, c.X, c.Y, r);
    g.addColorStop(0, shade(color, 1)); g.addColorStop(1, shade(color, 0.8));
    ctx.beginPath(); ctx.arc(c.X, c.Y, r, 0, Math.PI * 2); ctx.fillStyle = g; ctx.fill(); ink(); ctx.stroke();
    if (R.STYLE.gloss) {
      ctx.fillStyle = 'rgba(255,255,255,0.22)';
      ctx.beginPath(); ctx.ellipse(c.X - r * 0.32, c.Y - r * 0.38, r * 0.38, r * 0.24, -0.5, 0, Math.PI * 2); ctx.fill();
    }
  }

  // lâmpada: acesa = 0..1
  function lamp(x, y, z, on, r = 7) {
    const c = P(x, y, z);
    if (on > 0) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(c.X, c.Y, 0, c.X, c.Y, r * 5);
      g.addColorStop(0, `rgba(${R.PAL.glow},${0.55 * on})`); g.addColorStop(1, `rgba(${R.PAL.glow},0)`);
      ctx.fillStyle = g; ctx.fillRect(c.X - r * 5, c.Y - r * 5, r * 10, r * 10);
      ctx.restore();
    }
    ctx.beginPath(); ctx.arc(c.X, c.Y, r, 0, Math.PI * 2);
    ctx.fillStyle = on > 0.5 ? R.PAL.lampOn : R.PAL.lampOff; ctx.fill(); ink(2.6); ctx.stroke();
    ctx.beginPath(); ctx.arc(c.X - r * 0.3, c.Y - r * 0.35, r * 0.28, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.fill();
  }

  // folha de papel "em pé", virada para a câmera (coordenadas de tela do mundo)
  function sheet(X, Y, sc = 1, rot = 0, o = {}) {
    ctx.save();
    ctx.translate(X, Y); ctx.rotate(rot); ctx.scale(sc, sc);
    const w = 34, h = 44;
    if (o.glow) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(0, -h / 2, 0, 0, -h / 2, 70);
      g.addColorStop(0, `rgba(${R.PAL.glow},${0.5 * o.glow})`); g.addColorStop(1, `rgba(${R.PAL.glow},0)`);
      ctx.fillStyle = g; ctx.fillRect(-70, -h / 2 - 70, 140, 140);
      ctx.restore();
    }
    ctx.beginPath();
    ctx.moveTo(-w / 2, -h); ctx.lineTo(w / 2 - 9, -h); ctx.lineTo(w / 2, -h + 9); ctx.lineTo(w / 2, 0); ctx.lineTo(-w / 2, 0); ctx.closePath();
    ctx.fillStyle = R.PAL.paper; ctx.fill(); ink(2.6); ctx.stroke();
    ctx.fillStyle = 'rgba(43,42,46,0.35)';
    const lines = o.lines == null ? 4 : o.lines;
    for (let i = 0; i < lines; i++) ctx.fillRect(-w / 2 + 6, -h + 12 + i * 7, (i % 2 ? 16 : 22), 2.6);
    if (o.tag) {
      ctx.fillStyle = R.PAL.mustard;
      ctx.beginPath(); ctx.roundRect(-w / 2 + 4, -12, 20, 9, 2); ctx.fill();
      ctx.fillStyle = R.PAL.ink; ctx.font = '800 7px Inter'; ctx.textBaseline = 'middle';
      ctx.fillText(o.tag, -w / 2 + 6, -7.2);
    }
    if (o.mark) { // marquinhas de emenda
      ctx.strokeStyle = R.PAL.slate; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-8, -h + 19); ctx.lineTo(8, -h + 15); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-10, -h + 33); ctx.lineTo(4, -h + 30); ctx.stroke();
    }
    if (o.check) {
      ctx.strokeStyle = R.PAL.ok; ctx.lineWidth = 3.4;
      ctx.beginPath(); ctx.moveTo(2, -10); ctx.lineTo(6, -6); ctx.lineTo(13, -15); ctx.stroke();
    }
    ctx.restore();
  }

  R.draw = { ink, inkForce, poly, face, box, contactShadow, onFace, frustum, cyl, dome, sphere, lamp, sheet };

  // ---------- rótulos em tela (tamanho fixo, não sofrem zoom)
  // Balões com hora de entrada (o.at) passam por uma fila: quando um balão mais novo
  // já entrou, os anteriores somem (só um balão por vez na tela).
  let labelQueue = null;
  R.beginLabels = () => { labelQueue = []; };
  R.flushLabels = t => {
    const q = labelQueue; labelQueue = null;
    if (!q) return;
    for (const l of q) {
      if (l.p <= 0) continue;
      let k = 1;
      for (const m of q) if (m !== l && m.o.at > l.o.at && t >= m.o.at) k = Math.min(k, 1 - prog(t, m.o.at, m.o.at + 0.15));
      if (k > 0) {
        if (R.LABEL_LOG && !(l.text in R.LABEL_LOG)) R.LABEL_LOG[l.text] = l.o.at; // usado pelo desenho de som
        pill(l.x, l.y, l.text, l.p, Object.assign({}, l.o, { at: undefined, alpha: (l.o.alpha == null ? 1 : l.o.alpha) * k }));
      }
    }
  };
  function pill(x, y, text, p, o = {}) {
    if (labelQueue && o.at != null) { labelQueue.push({ x, y, text, p, o }); return; }
    if (p <= 0) return;
    const size = o.size || 26;
    ctx.save();
    ctx.font = `800 ${size}px Inter`; ctx.letterSpacing = '1.5px';
    const tw = ctx.measureText(text).width;
    const w = tw + size * 1.2, h = size * 1.75;
    const s = lerp(0.5, 1, ease.back(clamp(p)));
    ctx.translate(x, y - (o.anchorBottom ? h / 2 + 14 : 0)); ctx.scale(s, s);
    ctx.globalAlpha = clamp(p * 2) * (o.alpha == null ? 1 : o.alpha);
    if (o.anchorBottom) { // ponteirinho
      ctx.fillStyle = R.PAL.line;
      ctx.beginPath(); ctx.moveTo(-8, h / 2 - 1); ctx.lineTo(8, h / 2 - 1); ctx.lineTo(0, h / 2 + 12); ctx.fill();
    }
    ctx.fillStyle = o.fill || R.PAL.paper; ctx.strokeStyle = R.PAL.line; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, h / 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = o.color || R.PAL.ink; ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
    ctx.fillText(text, 0, 1.5);
    ctx.restore();
  }
  R.pill = pill;
})();
