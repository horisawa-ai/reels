// Tempos da narração (voz IA, pausas encurtadas e acelerada 1,15×) e da câmera.
(function () {
  const R = window.R;

  // [início, fim, texto] em segundos do vídeo. Texto como a voz lê (números por extenso).
  const CHUNKS = [[[0.58, 1.8, "Diferente desse lixo,"], [1.97, 3.19, "isso não é narrativa."], [3.33, 3.82, "É fato."]],
    [[4.16, 7.4, "Um aposentado abre o extrato e encontra um desconto que nunca autorizou."], [7.55, 8.27, "Não é empréstimo."], [8.4, 9.44, "Não é plano de saúde."], [9.83, 11.75, "É uma mensalidade associativa."]],
    [[12.11, 12.75, "Funcionava assim:"], [12.91, 15.47, "uma associação assinava um acordo com o INSS"], [15.73, 17.46, "e passava a cobrar direto no benefício."], [17.6, 18.18, "Sem carnê,"], [18.27, 19.12, "sem assinatura,"], [19.2, 19.76, "sem ligação."], [19.93, 21.76, "Até oitenta e um reais por mês,"], [21.9, 23.92, "descontados antes de o dinheiro cair na conta."]],
    [[24.23, 25.0, "No governo Lula,"], [25.13, 26.31, "os descontos explodiram:"], [26.54, 29.46, "de setecentos e seis milhões de reais em dois mil e vinte e dois"], [29.74, 32.61, "para dois vírgula seis bilhões em dois mil e vinte e quatro."], [32.95, 38.68, "Mais de sessenta por cento dos seis vírgula três bilhões investigados saíram em só dois anos de governo Lula."]],
    [[38.98, 40.28, "E o governo foi avisado."], [40.41, 41.84, "Em junho de dois mil e vinte e três,"], [42.02, 43.86, "o ministro da Previdência, Carlos Lupi,"], [44.0, 46.43, "ouviu o alerta numa reunião do Conselho da Previdência."], [46.62, 49.86, "A primeira medida do INSS só veio dez meses depois."], [50.03, 53.79, "Em dois mil e vinte e quatro, a CGU recomendou bloquear novos descontos."], [53.94, 54.65, "Eles continuaram."]],
    [[54.93, 57.29, "A CGU ouviu mais de mil aposentados."], [57.43, 60.29, "Mais de noventa e sete por cento nunca autorizaram nada."]],
    [[60.61, 62.59, "Em vinte e três de abril de dois mil e vinte e cinco,"], [62.73, 65.21, "a Polícia Federal deflagrou a Operação Sem Desconto."], [65.5, 68.95, "O presidente do INSS, Alessandro Stefanutto, indicado por Lupi,"], [69.2, 70.46, "foi demitido no mesmo dia."], [70.6, 72.52, "Meses depois, foi preso pela PF."], [72.68, 75.37, "Nove dias após a operação, Lupi deixou o ministério."]],
    [[75.66, 76.49, "Segundo a PF,"], [76.63, 81.54, "um dos sindicatos investigados viu a receita com esses descontos subir quatrocentos e catorze por cento."]],
    [[81.83, 84.42, "Quem pagou a conta foi quem já tinha parado de trabalhar."]],
    [[84.73, 86.9, "Faltam poucos dias para vinte e cinco de outubro."], [87.06, 88.23, "Faça a escolha certa."], [88.38, 89.9, "Vamos trazer o Brasil de volta."]]];

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
  R.DURATION = 92.6;

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
  };

  // ---------- câmera: keyframes {t, at: alvo, zoom, sy}
  R.cameraKeys = () => {
    const T = R.T, B = R.BEATS;
    const k = [];
    const key = (t, at, zoom, o = {}) => {
      const want = t, prev = k[k.length - 1];
      if (prev) {
        const big = Math.max(zoom / prev.zoom, prev.zoom / zoom) > 1.8;
        t = Math.max(t, prev.t + (big ? 1.0 : 0.3));
      }
      k.push({ t, want, at, zoom, sy: o.sy ?? 960, dx: o.dx || 0, dy: o.dy || 0 });
    };
    const OUT = (t, hold = 0.25) => { key(t, 'all', 0.42, { sy: 1050 }); key(t + hold, 'all', 0.43, { sy: 1050 }); };

    // 0 · foto (a maquete já espera atrás, na casa do aposentado)
    key(0, 'casa', 1.75, { sy: 1000 });
    key(4.0, 'casa', 1.72, { sy: 1000 });
    // 1 · extrato
    key(5.2, 'casa', 1.55, { sy: 960, dx: -20 });
    key(T.w(1, 'mensalidade') - 0.2, 'casa', 1.62, { sy: 960, dx: -40, dy: 20 });
    key(B[1].end - 0.1, 'casa', 1.58, { sy: 960, dx: -30, dy: 10 });
    // 2 · como funcionava: o cano do benefício
    key(T.w(2, 'Funcionava') + 0.3, 'pipe', 0.6, { sy: 940 });
    key(T.w(2, 'acordo') - 0.3, 'pipeL', 0.92, { sy: 940 });
    key(T.w(2, 'cobrar') - 0.1, 'assoc', 1.3, { sy: 980 });
    key(T.w(2, 'Até'), 'assoc', 1.38, { sy: 980, dx: 40 });
    key(T.w(2, 'descontados'), 'pipeR', 0.95, { sy: 960 });
    // 3 · o salto no governo Lula
    OUT(B[2].end - 0.2, 0.2);
    key(T.w(3, 'explodiram') + 0.2, 'graf', 1.35, { sy: 1130 });
    key(T.w(3, 'Mais') - 0.1, 'graf', 1.42, { sy: 1110, dx: 30 });
    key(B[3].end - 0.2, 'graf', 1.4, { sy: 1110, dx: 30 });
    // 4 · o governo foi avisado
    key(T.w(4, 'avisado') + 0.1, 'ga', 0.85, { sy: 980 });
    key(T.w(4, 'junho'), 'alerta', 1.45, { sy: 980 });
    key(T.w(4, 'primeira') - 0.1, 'alerta', 1.5, { sy: 980, dx: -50, dy: -20 });
    key(T.w(4, 'CGU') - 0.2, 'alerta', 1.5, { sy: 980, dx: 50, dy: -10 });
    key(B[4].end, 'alerta', 1.45, { sy: 980, dx: 30 });
    // 5 · a CGU ouviu os aposentados
    key(T.w(5, 'CGU') + 0.1, 'ac', 0.85, { sy: 980 });
    key(T.w(5, 'mil'), 'cgu', 1.5, { sy: 980 });
    key(B[5].end - 0.1, 'cgu', 1.55, { sy: 980 });
    // 6 · operação, demissão, prisão e saída do ministro
    OUT(B[5].end + 0.6, 0.2);
    key(T.w(6, 'Polícia'), 'assoc', 1.3, { sy: 1000 });
    key(T.w(6, 'Operação'), 'assoc', 1.36, { sy: 1000, dx: -20 });
    key(T.w(6, 'presidente') - 0.1, 'ia', 0.85, { sy: 960 });
    key(T.w(6, 'Stefanutto'), 'inss', 1.5, { sy: 1000, dx: -60, dy: 50 });
    key(T.w(6, 'preso'), 'inss', 1.55, { sy: 1000, dx: -60, dy: 60 });
    key(T.w(6, 'Nove') + 0.1, 'inss', 1.45, { sy: 1000, dx: 50, dy: -60 });
    key(B[6].end - 0.1, 'inss', 1.48, { sy: 1000, dx: 60, dy: -60 });
    // 7 · o sindicato
    key(T.w(7, 'Segundo') + 0.2, 'ia', 0.85, { sy: 1000 });
    key(T.w(7, 'sindicatos'), 'assoc', 1.15, { sy: 1150, dx: 60, dy: -40 });
    key(B[7].end - 0.1, 'assoc', 1.08, { sy: 1200, dx: 60, dy: -40 });
    // 8 · quem pagou a conta
    key(T.w(8, 'Quem') + 0.2, 'pipeR', 0.9, { sy: 960 });
    key(T.w(8, 'parado') - 0.4, 'casa', 1.6, { sy: 980, dx: -20 });
    // 9 · fechamento: maquete inteira, texto em cima
    key(T.w(9, 'Faltam') + 0.1, 'all', 0.325, { sy: 1370, dx: 60 });
    key(R.DURATION, 'all', 0.335, { sy: 1365, dx: 60 });
    return k;
  };
})();
