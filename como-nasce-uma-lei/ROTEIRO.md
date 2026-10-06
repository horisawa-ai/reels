# Reels — Como uma ideia vira lei? (até 2 min, 9:16)

Tom 100% neutro: só o processo previsto na Constituição (lei federal ordinária), sem partidos nem pessoas.
Visual: maquete contínua (zoom in na estação → zoom out para o todo → zoom in na próxima), paleta e fontes do
guia "Maquetes Reels" (carvão, verde profundo, verde acinzentado, papel creme; Anton, Inter, IBM Plex Mono).
Assinatura `@pulsar.science` fixa no canto superior direito da área segura durante todo o vídeo.

## Narração (para gravar)

Abertura (sem narração, ~2,5 s): a maquete se monta e entra o título.

1. Todo mundo vota pra deputado, senador, presidente… Mas pouca gente sabe como as coisas funcionam lá dentro. Você sabe como uma ideia vira lei? Vem que eu te mostro.
2. Tudo começa com um projeto de lei. Quem pode propor? Deputados, senadores, o Presidente da República, o STF, os tribunais superiores, a Procuradoria-Geral da República… e até você: com a assinatura de 1% dos eleitores do país, espalhados em pelo menos cinco estados.
3. Se o projeto vem de fora do Congresso, ele começa pela Câmara dos Deputados. Lá, passa pelas comissões: um relator estuda, dá parecer e pode propor mudanças. E a CCJ confere se ele respeita a Constituição.
4. Muitas vezes, as próprias comissões já dão a palavra final. Em outros casos, o projeto vai ao plenário, e precisa da maioria dos votos, com pelo menos metade dos 513 deputados presentes.
5. Aprovado, ele segue para o Senado, que revisa. Se aprovar, vai para o Presidente. Se rejeitar, é arquivado. Se mudar o texto, volta para a Câmara, que dá a palavra final.
6. O Presidente tem 15 dias úteis para sancionar ou vetar, no todo ou em parte. Se ficar em silêncio, é sanção tácita. E o veto não é o fim: o Congresso pode derrubá-lo com a maioria absoluta dos deputados e dos senadores.
7. Por fim, a lei é promulgada e publicada no Diário Oficial. E só então passa a valer: na data que o próprio texto diz ou, se ele não disser nada, 45 dias depois.
8. Agora você sabe como uma ideia vira lei. Salva esse vídeo e manda pra quem precisa entender isso.

## Base legal (conferência)
- Quem propõe e iniciativa popular: Constituição, art. 61 (1% do eleitorado, em 5 estados, com 0,3% em cada um).
- Começo pela Câmara para projetos de fora do Congresso: art. 61 §2º e art. 64.
- Poder conclusivo das comissões: art. 58 §2º, I.
- Quórum: art. 47 (maioria dos votos, presente a maioria absoluta).
- Casa revisora e retorno: art. 65. Sanção, veto e derrubada: art. 66.
- Vigência em 45 dias quando a lei não diz: Lei de Introdução às Normas (Decreto-Lei 4.657/1942), art. 1º.

## Como rodar
- Prévia: abrir `index.html` (espaço = play/pausa). `?v=B` mostra a abertura B; `?legenda` liga a legenda.
- Vídeo: `node render.mjs --out out/reels.mp4 --query v=A` (opcional `--dur 5`, `--audio narracao.mp3`).
