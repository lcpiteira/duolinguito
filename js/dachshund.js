// Botão "Guardar nota" com o formato de um dachshund (SVG inline, sem imagens externas).
// O texto é HTML normal sobreposto ao corpo do cão, por isso herda a fonte e fica legível.
const SVG = `<svg class="dach-svg" viewBox="0 0 200 64" aria-hidden="true" focusable="false">
  <g class="dach-dark"><rect x="26" y="36" width="14" height="24" rx="6"/><rect x="48" y="36" width="14" height="24" rx="6"/><rect x="116" y="36" width="14" height="24" rx="6"/><rect x="138" y="36" width="14" height="24" rx="6"/></g>
  <path class="dach-tail dach-fill" d="M20 16 C12 12 8 8 4 2 C12 3 22 8 26 14 Z"/>
  <g class="dach-fill"><rect x="12" y="8" width="140" height="34" rx="17"/><ellipse cx="156" cy="24" rx="16" ry="15"/><rect x="164" y="20" width="32" height="17" rx="8.5"/></g>
  <ellipse class="dach-dark" cx="150" cy="30" rx="8" ry="15" transform="rotate(12 150 30)"/>
  <circle class="dach-eye" cx="166" cy="17" r="2.4"/><circle class="dach-eye" cx="193" cy="24" r="4"/>
</svg>`;

// Devolve o HTML do botão. `label` é texto fixo (não vem de utilizador).
export function dachshundBtn({ id = '', label = 'Guardar', aria = 'Guardar nota', small = false, attrs = '' } = {}) {
  return `<button class="btn-dachshund${small ? ' sm' : ''}"${id ? ` id="${id}"` : ''} type="button" aria-label="${aria}" ${attrs}>${SVG}<span class="dach-label">${label}</span></button>`;
}
