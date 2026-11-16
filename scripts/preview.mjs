#!/usr/bin/env node
// Gera screenshots do site em modo local (sem Firebase, sem rede) para pré-visualizar alterações.
//
// Uso:  node scripts/preview.mjs <spec.json> [pastaDeSaida=.preview]
//       node scripts/preview.mjs --default            (ecrãs principais, claro/escuro, desktop/telemóvel)
//
// spec.json:
// {
//   "prototype": true,                      // true = ainda não está no código (protótipo da proposta)
//   "mockAI": { "translation": "...", "note": "..." },   // resposta simulada da IA (opcional)
//   "shots": [{
//     "name": "notas-claro-desktop",         // [a-z0-9-]
//     "caption": "Página Notas, tema claro",
//     "route": "#/notes",                    // #/ #/practice #/topic/future #/notes #/writing #/mistakes #/settings
//     "theme": "light" | "dark",             // omissível: light
//     "viewport": "desktop" | "mobile",      // omissível: desktop
//     "seed": { "notes": {} },               // opcional: substitui partes dos dados de demonstração; false = sem sessão (ecrã de login)
//     "steps": [ {"click":"#noteToggle"}, {"fill":["#noteText","texto"]}, {"press":"Enter"},
//                {"hover":"sel"}, {"wait":300}, {"select":"sel"}, {"longpress":"sel"} ],
//     "selector": ".card",                   // opcional: fotografa só este elemento
//     "fullPage": false
//   }]
// }
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json', '.png': 'image/png', '.ico': 'image/x-icon' };
const VIEWPORTS = {
  desktop: { viewport: { width: 1280, height: 800 } },
  mobile: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
};

// ---------- dados de demonstração ----------
function demoSeed() {
  const now = Date.now();
  const day = 864e5;
  const stat = (acc, n) => ({ n, c: +(n * acc).toFixed(1), recent: Array.from({ length: 10 }, (_, i) => (i < Math.round(acc * 10) ? 1 : 0)), last: now - day });
  const mistake = (topic, q, answer, wrong, explain) => ({ type: 'mc', topic, q, answer, options: [answer, ...wrong], explain, your: wrong[0], at: now - day });
  return {
    topics: { future: stat(0.4, 30), 'pp-ps': stat(0.7, 20), mixed: stat(0.5, 10), food: stat(0.9, 20), family: stat(0.85, 20), personality: stat(0.3, 10), reading: stat(0.7, 12), writing: { n: 2, c: 1.4, recent: [0.6, 0.8], last: now - day } },
    sessions: Object.fromEntries([0, 1, 2, 3, 4, 5].map((i) => [`s${i}`, { topic: ['future', 'pp-ps', 'food', 'family', 'reading', 'writing'][i], source: i % 2 ? 'ai' : 'site', score: 5 + (i % 4), total: i === 5 ? 10 : 10, at: now - i * day * 0.7 }])),
    mistakes: {
      q1: mistake('future', "Look at those black clouds! It ____ rain.", 'is going to', ['will', 'is raining', 'rains'], 'Há evidência no presente (nuvens negras) → be going to.'),
      q2: mistake('pp-ps', 'I ____ to Paris in 2019.', 'went', ['have been', 'have gone', 'was going'], 'Tempo terminado e definido (in 2019) → past simple.'),
      q3: mistake('personality', 'Someone who always tells the truth is ____.', 'honest', ['reliable', 'generous', 'shy'], 'honest = honesto.'),
    },
    notes: {
      n1: { text: 'will = decisão espontânea; going to = plano ou evidência.', topic: 'future', context: "Look at those black clouds! It ____ rain.", at: now - day, edited: now - day },
      n2: { text: 'mean (UK) = forreta. Oposto: generous.', topic: 'personality', at: now - 2 * day, edited: now - 2 * day },
      n3: { text: 'Rever os phrasal verbs da família: get on with, take after.', topic: '', at: now - 3 * day, edited: now - 3 * day },
    },
    writings: {},
    settings: { level: 'B1' },
  };
}

// ---------- servidor estático (o config.js é servido em modo local, sem alterar o ficheiro) ----------
async function startServer() {
  const server = http.createServer(async (req, res) => {
    try {
      let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      if (p === '/') p = '/index.html';
      const file = path.join(ROOT, p);
      if (!file.startsWith(ROOT) || file.includes(`${path.sep}.`)) throw new Error('fora do âmbito');
      let body = await fs.readFile(file);
      if (p === '/js/config.js') body = Buffer.from(body.toString().replace(/apiKey:\s*'[^']*'/, "apiKey: 'YOUR_API_KEY'"));
      res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      res.end(body);
    } catch {
      res.writeHead(404).end('not found');
    }
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  return { server, base: `http://127.0.0.1:${server.address().port}` };
}

const DEFAULT_SPEC = {
  shots: [
    ['home', '#/', 'Início'],
    ['practice', '#/practice', 'Praticar'],
    ['notes', '#/notes', 'Notas'],
  ].flatMap(([n, route, label]) =>
    ['light', 'dark'].flatMap((theme) =>
      ['desktop', 'mobile'].map((viewport) => ({ name: `${n}-${theme}-${viewport}`, route, theme, viewport, caption: `${label} · tema ${theme === 'light' ? 'claro' : 'escuro'} · ${viewport === 'mobile' ? 'telemóvel' : 'computador'}` })),
    ),
  ),
};

// ---------- execução ----------
async function runSteps(page, steps = []) {
  for (const s of steps) {
    if (s.click) await page.click(s.click, { timeout: 5000 });
    else if (s.fill) await page.fill(s.fill[0], String(s.fill[1]), { timeout: 5000 });
    else if (s.press) await page.keyboard.press(s.press);
    else if (s.hover) await page.hover(s.hover, { timeout: 5000 });
    else if (s.wait) await page.waitForTimeout(Math.min(+s.wait, 5000));
    else if (s.select) {
      await page.evaluate((sel) => {
        const el = document.querySelector(sel);
        const r = document.createRange();
        r.selectNodeContents(el);
        const g = getSelection();
        g.removeAllRanges();
        g.addRange(r);
      }, s.select);
      await page.waitForTimeout(900); // o popover de tradução abre após um pequeno atraso
    } else if (s.longpress) {
      const box = await (await page.waitForSelector(s.longpress, { timeout: 5000 })).boundingBox();
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.waitForTimeout(700);
      await page.mouse.up();
      await page.waitForTimeout(500);
    } else throw new Error(`passo desconhecido: ${JSON.stringify(s)}`);
  }
}

async function main() {
  const [arg, outArg] = process.argv.slice(2);
  if (!arg) {
    console.error('Uso: node scripts/preview.mjs <spec.json | --default> [pastaDeSaida]');
    process.exit(2);
  }
  const spec = arg === '--default' ? DEFAULT_SPEC : JSON.parse(await fs.readFile(arg, 'utf8'));
  const out = path.resolve(outArg || '.preview');
  await fs.mkdir(out, { recursive: true });

  const { server, base } = await startServer();
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const done = [];
  try {
    for (const shot of spec.shots || []) {
      if (!/^[a-z0-9-]+$/.test(shot.name || '')) throw new Error(`nome inválido: ${shot.name}`);
      const theme = shot.theme === 'dark' ? 'dark' : 'light';
      const context = await browser.newContext({ ...VIEWPORTS[shot.viewport === 'mobile' ? 'mobile' : 'desktop'], colorScheme: theme, locale: 'pt-PT' });
      const page = await context.newPage();
      // sem rede externa (determinístico), exceto fontes
      await page.route('**/*', (route) => {
        const u = new URL(route.request().url());
        if (u.hostname === '127.0.0.1' || /(^|\.)fonts\.(googleapis|gstatic)\.com$/.test(u.hostname)) return route.continue();
        if (u.hostname === 'generativelanguage.googleapis.com' && spec.mockAI) {
          return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(spec.mockAI) }] } }] }) });
        }
        return route.abort();
      });
      const seeded = shot.seed === false ? null : { ...demoSeed(), ...(shot.seed || {}) };
      if (seeded && spec.mockAI) seeded.settings = { ...seeded.settings, geminiKey: 'preview' };
      await context.addInitScript(({ theme, seeded }) => {
        localStorage.setItem('theme', theme);
        if (seeded) {
          localStorage.setItem('eng.localUser', JSON.stringify({ uid: 'local', name: 'Luís', email: '', photo: '' }));
          localStorage.setItem('eng.data.local', JSON.stringify(seeded));
        }
      }, { theme, seeded });

      await page.goto(`${base}/index.html${shot.route || '#/'}`, { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => document.querySelector('.auth-card') || (document.querySelector('#view') && document.querySelector('#view').children.length && !document.querySelector('#view .sk')), null, { timeout: 10000 });
      await page.evaluate(() => document.fonts.ready);
      await runSteps(page, shot.steps);
      await page.waitForTimeout(250);

      const file = path.join(out, `${shot.name}.png`);
      if (shot.selector) await (await page.waitForSelector(shot.selector, { timeout: 5000 })).screenshot({ path: file });
      else await page.screenshot({ path: file, fullPage: !!shot.fullPage });
      done.push({ file: `${shot.name}.png`, caption: shot.caption || shot.name, viewport: shot.viewport === 'mobile' ? 'mobile' : 'desktop' });
      console.log(`ok  ${shot.name}`);
      await context.close();
    }
  } finally {
    await browser.close();
    server.close();
  }
  await fs.writeFile(path.join(out, 'captions.json'), JSON.stringify({ prototype: !!spec.prototype, files: done }, null, 2));
  console.log(`${done.length} imagens em ${out}`);
}

main().catch((e) => {
  console.error('erro:', e.message);
  process.exit(1);
});
