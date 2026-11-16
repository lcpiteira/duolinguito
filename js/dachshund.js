// Botão "Guardar nota" em forma de dachshund, num só traço (ao estilo do desenho "Le Chien" de Picasso).
// Desenho original em SVG inline; o texto é HTML normal sobreposto ao corpo.
const DOG = `<svg class="dx-svg" viewBox="0 0 240 92" aria-hidden="true" focusable="false">
  <path class="dx-tail" d="M36 28C24 26 14 20 8 10"/>
  <path d="M36 28C80 34 130 32 178 20C182 12 188 8 192 8C200 18 222 34 235 44C238 47 236 52 230 52C215 52 200 50 186 48"/>
  <path d="M178 56C150 63 100 63 56 58"/>
  <path d="M56 58L54 83Q54 87 48 87Q42 87 42 83L44 31"/>
  <path d="M168 62L166 84Q166 88 172 88Q177 88 177 84L179 54"/>
  <ellipse cx="186" cy="36" rx="8" ry="19"/>
</svg>`;

export function dachshundBtn({ id = '', label = 'Guardar', aria = 'Guardar nota', small = false, attrs = '' } = {}) {
  return `<button type="button" class="btn-dachshund${small ? ' sm' : ''}"${id ? ` id="${id}"` : ''} aria-label="${aria}" ${attrs}>${DOG}<span class="dx-label">${label}</span></button>`;
}
