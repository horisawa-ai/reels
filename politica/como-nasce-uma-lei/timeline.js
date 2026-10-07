// Tempos da narração e da câmera, sincronizados com a narração gravada.
// O áudio (fora do git: o repositório é público) entra no render com --audio.
(function () {
  const R = window.R;
  const { clamp } = R.U;

  R.INTRO_END = 3.4; // intro: maquete se monta, câmera visita o Congresso + título, sem narração

  // Narração (voz IA), com pausas encurtadas e acelerada 1,15×. Cada trecho falado:
  // [início, fim, texto] em segundos do vídeo, medidos no áudio (pausas + transcrição).
  const CHUNKS = [[[3.7, 7.04, "Todo mundo vota pra deputado, senador, presidente…"], [7.17, 10.1, "Mas pouca gente sabe como as coisas funcionam lá dentro."], [10.24, 11.93, "Você sabe como uma ideia vira lei?"], [12.07, 12.74, "Vem que eu te mostro."]],
    [[13.03, 14.68, "Tudo começa com um projeto de lei."], [14.83, 15.54, "Quem pode propor?"], [15.68, 19.23, "Deputados, senadores, o Presidente da República, o STF,"], [19.37, 20.53, "os tribunais superiores"], [20.61, 22.21, "e o Procurador-Geral da República,"], [22.34, 23.28, "nos assuntos de cada um…"], [23.43, 24.05, "e até você:"], [24.19, 26.99, "com a assinatura de 1% dos eleitores do país,"], [27.12, 29.04, "espalhados em pelo menos cinco estados."]],
    [[29.34, 30.51, "Projetos do Presidente,"], [30.61, 33.5, "do STF, dos tribunais superiores e da população"], [33.64, 35.43, "começam pela Câmara dos Deputados."], [35.56, 35.78, "Lá,"], [36.07, 37.15, "passam pelas comissões:"], [37.29, 38.19, "um relator estuda,"], [38.32, 40.29, "dá parecer e pode propor mudanças."], [40.43, 43.37, "E a CCJ confere se o projeto respeita a Constituição."]],
    [[43.66, 46.57, "Muitas vezes, as próprias comissões já aprovam o projeto,"], [46.68, 47.86, "sem passar pelo plenário."], [48.0, 52.32, "Em outros casos, ele vai ao plenário, e precisa da maioria dos votos,"], [52.44, 54.76, "com mais da metade dos 513 deputados presentes."]],
    [[55.05, 55.58, "Aprovado,"], [55.72, 57.5, "ele segue para o Senado, que revisa."], [57.65, 58.23, "Se aprovar,"], [58.37, 59.27, "vai para o Presidente."], [59.41, 60.74, "Se rejeitar, é arquivado."], [60.88, 62.8, "Se mudar o texto, volta para a Câmara,"], [62.94, 64.44, "que decide se aceita as mudanças."]],
    [[64.73, 67.45, "O Presidente tem 15 dias úteis para sancionar"], [67.45, 67.94, "ou vetar,"], [68.08, 69.23, "no todo ou em parte."], [69.37, 70.28, "Se ficar em silêncio,"], [70.42, 71.41, "é sanção tácita."], [71.55, 72.72, "E o veto não é o fim:"], [72.96, 74.29, "o Congresso pode derrubá-lo"], [74.38, 77.2, "com a maioria absoluta dos deputados e dos senadores."]],
    [[77.5, 80.63, "Por fim, a lei é promulgada e publicada no Diário Oficial."], [80.78, 82.16, "E só então passa a valer:"], [82.29, 83.89, "na data que o próprio texto diz"], [84.03, 86.84, "ou, se ele não disser nada, 45 dias depois."]],
    [[87.14, 89.3, "Agora você sabe como uma ideia vira lei."], [89.44, 91.98, "Salva esse vídeo e manda pra quem precisa entender isso."]]];


  // palavras distribuídas dentro de cada trecho, proporcionais ao tamanho
  R.BEATS = CHUNKS.map(cs => {
    const words = [];
    for (const [a, b, txt] of cs) {
      const ws = txt.split(/\s+/);
      const wt = ws.map(w => w.replace(/[^\p{L}\p{N}%]/gu, '').length + 2.2);
      const tot = wt.reduce((x, y) => x + y, 0);
      let acc = 0;
      ws.forEach((w, i) => {
        const t = a + (acc / tot) * (b - a);
        acc += wt[i];
        words.push({ w, t, end: a + (acc / tot) * (b - a) });
      });
    }
    return { start: cs[0][0], end: cs[cs.length - 1][1], text: cs.map(c => c[2]).join(' '), words };
  });
  R.DURATION = 94.2;

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
    // keyframes na ordem da narração; zoom grande (entrar/sair de estação) tem no mínimo 1 s
    const key = (t, at, zoom, o = {}) => {
      const want = t;
      const prev = k[k.length - 1];
      if (prev) {
        const big = Math.max(zoom / prev.zoom, prev.zoom / zoom) > 1.8;
        t = Math.max(t, prev.t + (big ? 1.0 : 0.25));
      }
      k.push({ t, want, at, zoom, sy: o.sy ?? 900, dx: o.dx || 0, dy: o.dy || 0 });
    };
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
    key(B[1].end - 0.2, 's1', 1.42);
    // 3 · Câmara e comissões
    OUT(B[1].end + 0.8, 0.3);
    key(T.w(2, 'Câmara') - 0.1, 's2', 1.45);
    key(T.w(2, 'relator') - 0.3, 's2', 1.6, { dx: -60, dy: -10 });
    key(T.w(2, 'mudanças') + 0.3, 's2', 1.6, { dx: 0, dy: -10 });
    key(T.w(2, 'CCJ') + 0.2, 's2', 1.62, { dx: 70, dy: 30 });
    key(B[2].end - 0.2, 's2', 1.5, { dx: 40, dy: 20 });
    // 4 · comissões aprovam (visão geral com o atalho) → plenário
    key(T.w(3, 'aprovam'), 'all', 0.42, { sy: 1000 });
    key(T.w(3, 'outros') - 0.1, 'all', 0.43, { sy: 1000 });
    key(T.w(3, 'plenário', 2) + 0.5, 's3', 1.5);
    key(T.w(3, 'metade') - 0.2, 's3', 1.58, { dx: -40, dy: 30 });
    key(B[3].end - 0.2, 's3', 1.5, { dx: -20, dy: 20 });
    // 5 · Senado
    OUT(B[3].end + 0.8, 0.3);
    key(T.w(4, 'Senado') + 0.5, 's4', 1.5);
    key(T.w(4, 'rejeitar') - 0.1, 's4', 1.55, { dx: 60, dy: -30 });
    key(T.w(4, 'mudar') - 0.1, 's4', 1.5, { dx: 10, dy: -60 });
    key(B[4].end - 0.2, 's4', 1.45);
    // 6 · sanção ou veto
    OUT(B[4].end + 0.8, 0.3);
    key(T.w(5, 'Presidente') + 0.6, 's5', 1.5);
    key(T.w(5, 'dias') + 0.2, 's5', 1.6, { dx: 50, dy: -20 });
    key(T.w(5, 'silêncio'), 's5', 1.55, { dx: 20, dy: -10 });
    key(T.w(5, 'Congresso') - 0.1, 's5', 1.55, { dx: -70, dy: 40 });
    key(B[5].end - 0.2, 's5', 1.5, { dx: -40, dy: 30 });
    // 7 · publicação
    OUT(B[5].end + 0.8, 0.3);
    key(T.w(6, 'publicada') + 0.2, 's6', 1.5);
    key(T.w(6, 'data') - 0.2, 's6', 1.58, { dx: -60, dy: -20 });
    key(B[6].end - 0.2, 's6', 1.55, { dx: -40, dy: -10 });
    // 8 · fechamento: maquete inteira acesa
    key(T.w(7, 'Agora') + 1.2, 'all', 0.355, { sy: 1240 });
    key(R.DURATION, 'all', 0.365, { sy: 1235 });
    return k;
  };
  R.U.timeClamp = clamp;
})();
