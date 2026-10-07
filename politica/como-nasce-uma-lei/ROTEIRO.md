# Reels — Como uma ideia vira lei? (até 2 min, 9:16)

Tom 100% neutro: só o processo previsto na Constituição (lei federal ordinária), sem partidos nem pessoas.
Visual: maquete contínua (zoom in na estação → zoom out para o todo → zoom in na próxima), paleta e fontes do
guia "Maquetes Reels" (carvão, verde profundo, verde acinzentado, papel creme; Anton, Inter, IBM Plex Mono).
Assinatura `@pulsar.science` fixa no canto superior direito da área segura durante todo o vídeo.

## Narração (para gravar) — versão conferida

Abertura (sem narração, ~3 s): a maquete se monta e entra o título.

1. Todo mundo vota pra deputado, senador, presidente… Mas pouca gente sabe como as coisas funcionam lá dentro. Você sabe como uma ideia vira lei? Vem que eu te mostro.
2. Tudo começa com um projeto de lei. Quem pode propor? Deputados, senadores, o Presidente da República; o STF, os tribunais superiores e o Procurador-Geral da República, nos assuntos de cada um… e até você: com a assinatura de 1% dos eleitores do país, espalhados em pelo menos cinco estados.
3. Projetos do Presidente, do STF, dos tribunais superiores e da população começam pela Câmara dos Deputados. Lá, passam pelas comissões: um relator estuda, dá parecer e pode propor mudanças. E a CCJ confere se o projeto respeita a Constituição.
4. Muitas vezes, as próprias comissões já aprovam o projeto, sem passar pelo plenário. Em outros casos, ele vai ao plenário, e precisa da maioria dos votos, com mais da metade dos 513 deputados presentes.
5. Aprovado, ele segue para o Senado, que revisa. Se aprovar, vai para o Presidente. Se rejeitar, é arquivado. Se mudar o texto, volta para a Câmara, que decide se aceita as mudanças.
6. O Presidente tem 15 dias úteis para sancionar ou vetar, no todo ou em parte. Se ficar em silêncio, é sanção tácita. E o veto não é o fim: o Congresso pode derrubá-lo com a maioria absoluta dos deputados e dos senadores.
7. Por fim, a lei é promulgada e publicada no Diário Oficial. E só então passa a valer: na data que o próprio texto diz ou, se ele não disser nada, 45 dias depois.
8. Agora você sabe como uma ideia vira lei. Salva esse vídeo e manda pra quem precisa entender isso.

## Base legal (conferência)
- Quem propõe: art. 61, caput ("na forma e nos casos previstos nesta Constituição"). Iniciativa popular: art. 61, §2º (1% do eleitorado nacional, em pelo menos 5 estados, com no mínimo 0,3% dos eleitores de cada um).
- Começo pela Câmara: art. 64 (Presidente, STF e tribunais superiores) e art. 61, §2º (iniciativa popular, apresentada à Câmara).
- Comissões aprovando sem plenário: art. 58, §2º, I (salvo recurso de 1/10 dos membros da Casa).
- Quórum: art. 47 (maioria dos votos, presente a maioria absoluta: 257 dos 513). A Câmara segue com 513 cadeiras (LC 78/1993; o aumento para 531 foi vetado em 2025).
- Casa revisora e retorno à Casa iniciadora: art. 65 e parágrafo único.
- Sanção, veto (15 dias úteis, total ou parcial), silêncio = sanção, derrubada por maioria absoluta em sessão conjunta: art. 66, §§1º, 3º e 4º.
- Vigência em 45 dias quando a lei não diz: Lei de Introdução às Normas (Decreto-Lei 4.657/1942), art. 1º.

## Como rodar
- Prévia: abrir `index.html` (espaço = play/pausa). `?v=B` mostra a abertura B; `?legenda` liga a legenda.
- Vídeo: `node render.mjs --out out/reels.mp4 --query v=A` (opcional `--dur 5`, `--audio narracao.mp3`).
