// Botão "Guardar nota" em forma de dachshund (SVG inline original, sem imagens externas).
// O texto é HTML normal sobreposto ao corpo; o desenho é decorativo (aria-hidden).
const DOG = `<svg viewBox="0 0 170 64" aria-hidden="true" focusable="false">
  <path class="dg-tail" d="M16 18 Q4 14 3 3"/>
  <g class="dg-fill">
    <rect x="24" y="36" width="12" height="25" rx="5"/><rect x="46" y="36" width="12" height="25" rx="5"/>
    <rect x="88" y="36" width="12" height="25" rx="5"/><rect x="106" y="36" width="12" height="25" rx="5"/>
    <rect x="12" y="8" width="108" height="32" rx="16"/>
    <ellipse cx="128" cy="21" rx="17" ry="14"/>
    <rect x="134" y="19" width="32" height="15" rx="7.5"/>
  </g>
  <path class="dg-ear" d="M120 11 Q111 26 121 40 Q134 36 131 17 Z"/>
  <circle class="dg-eye" cx="138" cy="15" r="2.2"/>
  <circle class="dg-nose" cx="163" cy="24" r="4"/>
</svg>`;

export function dachshundButton({ id = '', label = 'Guardar', aria = 'Guardar nota', small = false } = {}) {
  const idAttr = id ? ` id="${id}"` : '';
  return `<button type="button" class="btn-dachshund${small ? ' small' : ''}"${idAttr} aria-label="${aria}">${DOG}<span class="dg-label">${label}</span></button>`;
}
