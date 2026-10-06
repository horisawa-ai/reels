// Legenda pequena: frases curtas num balão branco com contorno, palavra atual marcada.
(function () {
  const R = window.R;
  const { clamp, lerp, prog, ease } = R.U;
  const ctx = R.ctx;

  function chunks() {
    const out = [];
    R.BEATS.forEach((b, bi) => {
      let cur = [];
      const flush = () => { if (cur.length) out.push({ words: cur, beat: bi }); cur = []; };
      b.words.forEach((w, i) => {
        cur.push(w);
        const len = cur.map(x => x.w).join(' ').length;
        if (/[.?!:…]$/.test(w.w) || (/,$/.test(w.w) && len > 12) || len > 24) flush();
      });
      flush();
    });
    out.forEach((c, i) => {
      c.start = c.words[0].t - 0.05;
      const next = out[i + 1];
      const beatEnd = R.BEATS[c.beat].end + 0.35;
      c.end = next && next.beat === c.beat ? next.words[0].t - 0.05 : beatEnd;
    });
    return out;
  }
  let CH = null;

  R.drawCaptions = function (t) {
    if (!CH) CH = chunks();
    const c = CH.find(x => t >= x.start && t < x.end);
    if (!c) return;
    R.screen();
    const size = 44, maxW = 860, pad = 26, gap = 13;
    ctx.font = `700 ${size}px Inter`; ctx.letterSpacing = '0px';
    const ws = c.words.map(w => ({ ...w, width: ctx.measureText(w.w).width }));
    const rows = [[]]; let rw = 0;
    for (const w of ws) {
      if (rows[rows.length - 1].length && rw + gap + w.width > maxW - pad * 2) { rows.push([]); rw = 0; }
      rw += (rows[rows.length - 1].length ? gap : 0) + w.width;
      rows[rows.length - 1].push(w);
    }
    const lineH = size * 1.3;
    const rowW = rows.map(r => r.reduce((s, w) => s + w.width, 0) + gap * (r.length - 1));
    const boxW = Math.max(...rowW) + pad * 2, boxH = rows.length * lineH + 26;
    const cy = 1462;
    const pin = ease.back(prog(t, c.start, c.start + 0.22));
    const pout = prog(t, c.end - 0.12, c.end);
    ctx.save();
    ctx.globalAlpha = clamp(pin * 2) * (1 - pout);
    ctx.translate(540, cy); ctx.scale(lerp(0.92, 1, pin), lerp(0.92, 1, pin));
    ctx.fillStyle = 'rgba(43,42,46,0.16)';
    ctx.beginPath(); ctx.roundRect(-boxW / 2 + 5, -boxH / 2 + 7, boxW, boxH, 22); ctx.fill();
    ctx.fillStyle = R.PAL.paper; ctx.strokeStyle = R.PAL.line; ctx.lineWidth = 3.5;
    ctx.beginPath(); ctx.roundRect(-boxW / 2, -boxH / 2, boxW, boxH, 22); ctx.fill(); ctx.stroke();
    ctx.textBaseline = 'middle';
    rows.forEach((r, ri) => {
      let x = -rowW[ri] / 2;
      const y = -boxH / 2 + 13 + lineH * (ri + 0.5);
      for (const w of r) {
        const active = t >= w.t && t < w.end + 0.08;
        if (active) {
          ctx.fillStyle = R.PAL.mustard;
          ctx.beginPath(); ctx.roundRect(x - 6, y - size * 0.55, w.width + 12, size * 1.1, 9); ctx.fill();
        }
        ctx.fillStyle = R.PAL.ink;
        ctx.fillText(w.w, x, y + 1);
        x += w.width + gap;
      }
    });
    ctx.restore();
  };
})();
