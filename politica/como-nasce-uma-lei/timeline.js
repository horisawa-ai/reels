// Tempos da narração e da câmera, sincronizados com a narração gravada.
// O áudio (fora do git: o repositório é público) entra no render com --audio.
(function () {
  const R = window.R;
  const { clamp } = R.U;

  R.INTRO_END = 3.4; // intro: maquete se monta, câmera visita o Congresso + título, sem narração

  // Narração gravada, já sem as retomadas. Cada trecho falado:
  // [início, fim, texto] em segundos do vídeo, medidos no áudio (pausas + transcrição).
  const CHUNKS = [[[3.7, 6.89, "Todo mundo vota pra deputado, senador, presidente…"], [7.24, 9.89, "Mas pouca gente sabe como as coisas funcionam lá dentro."], [10.56, 12.44, "Você sabe como uma ideia vira lei?"], [13.2, 14.26, "Vem comigo que eu te mostro."]],
    [[15.11, 16.75, "Tudo começa com um projeto de lei."], [17.11, 17.92, "Quem pode propor?"], [18.35, 21.86, "Deputados, senadores, o Presidente da República, o STF,"], [22.34, 23.53, "os tribunais superiores"], [23.87, 25.16, "e o Procurador-Geral da República,"], [25.56, 26.73, "nos assuntos de cada um…"], [27.25, 27.98, "e até você:"], [28.84, 31.36, "com a assinatura de 1% dos eleitores do país,"], [31.7, 33.84, "espalhados em pelo menos cinco estados."]],
    [[34.73, 36.02, "Projetos do Presidente,"], [36.34, 39.16, "do STF, dos tribunais superiores e da população"], [39.54, 41.46, "começam pela Câmara dos Deputados."], [41.89, 42.23, "Lá,"], [42.55, 43.81, "passam pelas comissões:"], [44.26, 45.36, "um relator estuda,"], [45.71, 47.86, "dá parecer e pode propor mudanças."], [48.38, 51.55, "E a CCJ confere se o projeto respeita a Constituição."]],
    [[52.44, 55.98, "Muitas vezes, as próprias comissões já aprovam o projeto,"], [56.3, 57.62, "sem passar pelo plenário."], [57.98, 61.94, "Em outros casos, ele vai ao plenário, e precisa da maioria dos votos,"], [62.34, 66.36, "com mais da metade dos 513 deputados presentes."]],
    [[67.19, 67.82, "Aprovado,"], [68.11, 70.28, "ele segue para o Senado, que revisa."], [70.84, 71.6, "Se aprovar,"], [71.89, 73.08, "vai para o Presidente."], [73.44, 75.22, "Se rejeitar, é arquivado."], [75.82, 77.88, "Se mudar o texto, volta para a Câmara,"], [78.21, 79.99, "que decide se aceita as mudanças."]],
    [[80.93, 84.07, "O Presidente tem 15 dias úteis para sancionar"], [84.47, 85.12, "ou vetar,"], [85.53, 87.23, "no todo ou em parte."], [87.68, 88.72, "Se ficar em silêncio,"], [89.07, 90.26, "é sanção tácita."], [91.13, 92.54, "E o veto não é o fim:"], [92.96, 94.49, "o Congresso pode derrubá-lo"], [94.78, 97.6, "com a maioria absoluta dos deputados e dos senadores."]],
    [[98.01, 101.54, "Por fim, a lei é promulgada e publicada no Diário Oficial."], [101.85, 103.32, "E só então passa a valer:"], [103.78, 105.57, "na data que o próprio texto diz"], [105.9, 109.39, "ou, se ele não disser nada, 45 dias depois."]],
    [[109.9, 112.01, "Agora você sabe como uma ideia vira lei."], [112.32, 115.02, "Salva esse vídeo e manda pra quem precisa entender isso."]]];


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
  R.DURATION = 117.2;

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
    // keyframes na ordem da narração; zoom grande (entrar/sair de estação) tem no mínimo 1,15 s
    const key = (t, at, zoom, o = {}) => {
      const prev = k[k.length - 1];
      if (prev) {
        const big = Math.max(zoom / prev.zoom, prev.zoom / zoom) > 1.8;
        t = Math.max(t, prev.t + (big ? 1.15 : 0.25));
      }
      k.push({ t, at, zoom, sy: o.sy ?? 900, dx: o.dx || 0, dy: o.dy || 0 });
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
