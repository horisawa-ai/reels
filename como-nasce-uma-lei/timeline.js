// Tempos da narração e da câmera. Quando a narração for gravada, ajuste start/end
// de cada trecho (e, se precisar, os tempos por palavra em WORD_FIX).
(function () {
  const R = window.R;
  const { clamp } = R.U;

  R.BEATS = [
    { start: 2.9, end: 13.6, text: 'Todo mundo vota pra deputado, senador, presidente… Mas pouca gente sabe como as coisas funcionam lá dentro. Você sabe o que é preciso pra uma lei sair do papel? Vem que eu te mostro.' },
    { start: 14.3, end: 28.0, text: 'Tudo começa com um projeto de lei. Quem pode propor? Deputados, senadores, o Presidente, o STF, tribunais superiores, a Procuradoria-Geral… e até você: com a assinatura de 1% dos eleitores, em pelo menos 5 estados.' },
    { start: 29.8, end: 43.0, text: 'Se o projeto vem de fora do Congresso, ele começa pela Câmara dos Deputados. Lá, passa pelas comissões: um relator estuda, dá parecer, propõe mudanças. E a CCJ confere se ele respeita a Constituição.' },
  ];
  R.DURATION = 46.8;
  R.INTRO_END = 2.6; // intro: maquete se monta + título, sem narração

  // tempo de cada palavra: proporcional ao tamanho, com pausas na pontuação
  for (const b of R.BEATS) {
    const words = b.text.split(/\s+/);
    const weights = words.map(w => w.replace(/[^\p{L}\p{N}%]/gu, '').length + 2.2);
    const pauses = words.map(w => (/[.?!:…]$/.test(w) ? 5 : /,$/.test(w) ? 2.2 : 0));
    const total = weights.reduce((a, c, i) => a + c + pauses[i], 0) - pauses[pauses.length - 1];
    let acc = 0;
    b.words = words.map((w, i) => {
      const t = b.start + (acc / total) * (b.end - b.start);
      acc += weights[i] + pauses[i];
      return { w, t, end: b.start + ((acc - pauses[i]) / total) * (b.end - b.start) };
    });
  }

  // R.T.w(trecho, 'início da palavra', ocorrência) → segundos
  R.T = {
    w(beat, prefix, occ = 1) {
      const p = prefix.toLowerCase();
      let n = 0;
      for (const x of R.BEATS[beat].words) {
        if (x.w.toLowerCase().replace(/^[^\p{L}\p{N}]+/u, '').startsWith(p) && ++n === occ) return x.t;
      }
      console.warn('palavra não encontrada', beat, prefix);
      return R.BEATS[beat].start;
    },
    beat: i => R.BEATS[i],
  };

  // ---------- câmera: keyframes {t, at: alvo, zoom, sy (altura na tela do alvo)}
  // alvos são definidos em world.js (R.FOCUS); 'all' = maquete inteira
  R.cameraKeys = () => {
    const T = R.T;
    const k = [];
    const key = (t, at, zoom, o = {}) => k.push({ t, at, zoom, sy: o.sy ?? 900, dx: o.dx || 0, dy: o.dy || 0 });
    // abertura: perto da votação → abre para o todo → entra na estação 1
    key(0, 'all', 0.35, { sy: 1180 });
    key(R.INTRO_END - 0.2, 'all', 0.39, { sy: 1160 });
    key(R.INTRO_END + 1.1, 'vote', 1.55, { sy: 980 });
    key(T.w(0, 'Mas') - 0.2, 'vote', 1.7, { sy: 980 });
    key(T.w(0, 'dentro') + 0.4, 'all', 0.45, { sy: 990 });
    key(T.w(0, 'Vem') - 0.1, 'all', 0.47, { sy: 990 });
    key(T.w(1, 'Tudo') + 0.3, 's1', 1.45);
    key(T.w(1, 'Deputados') - 0.2, 's1', 1.5, { dx: -40, dy: 20 });
    key(T.w(1, 'você'), 's1', 1.52, { dx: 20, dy: -50 });
    key(T.w(1, 'estados') + 0.4, 's1', 1.5, { dx: 10, dy: -30 });
    key(R.BEATS[1].end + 0.3, 's1', 1.42);
    // transição contínua: zoom out total → zoom in na estação 2
    key(R.BEATS[1].end + 1.5, 'all', 0.46, { sy: 990 });
    key(R.BEATS[1].end + 2.2, 'all', 0.47, { sy: 990 });
    key(T.w(2, 'Câmara') - 0.4, 's2', 1.45);
    key(T.w(2, 'relator') - 0.3, 's2', 1.6, { dx: -60, dy: -10 });
    key(T.w(2, 'mudanças') + 0.4, 's2', 1.6, { dx: 0, dy: -10 });
    key(T.w(2, 'CCJ') + 0.2, 's2', 1.62, { dx: 70, dy: 30 });
    key(R.BEATS[2].end + 0.4, 's2', 1.5, { dx: 40, dy: 20 });
    key(R.BEATS[2].end + 1.8, 'all', 0.46, { sy: 990 });
    key(R.DURATION, 'all', 0.47, { sy: 990 });
    return k;
  };
  R.U.timeClamp = clamp;
})();
