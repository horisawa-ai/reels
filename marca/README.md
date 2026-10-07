# Marca: plenarinho.decente

Púlpito na frente de um plenarinho de lâmpadas, no mesmo estilo de maquete dos vídeos.
O ponto de **plenarinho.decente** é uma lâmpada: acende e pisca junto com a luz do púlpito.

| Arquivo | O que é |
|---|---|
| `logo.png` | Logo com o nome (1080×1080) |
| `perfil.png` | Foto de perfil (1080×1080, cabe no círculo do Instagram) |
| `marca.js` / `marca.html` | Desenho e animação (`window.frame(t, modo)`, modos `square`, `vertical`, `avatar`, `logo`, `banner`) |
| `marca.mjs` | `node marca.mjs stills` gera as imagens; `node marca.mjs video square saida.mp4` gera a vinheta |
| `som_marca.py` | Som da vinheta (estalo da base, lâmpadas subindo em Ré menor, "plim" da luz, acorde final) |

Vinheta: 3,2 s. Base entra (0–0,5 s), púlpito sobe, as 12 lâmpadas acendem da esquerda para a direita
(0,7–1,45 s), o nome entra e a luz do púlpito e o ponto piscam duas vezes (1,6 s).
