// Tradução ao toque longo numa palavra ou ao selecionar uma frase.
// Zonas traduzíveis: qualquer elemento com [data-tr] e as opções de resposta (.opt).
import { translate } from './ai.js';
import { dachshundBtn } from './dachshund.js';

const ZONE = '[data-tr], .opt';
const LONG_PRESS_MS = 480;
const MOVE_TOLERANCE = 10;
const MAX_CHARS = 300;

let hooks = {};
let pop = null;
let pressTimer = null;
let selTimer = null;
let pointerDown = false;
let start = { x: 0, y: 0 };
let suppressClick = false;
let requestId = 0;

const hasLetters = (s) => /\p{L}/u.test(s);
const clean = (s) => s.replace(/\s+/g, ' ').trim();
const wordCount = (s) => (s.match(/\S+/g) || []).length;

export function initTranslate(h) {
  hooks = h;
  document.addEventListener('pointerdown', onDown);
  document.addEventListener('pointermove', onMove);
  document.addEventListener('pointerup', onUp);
  document.addEventListener('pointercancel', cancelPress);
  document.addEventListener('click', onClickCapture, true);
  document.addEventListener('contextmenu', onContextMenu);
  document.addEventListener('selectionchange', onSelectionChange);
  document.addEventListener('keydown', (e) => e.key === 'Escape' && hide());
}

// ---------- toque longo ----------
function onDown(e) {
  if (e.button > 0) return;
  pointerDown = true;
  suppressClick = false;
  if (pop && !pop.contains(e.target)) hide();
  const zone = e.target.closest?.(ZONE);
  if (!zone) return;
  start = { x: e.clientX, y: e.clientY };
  clearTimeout(pressTimer);
  pressTimer = setTimeout(() => longPress(zone, e.clientX, e.clientY), LONG_PRESS_MS);
}

function onMove(e) {
  if (pressTimer && Math.hypot(e.clientX - start.x, e.clientY - start.y) > MOVE_TOLERANCE) cancelPress();
}

function cancelPress() {
  clearTimeout(pressTimer);
  pressTimer = null;
}

function onUp() {
  pointerDown = false;
  cancelPress();
  clearTimeout(selTimer);
  selTimer = setTimeout(checkSelection, 40); // seleção feita com o rato
}

// depois de um toque longo numa opção, o "click" seguinte não deve responder à pergunta
function onClickCapture(e) {
  if (!suppressClick) return;
  suppressClick = false;
  e.preventDefault();
  e.stopPropagation();
}

function onContextMenu(e) {
  if (suppressClick && e.target.closest?.(ZONE)) e.preventDefault();
}

function longPress(zone, x, y) {
  pressTimer = null;
  const context = contextOf(zone);
  if (zone.matches('.opt')) {
    suppressClick = true;
    setTimeout(() => (suppressClick = false), 800);
    const text = clean(zone.textContent);
    if (text) show({ text, rect: zone.getBoundingClientRect(), context: document.querySelector('.qtext')?.textContent || '' });
    return;
  }
  const range = wordRangeAt(x, y, zone);
  if (!range) return;
  const sel = getSelection();
  sel.removeAllRanges();
  sel.addRange(range); // o selectionchange abre a tradução
}

function wordRangeAt(x, y, zone) {
  let node, offset;
  if (document.caretPositionFromPoint) {
    const p = document.caretPositionFromPoint(x, y);
    node = p?.offsetNode;
    offset = p?.offset;
  } else if (document.caretRangeFromPoint) {
    const r = document.caretRangeFromPoint(x, y);
    node = r?.startContainer;
    offset = r?.startOffset;
  }
  if (!node || node.nodeType !== Node.TEXT_NODE || !zone.contains(node)) return null;
  const t = node.textContent;
  const isW = (c) => /[\p{L}\p{N}'’-]/u.test(c || '');
  let a = Math.min(offset, t.length);
  let b = a;
  while (a > 0 && isW(t[a - 1])) a--;
  while (b < t.length && isW(t[b])) b++;
  if (a === b) return null;
  const range = document.createRange();
  range.setStart(node, a);
  range.setEnd(node, b);
  return range;
}

// ---------- seleção de texto ----------
function onSelectionChange() {
  if (pointerDown) return; // espera pelo fim do arrasto
  clearTimeout(selTimer);
  selTimer = setTimeout(checkSelection, 350);
}

function checkSelection() {
  const sel = getSelection();
  if (!sel || sel.isCollapsed || !sel.rangeCount) {
    if (pop?.dataset.source === 'selection') hide();
    return;
  }
  const node = sel.anchorNode?.nodeType === Node.TEXT_NODE ? sel.anchorNode.parentElement : sel.anchorNode;
  const zone = node?.closest?.('[data-tr]');
  if (!zone || !zone.contains(sel.focusNode)) return;
  const text = clean(sel.toString());
  if (!text || text.length > MAX_CHARS || !hasLetters(text)) return;
  show({ text, rect: sel.getRangeAt(0).getBoundingClientRect(), context: contextOf(zone, node), source: 'selection' });
}

function contextOf(zone, node) {
  const block = node?.closest?.('p, .qtext, blockquote, li') || zone;
  return clean(block.textContent).slice(0, 400);
}

// ---------- popover ----------
function show({ text, rect, context, source = 'press' }) {
  if (pop && pop.dataset.text === text) return; // já aberto para este texto
  hide();
  pop = document.createElement('div');
  pop.className = 'tr-pop';
  pop.dataset.source = source;
  pop.dataset.text = text;
  pop.setAttribute('role', 'dialog');
  pop.setAttribute('aria-live', 'polite');
  pop.innerHTML = `<div class="tr-head"><b class="tr-text"></b>
      <span><button class="tr-btn" data-a="listen" type="button">Ouvir</button><button class="tr-btn" data-a="close" type="button" aria-label="Fechar">×</button></span></div>
    <div class="tr-body"></div><div class="tr-foot"></div>`;
  pop.querySelector('.tr-text').textContent = text.length > 60 ? `${text.slice(0, 60)}…` : text;
  document.body.appendChild(pop);
  place(rect);

  const body = pop.querySelector('.tr-body');
  const foot = pop.querySelector('.tr-foot');
  pop.addEventListener('pointerdown', (e) => e.preventDefault()); // mantém a seleção
  pop.addEventListener('click', (e) => {
    const a = e.target.dataset?.a;
    if (a === 'close') hide();
    if (a === 'listen') speak(text);
  });

  const run = async () => {
    const id = ++requestId;
    body.innerHTML = '<i class="sk" style="width:80%;height:1rem"></i><i class="sk" style="width:55%;height:.8rem;margin-top:.5rem"></i>';
    foot.innerHTML = '';
    try {
      const r = await translate(text, context);
      if (id !== requestId || !pop) return;
      body.innerHTML = '';
      const main = document.createElement('p');
      main.className = 'tr-main';
      main.textContent = r.translation;
      body.appendChild(main);
      if (r.note) {
        const note = document.createElement('p');
        note.className = 'tr-note';
        note.textContent = r.note;
        body.appendChild(note);
      }
      foot.innerHTML = dachshundBtn({ small: true, attrs: 'data-a="save"' });
      foot.querySelector('[data-a="save"]').addEventListener('click', async (e) => {
        const btn = e.currentTarget;
        btn.disabled = true;
        try {
          await hooks.saveNote(`${text} → ${r.translation}`, context);
          btn.querySelector('.dx-label').textContent = 'Guardada';
          btn.setAttribute('aria-label', 'Nota guardada');
        } catch {
          btn.disabled = false;
          hooks.toast?.('Não foi possível guardar a nota.', 'err');
        }
      });
      place(rect);
    } catch (err) {
      if (id !== requestId || !pop) return;
      body.innerHTML = '';
      const p = document.createElement('p');
      p.className = 'tr-note';
      p.textContent = err.message;
      body.appendChild(p);
      place(rect);
    }
  };

  // uma palavra traduz logo; uma frase pede confirmação (poupa pedidos em seleções acidentais)
  if (wordCount(text) <= 1 || source === 'press') run();
  else {
    body.innerHTML = '<p class="tr-note">Frase selecionada.</p>';
    foot.innerHTML = '<button class="tr-btn strong" data-a="go" type="button">Traduzir</button>';
    foot.querySelector('[data-a="go"]').addEventListener('click', run);
  }
}

function place(rect) {
  if (!pop) return;
  const margin = 12;
  const w = Math.min(pop.offsetWidth, innerWidth - margin * 2);
  let left = rect.left + rect.width / 2 - w / 2;
  left = Math.max(margin, Math.min(left, innerWidth - w - margin));
  let top = rect.bottom + 10;
  if (top + pop.offsetHeight > innerHeight - margin && rect.top - pop.offsetHeight - 10 > margin) top = rect.top - pop.offsetHeight - 10;
  pop.style.left = `${left + scrollX}px`;
  pop.style.top = `${top + scrollY}px`;
}

function hide() {
  requestId++;
  pop?.remove();
  pop = null;
}

function speak(text) {
  if (!('speechSynthesis' in window)) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'en-GB';
  speechSynthesis.speak(u);
}
