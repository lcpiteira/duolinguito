// Efeitos de Natal. Para desligar: ENABLED = false (ou apagar este ficheiro,
// css/christmas.css e as referências em index.html e js/app.js).
const ENABLED = true;

function inSeason() {
  const q = new URLSearchParams(location.search).get('xmas');
  if (q === '1') return true;
  if (q === '0') return false;
  const d = new Date(), m = d.getMonth(), day = d.getDate();
  return m === 11 || (m === 0 && day <= 6);
}

export function initChristmas() {
  if (!ENABLED || !inSeason()) return;
  const root = document.documentElement;
  root.classList.add('xmas');

  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const canvas = document.createElement('canvas');
  canvas.className = 'xmas-snow';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.prepend(canvas);
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const dark = () => root.dataset.theme
    ? root.dataset.theme === 'dark'
    : matchMedia('(prefers-color-scheme: dark)').matches;
  let w = 0, h = 0, flakes = [], raf = 0, color = '';

  const setColor = () => { color = dark() ? '241,246,255' : '120,140,170'; };
  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    w = innerWidth; h = innerHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = w < 700 ? 20 : 40;
    flakes = Array.from({ length: n }, () => ({
      x: Math.random() * w, y: Math.random() * h,
      r: 1 + Math.random() * 2.2, v: .3 + Math.random() * .7,
      p: Math.random() * Math.PI * 2, a: .35 + Math.random() * .45,
    }));
  };
  const draw = () => {
    ctx.clearRect(0, 0, w, h);
    for (const f of flakes) {
      f.y += f.v; f.p += .012; f.x += Math.sin(f.p) * .35;
      if (f.y > h + 4) { f.y = -4; f.x = Math.random() * w; }
      ctx.fillStyle = `rgba(${color},${f.a})`;
      ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, 6.2832); ctx.fill();
    }
  };
  const loop = () => { draw(); raf = requestAnimationFrame(loop); };
  const stop = () => { cancelAnimationFrame(raf); raf = 0; };
  const sync = () => {
    stop();
    if (reduce.matches) { ctx.clearRect(0, 0, w, h); return; }
    if (!document.hidden) raf = requestAnimationFrame(loop);
  };

  setColor(); resize(); sync();
  addEventListener('resize', () => { resize(); if (reduce.matches) ctx.clearRect(0, 0, w, h); });
  document.addEventListener('visibilitychange', sync);
  reduce.addEventListener('change', sync);
  new MutationObserver(setColor).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', setColor);
}
