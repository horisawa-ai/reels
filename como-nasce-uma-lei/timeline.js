// Tempos da narração e da câmera.
// Sem áudio: cada trecho dura (palavras / RATE) segundos. Com o áudio gravado, preencha SYNC com
// [início, fim] de cada trecho (em segundos) e, se quiser precisão por palavra, WORD_FIX.
(function () {
  const R = window.R;
  const { clamp } = R.U;

  // texto conferido (ROTEIRO.md) — um item por bloco da narração
  const TEXTS = [
    'Todo mundo vota pra deputado, senador, presidente… Mas pouca gente sabe como as coisas funcionam lá dentro. Você sabe como uma ideia vira lei? Vem que eu te mostro.',
    'Tudo começa com um projeto de lei. Quem pode propor? Deputados, senadores, o Presidente da República; o STF, os tribunais superiores e o Procurador-Geral da República, nos assuntos de cada um… e até você: com a assinatura de 1% dos eleitores do país, espalhados em pelo menos cinco estados.',
    'Projetos do Presidente, do STF, dos tribunais superiores e da população começam pela Câmara dos Deputados. Lá, passam pelas comissões: um relator estuda, dá parecer e pode propor mudanças. E a CCJ confere se o projeto respeita a Constituição.',
    'Muitas vezes, as próprias comissões já aprovam o projeto, sem passar pelo plenário. Em outros casos, ele vai ao plenário, e precisa da maioria dos votos, com mais da metade dos 513 deputados presentes.',
    'Aprovado, ele segue para o Senado, que revisa. Se aprovar, vai para o Presidente. Se rejeitar, é arquivado. Se mudar o texto, volta para a Câmara, que decide se aceita as mudanças.',
    'O Presidente tem 15 dias úteis para sancionar ou vetar, no todo ou em parte. Se ficar em silêncio, é sanção tácita. E o veto não é o fim: o Congresso pode derrubá-lo com a maioria absoluta dos deputados e dos senadores.',
    'Por fim, a lei é promulgada e publicada no Diário Oficial. E só então passa a valer: na data que o próprio texto diz ou, se ele não disser nada, 45 dias depois.',
    'Agora você sabe como uma ideia vira lei. Salva esse vídeo e manda pra quem precisa entender isso.',
  ];
  R.INTRO_END = 3.4; // intro: maquete se monta, câmera visita o Congresso + título, sem narração

  // tempos reais do áudio: [[início, fim], ...] por trecho (vazio = estimado)
  const SYNC = [];
  const WORD_FIX = {}; // ex.: { '4:Senado': 61.2 } força o tempo de uma palavra
  const RATE = 2.6, GAP = 0.6;
  let t0 = R.INTRO_END + 0.3;
  R.BEATS = TEXTS.map((text, i) => {
    const n = text.split(/\s+/).length;
    const [start, end] = SYNC[i] || [t0, t0 + n / RATE];
    t0 = end + GAP;
    return { start, end, text };
  });
  R.DURATION = R.BEATS[R.BEATS.length - 1].end + 2.4;

  // tempo de cada palavra: proporcional ao tamanho, com pausas na pontuação
  R.BEATS.forEach((b, bi) => {
    const words = b.text.split(/\s+/);
    const weights = words.map(w => w.replace(/[^\p{L}\p{N}%]/gu, '').length + 2.2);
    const pauses = words.map(w => (/[.?!:…;]$/.test(w) ? 5 : /,$/.test(w) ? 2.2 : 0));
    const total = weights.reduce((a, c, i) => a + c + pauses[i], 0) - pauses[pauses.length - 1];
    let acc = 0;
    b.words = words.map((w, i) => {
      let t = b.start + (acc / total) * (b.end - b.start);
      acc += weights[i] + pauses[i];
      const key = `${bi}:${w.replace(/[^\p{L}\p{N}%-]/gu, '')}`;
      if (WORD_FIX[key] != null) t = WORD_FIX[key];
      return { w, t, end: b.start + ((acc - pauses[i]) / total) * (b.end - b.start) };
    });
  });

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
    const T = R.T, B = R.BEATS;
    const k = [];
    const key = (t, at, zoom, o = {}) => k.push({ t, at, zoom, sy: o.sy ?? 900, dx: o.dx || 0, dy: o.dy || 0 });
    const OUT = (t, hold = 0.6) => { key(t, 'all', 0.42, { sy: 1000 }); key(t + hold, 'all', 0.43, { sy: 1000 }); };

    // intro: maquete se monta → Congresso → votação
    key(0, 'all', 0.345, { sy: 1270 });
    key(1.5, 'all', 0.37, { sy: 1260 });
    key(2.6, 'cn', 1.8, { sy: 1180 });
    key(R.INTRO_END, 'cn', 1.92, { sy: 1170, dx: 14 });
    key(R.INTRO_END + 1.15, 'vote', 1.55, { sy: 980 });
    // 1 · gancho
    key(T.w(0, 'Mas') - 0.2, 'vote', 1.7, { sy: 980 });
    OUT(T.w(0, 'dentro') + 0.4, T.w(0, 'Vem') - T.w(0, 'dentro') - 0.5);
    // 2 · quem propõe
    key(T.w(1, 'Tudo') + 0.3, 's1', 1.45);
    key(T.w(1, 'Deputados') - 0.2, 's1', 1.5, { dx: -40, dy: 20 });
    key(T.w(1, 'você'), 's1', 1.52, { dx: 20, dy: -50 });
    key(T.w(1, 'estados') + 0.4, 's1', 1.5, { dx: 10, dy: -30 });
    key(B[1].end + 0.3, 's1', 1.42);
    // 3 · Câmara e comissões
    OUT(B[1].end + 1.5, 0.5);
    key(T.w(2, 'Câmara') - 0.1, 's2', 1.45);
    key(T.w(2, 'relator') - 0.3, 's2', 1.6, { dx: -60, dy: -10 });
    key(T.w(2, 'mudanças') + 0.3, 's2', 1.6, { dx: 0, dy: -10 });
    key(T.w(2, 'CCJ') + 0.2, 's2', 1.62, { dx: 70, dy: 30 });
    key(B[2].end + 0.3, 's2', 1.5, { dx: 40, dy: 20 });
    // 4 · comissões aprovam (visão geral com o atalho) → plenário
    key(T.w(3, 'aprovam'), 'all', 0.42, { sy: 1000 });
    key(T.w(3, 'outros') - 0.1, 'all', 0.43, { sy: 1000 });
    key(T.w(3, 'plenário', 2) + 0.5, 's3', 1.5);
    key(T.w(3, 'metade') - 0.2, 's3', 1.58, { dx: -40, dy: 30 });
    key(B[3].end + 0.3, 's3', 1.5, { dx: -20, dy: 20 });
    // 5 · Senado
    OUT(B[3].end + 1.5, 0.4);
    key(T.w(4, 'Senado') + 0.5, 's4', 1.5);
    key(T.w(4, 'rejeitar') - 0.1, 's4', 1.55, { dx: 60, dy: -30 });
    key(T.w(4, 'mudar') - 0.1, 's4', 1.5, { dx: 10, dy: -60 });
    key(B[4].end + 0.2, 's4', 1.45);
    // 6 · sanção ou veto
    OUT(B[4].end + 1.4, 0.4);
    key(T.w(5, 'Presidente') + 0.6, 's5', 1.5);
    key(T.w(5, 'dias') + 0.2, 's5', 1.6, { dx: 50, dy: -20 });
    key(T.w(5, 'silêncio'), 's5', 1.55, { dx: 20, dy: -10 });
    key(T.w(5, 'Congresso') - 0.1, 's5', 1.55, { dx: -70, dy: 40 });
    key(B[5].end + 0.2, 's5', 1.5, { dx: -40, dy: 30 });
    // 7 · publicação
    OUT(B[5].end + 1.4, 0.3);
    key(T.w(6, 'publicada') + 0.2, 's6', 1.5);
    key(T.w(6, 'data') - 0.2, 's6', 1.58, { dx: -60, dy: -20 });
    key(B[6].end + 0.2, 's6', 1.55, { dx: -40, dy: -10 });
    // 8 · fechamento: maquete inteira acesa
    key(T.w(7, 'Agora') + 1.2, 'all', 0.355, { sy: 1240 });
    key(R.DURATION, 'all', 0.365, { sy: 1235 });
    return k;
  };
  R.U.timeClamp = clamp;
})();
