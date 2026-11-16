import * as backend from './backend.js';
import * as store from './store.js';
import * as ai from './ai.js';
import { TOPICS, topicById } from './data/topics.js';
import { BANK, READINGS, WRITING_PROMPTS } from './data/questions.js';

const $app = document.getElementById('app');
let me = null;
let quiz = null; // sessão de prática em curso
let busy = false;

// ---------- helpers ----------
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pct = (x) => (x == null ? '–' : `${Math.round(x * 100)}%`);
const shuffle = (a) => {
  a = [...a];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const norm = (s) => String(s).toLowerCase().replace(/[’‘`]/g, "'").replace(/\s+/g, ' ').trim().replace(/[.!]$/, '');
const countWords = (t) => (t.trim().match(/\S+/g) || []).length;
const level = () => store.state.settings.level || 'B1';
const fmtDate = (ms) => new Date(ms).toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' });

function toast(msg, kind = '') {
  const el = document.createElement('div');
  el.className = `toast ${kind}`;
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

const icon = (d) => `<svg aria-hidden="true" viewBox="0 0 24 24">${d}</svg>`;
const NAV_ICONS = {
  home: icon('<path d="M3 11l9-8 9 8v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>'),
  practice: icon('<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z"/>'),
  writing: icon('<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>'),
  mistakes: icon('<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>'),
  settings: icon('<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>'),
};

const view = () => document.getElementById('view');
const setView = (html) => {
  view().innerHTML = html;
  window.scrollTo(0, 0);
};
// Skeleton screens: o esqueleto da página com um brilho, em vez de um spinner.
const sk = (w = '100%', h = '1rem', extra = '') => `<i class="sk" style="width:${w};height:${h};${extra}"></i>`;
const skRows = (n) => Array.from({ length: n }, () => `<div class="trow static">${sk('2.2rem', '2.2rem', 'border-radius:50%;flex:none')}<span class="tmain">${sk('60%')}${sk('100%', '.5rem')}</span></div>`).join('');
const skHome = () => `<section class="page" aria-busy="true">${sk('45%', '2rem', 'margin:.4rem 0 1rem')}
  <div class="grid2"><div class="card">${sk('100%', '110px')}</div><div class="card">${sk('100%', '110px')}</div></div>
  <div class="stats">${[0, 1, 2].map(() => `<div class="card">${sk('100%', '3rem')}</div>`).join('')}</div>
  <div class="card list">${skRows(6)}</div></section>`;
const skQuiz = (msg) => `<section class="page narrow" aria-busy="true">
  <div class="progress"><i style="width:30%"></i></div>
  <div class="card">${sk('85%', '1.4rem', 'margin-bottom:1.2rem')}${[0, 1, 2, 3].map(() => sk('100%', '3rem', 'margin-bottom:.6rem;border-radius:14px')).join('')}</div>
  <p class="muted center-text">${esc(msg)}</p></section>`;
const skFeedback = () => `<div class="card" aria-busy="true">${sk('40%', '1.6rem', 'margin-bottom:1rem')}${sk('100%')}${sk('90%', '1rem', 'margin-top:.5rem')}${sk('70%', '1rem', 'margin:.5rem 0 1.2rem')}${sk('100%', '4rem')}</div>`;
const loading = (msg) => setView(skQuiz(msg));

function aiError(e) {
  if (e instanceof ai.NoKeyError) {
    toast('Configura a chave Gemini nas Definições para usar a IA.', 'err');
    location.hash = '#/settings';
  } else toast(e.message, 'err');
}

// ---------- arranque ----------
backend.init();
backend.onAuth(async (user) => {
  if (!user) {
    me = null;
    store.reset();
    return renderAuth();
  }
  me = user;
  renderShell();
  setView(skHome());
  await store.load(user.uid);
  route();
});
window.addEventListener('hashchange', () => me && route());

// ---------- autenticação ----------
function renderAuth(signup = false) {
  const local = backend.mode === 'local';
  $app.innerHTML = `
  <div class="auth-wrap">
    <div class="auth-card">
      <div class="logo big">English<b>Prep</b></div>
      <p class="muted">Prepara o teste de inglês britânico com exercícios, progresso e correção por IA.</p>
      ${local ? `<div class="notice">⚠️ Firebase ainda não está configurado (<code>js/config.js</code>). Podes experimentar em <b>modo local</b>: os dados ficam só neste browser.</div>
        <button class="btn primary wide" id="local">Entrar em modo local</button>` : `
      <button class="btn google wide" id="google"><svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.5l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.4 5.7c4.3-4 6.9-9.9 6.9-17.1z"/><path fill="#FBBC05" d="M10.5 28.7A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.2.8-4.7l-7.9-6.1A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.8l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.4-5.7c-2.1 1.4-4.9 2.3-8.5 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z"/></svg> Continuar com Google</button>
      <div class="divider"><span>ou</span></div>
      <form id="emailForm" class="stack">
        ${signup ? '<input id="name" placeholder="Nome" autocomplete="name" />' : ''}
        <input id="email" type="email" placeholder="Email" autocomplete="email" required />
        <input id="pass" type="password" placeholder="Password" autocomplete="${signup ? 'new-password' : 'current-password'}" required minlength="6" />
        <button class="btn primary wide" type="submit">${signup ? 'Criar conta' : 'Entrar'}</button>
      </form>
      <div class="auth-links">
        <a href="#" id="toggle">${signup ? 'Já tenho conta' : 'Criar conta nova'}</a>
        ${signup ? '' : '<a href="#" id="forgot">Esqueci-me da password</a>'}
      </div>`}
      <p class="error" id="authErr"></p>
    </div>
  </div>`;
  const err = (m) => ($app.querySelector('#authErr').textContent = m);
  $app.querySelector('#local')?.addEventListener('click', backend.startLocal);
  $app.querySelector('#google')?.addEventListener('click', () => backend.signInGoogle().catch((e) => err(backend.authMessage(e))));
  $app.querySelector('#toggle')?.addEventListener('click', (e) => (e.preventDefault(), renderAuth(!signup)));
  $app.querySelector('#forgot')?.addEventListener('click', async (e) => {
    e.preventDefault();
    const email = $app.querySelector('#email').value.trim();
    if (!email) return err('Escreve primeiro o teu email.');
    try {
      await backend.resetPassword(email);
      toast('Enviámos um email para repor a password.');
    } catch (x) {
      err(backend.authMessage(x));
    }
  });
  $app.querySelector('#emailForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    err('');
    const email = $app.querySelector('#email').value.trim();
    const pass = $app.querySelector('#pass').value;
    try {
      if (signup) await backend.signUpEmail($app.querySelector('#name').value.trim(), email, pass);
      else await backend.signInEmail(email, pass);
    } catch (x) {
      err(backend.authMessage(x));
    }
  });
}

// ---------- estrutura ----------
function renderShell() {
  const initial = esc((me.name || '?').trim()[0]?.toUpperCase() || '?');
  $app.innerHTML = `
  <header class="topbar">
    <a class="logo" href="#/">English<b>Prep</b></a>
    <nav id="nav">
      <a href="#/" data-r="home">${NAV_ICONS.home}<span>Início</span></a>
      <a href="#/practice" data-r="practice">${NAV_ICONS.practice}<span>Praticar</span></a>
      <a href="#/writing" data-r="writing">${NAV_ICONS.writing}<span>Escrever</span></a>
      <a href="#/mistakes" data-r="mistakes">${NAV_ICONS.mistakes}<span>Erros</span></a>
      <a href="#/settings" data-r="settings">${NAV_ICONS.settings}<span>Definições</span></a>
    </nav>
    <button class="avatar" id="logout" title="Sair (${esc(me.name)})">${me.photo ? `<img src="${esc(me.photo)}" alt="" referrerpolicy="no-referrer">` : initial}</button>
  </header>
  <main id="view"></main>`;
  $app.querySelector('#logout').addEventListener('click', () => backend.signOut());
}

function route() {
  if (!document.getElementById('view')) return;
  const [, name = '', arg] = location.hash.split('/');
  const r = name.split('?')[0];
  document.querySelectorAll('#nav a').forEach((a) => a.classList.toggle('on', a.dataset.r === (r || 'home') || (r === 'topic' && a.dataset.r === 'practice')));
  if (r === 'practice') return viewPractice();
  if (r === 'topic') return viewTopic(arg);
  if (r === 'quiz') return quiz ? viewQuiz() : (location.hash = '#/practice');
  if (r === 'writing') return viewWriting();
  if (r === 'mistakes') return viewMistakes();
  if (r === 'settings') return viewSettings();
  return viewHome();
}

// ---------- dashboard ----------
function ring(value) {
  const r = 52, c = 2 * Math.PI * r;
  const off = c * (1 - (value || 0));
  return `<svg class="ring" viewBox="0 0 120 120"><circle cx="60" cy="60" r="${r}" class="ring-bg"/><circle cx="60" cy="60" r="${r}" class="ring-fg" stroke-dasharray="${c}" stroke-dashoffset="${off}" transform="rotate(-90 60 60)"/><text x="60" y="66" text-anchor="middle" class="ring-txt">${value == null ? '–' : Math.round(value * 100) + '%'}</text></svg>`;
}

function topicRow({ topic, stat, status }) {
  return `<a class="trow" href="#/topic/${topic.id}">
    <span class="tnum">${topic.n}</span>
    <span class="tmain"><b>${esc(topic.title)}</b>
      <span class="bar"><i class="${status.key}" style="width:${Math.round((status.acc ?? 0) * 100)}%"></i></span></span>
    <span class="tside"><span class="chip ${status.key}">${status.label}</span><small>${stat?.n ? `${pct(status.acc)} · ${Math.round(stat.n)} resp.` : ''}</small></span>
  </a>`;
}

function viewHome() {
  const s = store.summary();
  const first = esc((me.name || '').split(' ')[0]);
  const nextCard = s.next
    ? `<div class="card hero-next"><span class="eyebrow">Estuda a seguir · Tópico ${s.next.topic.n}</span>
        <h3>${esc(s.next.topic.title)}</h3>
        <p class="muted">${s.next.status.key === 'new' ? 'Ainda não começaste este tópico.' : `Precisão recente: ${pct(s.next.status.acc)}.`}</p>
        <a class="btn primary" href="#/topic/${s.next.topic.id}">Praticar agora →</a></div>`
    : `<div class="card hero-next"><span class="eyebrow">Parabéns</span><h3>Todos os tópicos dominados</h3><p class="muted">Continua a praticar com exercícios gerados por IA.</p></div>`;
  setView(`
  <section class="page">
    <h1>Olá${first ? ', ' + first : ''}.</h1>
    <div class="grid2">
      <div class="card score">
        ${ring(s.acc)}
        <div><span class="eyebrow">Pontuação geral</span>
        <p><b>${Math.round(s.correct)}</b> certas em <b>${s.answered}</b> respostas</p>
        <p class="muted">${s.started}/${TOPICS.length} tópicos iniciados</p></div>
      </div>
      ${nextCard}
    </div>
    <div class="stats">
      <div class="card stat"><b>${s.sessions}</b><span>sessões</span></div>
      <div class="card stat"><b>${s.streak}</b><span>dias seguidos</span></div>
      <a class="card stat link" href="#/mistakes"><b>${s.mistakes}</b><span>erros para rever</span></a>
    </div>
    ${s.weak.length ? `<div class="card warn"><b>Estás a falhar muito em:</b> ${s.weak.map((t) => `<a href="#/topic/${t.topic.id}">${esc(t.topic.title)}</a>`).join(', ')}</div>` : ''}
    <h2>Tópicos <small class="muted">(do mais fraco para o mais forte)</small></h2>
    <div class="card list">${s.ranked.map(topicRow).join('')}</div>
    ${s.recent.length ? `<h2>Atividade recente</h2><div class="card list">${s.recent.map((r) => {
      const t = topicById(r.topic);
      return `<div class="trow static"><span class="tnum">${t ? t.n : '↻'}</span><span class="tmain"><b>${esc(t ? t.title : 'Rever erros')}</b><small class="muted">${fmtDate(r.at)} · ${r.source === 'ai' ? 'IA' : 'site'}</small></span><span class="tside"><b>${r.score}/${r.total}</b></span></div>`;
    }).join('')}</div>` : ''}
  </section>`);
}

// ---------- práticar / tópicos ----------
function viewPractice() {
  const s = store.summary();
  setView(`<section class="page"><h1>Praticar</h1><p class="muted">Escolhe um tópico do teste.</p>
    <div class="card list">${s.topics.map(topicRow).join('')}</div></section>`);
}

function viewTopic(id) {
  const t = topicById(id);
  if (!t) return (location.hash = '#/practice');
  const stat = store.state.topics[t.id];
  const st = store.topicStatus(stat);
  let actions;
  if (t.kind === 'writing') {
    actions = `<a class="btn primary" href="#/writing">Ir escrever →</a>`;
  } else if (t.kind === 'reading') {
    actions = `<button class="btn primary" data-act="reading-bank">Texto do site</button>
      <div class="inline"><input id="theme" placeholder="Tema (opcional, ex: travel, school)" aria-label="Tema do texto" /><button class="btn" data-act="reading-ai">Gerar texto com IA</button></div>`;
  } else {
    actions = `<button class="btn primary" data-act="bank">10 perguntas do site</button>
      <button class="btn" data-act="ai">10 perguntas novas com IA</button>`;
  }
  setView(`<section class="page narrow">
    <a class="back" href="#/practice">← Tópicos</a>
    <div class="card"><div class="topic-head"><span class="tnum big">${String(t.n).padStart(2, '0')}</span><div><h1>${esc(t.title)}</h1><p class="muted">${esc(t.desc)}</p></div></div>
    <div class="stats mini"><div><b>${stat?.n ? pct(st.acc) : '–'}</b><span>precisão recente</span></div><div><b>${stat?.n ? Math.round(stat.n) : 0}</b><span>respostas</span></div><div><span class="chip ${st.key}">${st.label}</span></div></div>
    <div class="actions">${actions}</div></div></section>`);
  view().querySelectorAll('[data-act]').forEach((b) =>
    b.addEventListener('click', async () => {
      if (busy) return;
      const act = b.dataset.act;
      try {
        if (act === 'bank') startQuiz(t, 'site', pickFromBank(t.id, 10));
        if (act === 'reading-bank') {
          const r = READINGS[Math.floor(Math.random() * READINGS.length)];
          startQuiz(t, 'site', r.questions.map((q) => ({ ...q, topic: 'reading' })), { title: r.title, text: r.text });
        }
        if (act === 'ai') {
          busy = true;
          loading('A gerar exercícios com IA…');
          const qs = await ai.generateQuestions(t, 10, level());
          startQuiz(t, 'ai', qs.map((q) => ({ ...q, topic: t.id })));
        }
        if (act === 'reading-ai') {
          busy = true;
          loading('A escrever um texto novo…');
          const r = await ai.generateReading(level(), view().querySelector('#theme')?.value.trim());
          startQuiz(t, 'ai', r.questions.map((q) => ({ ...q, topic: 'reading' })), { title: r.title, text: r.text });
        }
      } catch (e) {
        aiError(e);
        viewTopic(id);
      } finally {
        busy = false;
      }
    }),
  );
}

function pickFromBank(topicId, n) {
  // dá prioridade a perguntas que já falhaste
  const all = BANK[topicId].map((q) => ({ ...q, topic: topicId }));
  const missed = all.filter((q) => store.state.mistakes[store.hash(q.q)]);
  const rest = shuffle(all.filter((q) => !missed.includes(q)));
  return [...shuffle(missed), ...rest].slice(0, n);
}

// ---------- quiz ----------
function startQuiz(topic, source, questions, passage = null) {
  quiz = {
    topicId: topic?.id || 'mistakes',
    source,
    passage,
    questions: questions.map((q) => (q.type === 'mc' ? { ...q, options: shuffle(q.options) } : q)),
    i: 0,
    items: [],
    answered: false,
  };
  location.hash = '#/quiz';
  if (location.hash === '#/quiz') viewQuiz();
}

function viewQuiz() {
  const q = quiz.questions[quiz.i];
  const t = topicById(quiz.topicId);
  const total = quiz.questions.length;
  const body =
    q.type === 'mc'
      ? `<div class="options">${q.options.map((o, i) => `<button class="opt" data-i="${i}">${esc(o)}</button>`).join('')}</div>`
      : `<form id="gapForm" class="inline"><input id="gap" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Escreve a resposta" autofocus /><button class="btn primary" type="submit">Verificar</button></form>`;
  setView(`<section class="page narrow">
    <div class="quiz-top"><button class="link-btn" id="quit">✕ Sair</button><span>${t ? esc(t.title) : 'Rever erros'}</span><span>${quiz.i + 1}/${total}</span></div>
    <div class="progress"><i style="width:${(quiz.i / total) * 100}%"></i></div>
    ${quiz.passage ? `<details class="card passage" ${quiz.i === 0 ? 'open' : ''}><summary>📖 ${esc(quiz.passage.title)}</summary>${quiz.passage.text.split(/\n\n+/).map((p) => `<p>${esc(p)}</p>`).join('')}</details>` : ''}
    <div class="card question"><p class="qtext">${esc(q.q)}</p>${body}<div id="fb"></div></div>
  </section>`);
  view().querySelector('#quit').addEventListener('click', () => {
    if (quiz.items.length && !confirm('Sair agora? Os resultados desta sessão não serão guardados.')) return;
    quiz = null;
    location.hash = '#/practice';
  });
  view().querySelectorAll('.opt').forEach((b) => b.addEventListener('click', () => answer(q.options[+b.dataset.i], b)));
  view().querySelector('#gapForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    answer(view().querySelector('#gap').value);
  });
  view().querySelector('#gap')?.focus();
}

function answer(your, btn) {
  if (quiz.answered) return;
  quiz.answered = true;
  const q = quiz.questions[quiz.i];
  const ok = q.type === 'mc' ? your === q.answer : q.answers.some((a) => norm(a) === norm(your));
  quiz.items.push({ topic: q.topic || quiz.topicId, ok, q: stripQ(q), your });
  if (q.type === 'mc') {
    view().querySelectorAll('.opt').forEach((b) => {
      b.disabled = true;
      if (b.textContent === q.answer) b.classList.add('right');
    });
    if (!ok) btn.classList.add('wrong');
  } else {
    view().querySelector('#gap').disabled = true;
    view().querySelector('#gapForm button').hidden = true;
  }
  const correct = q.type === 'mc' ? q.answer : q.answers[0];
  const last = quiz.i === quiz.questions.length - 1;
  view().querySelector('#fb').innerHTML = `<div class="feedback ${ok ? 'ok' : 'bad'}">
    <b>${ok ? 'Correto.' : 'Não foi bem.'}</b>${ok ? '' : ` Resposta certa: <b>${esc(correct)}</b>`}
    ${q.explain ? `<p>${esc(q.explain)}</p>` : ''}</div>
    <button class="btn primary wide" id="next" autofocus>${last ? 'Ver resultado' : 'Seguinte →'}</button>`;
  const next = view().querySelector('#next');
  next.focus();
  next.addEventListener('click', nextQuestion);
}

const stripQ = (q) => {
  const { type, q: text, options, answer, answers, explain } = q;
  return { type, q: text, ...(options && { options }), ...(answer != null && { answer }), ...(answers && { answers }), explain: explain || '' };
};

async function nextQuestion() {
  quiz.answered = false;
  if (quiz.i < quiz.questions.length - 1) {
    quiz.i++;
    return viewQuiz();
  }
  loading('A guardar resultado…');
  try {
    const session = await store.saveSession({ topicId: quiz.topicId, source: quiz.source, items: quiz.items });
    viewResult(session);
  } catch (e) {
    toast('Não foi possível guardar: ' + e.message, 'err');
    viewResult({ score: quiz.items.filter((i) => i.ok).length, total: quiz.items.length });
  }
}

function viewResult(session) {
  const wrong = quiz.items.filter((i) => !i.ok);
  const p = session.score / session.total;
  const msg = p >= 0.9 ? 'Excelente!' : p >= 0.7 ? 'Muito bom!' : p >= 0.5 ? 'Vai melhorando.' : 'Precisas de rever este tópico.';
  const t = topicById(quiz.topicId);
  setView(`<section class="page narrow">
    <div class="card result">${ring(p)}<h1>${session.score}/${session.total}</h1><p>${msg}</p></div>
    ${wrong.length ? `<h2>Para rever</h2>${wrong.map((w) => `<div class="card miss"><p><b>${esc(w.q.q)}</b></p>
      <p class="bad-t">A tua resposta: ${esc(w.your || '—')}</p><p class="ok-t">Certa: ${esc(w.q.type === 'mc' ? w.q.answer : w.q.answers[0])}</p>
      ${w.q.explain ? `<p class="muted">${esc(w.q.explain)}</p>` : ''}</div>`).join('')}` : ''}
    <div class="actions"><a class="btn primary" href="#/topic/${t ? t.id : 'future'}" ${t ? '' : 'hidden'}>Praticar outra vez</a><a class="btn" href="#/">Início</a></div>
  </section>`);
  quiz = null;
}

// ---------- rever erros ----------
function viewMistakes() {
  const list = Object.values(store.state.mistakes);
  if (!list.length) {
    return setView(`<section class="page narrow"><h1>Erros</h1><div class="card center-card"><p>Não tens erros por rever.</p><a class="btn primary" href="#/practice">Praticar</a></div></section>`);
  }
  const by = {};
  list.forEach((m) => (by[m.topic] = (by[m.topic] || 0) + 1));
  setView(`<section class="page narrow"><h1>Erros para rever</h1>
    <p class="muted">Respondendo certo a uma pergunta, ela sai desta lista.</p>
    <div class="card"><p><b>${list.length}</b> perguntas falhadas</p>
      <div class="chips">${Object.entries(by).map(([k, n]) => `<span class="chip">${esc(topicById(k)?.title || k)}: ${n}</span>`).join('')}</div>
      <div class="actions"><button class="btn primary" id="go">Rever ${Math.min(10, list.length)} agora</button></div></div></section>`);
  view().querySelector('#go').addEventListener('click', () => {
    const qs = shuffle(list).slice(0, 10).map(({ at, your, ...q }) => q);
    startQuiz(null, 'site', qs);
  });
}

// ---------- composição ----------
function viewWriting() {
  const p = WRITING_PROMPTS[0];
  const history = Object.values(store.state.writings).sort((a, b) => b.at - a.at);
  setView(`<section class="page narrow">
    <h1>${esc(p.title)}</h1>
    <p class="muted">Escreve entre <b>${p.min} e ${p.max} palavras</b>. A IA corrige e mostra como dizer melhor.</p>
    <div class="card"><ul class="hints">${p.hints.map((h) => `<li>${esc(h)}</li>`).join('')}</ul>
      <textarea id="essay" rows="10" placeholder="My friend's name is…" spellcheck="false" aria-label="O teu texto"></textarea>
      <div class="wc-row"><span id="wc" class="wc">0 palavras</span><button class="btn primary" id="submit">Corrigir com IA</button></div></div>
    <div id="result"></div>
    ${history.length ? `<h2>Composições anteriores</h2><div class="card list">${history.map((w, i) => `<button class="trow" data-h="${i}"><span class="tnum">${history.length - i}</span><span class="tmain"><b>${fmtDate(w.at)} · ${w.words} palavras</b><small class="muted">${esc(w.text.slice(0, 70))}…</small></span><span class="tside"><b>${w.feedback.score}/10</b></span></button>`).join('')}</div>` : ''}
  </section>`);
  const ta = view().querySelector('#essay');
  const wc = view().querySelector('#wc');
  const update = () => {
    const n = countWords(ta.value);
    wc.textContent = `${n} palavras`;
    wc.className = 'wc ' + (n === 0 ? '' : n >= p.min && n <= p.max ? 'ok' : 'bad');
  };
  ta.addEventListener('input', update);
  view().querySelector('#submit').addEventListener('click', async (e) => {
    const text = ta.value.trim();
    const words = countWords(text);
    if (words < 20) return toast('Escreve um pouco mais antes de corrigir.', 'err');
    if ((words < p.min || words > p.max) && !confirm(`O texto tem ${words} palavras (pedido: ${p.min}–${p.max}). Corrigir mesmo assim?`)) return;
    e.target.disabled = true;
    view().querySelector('#result').innerHTML = skFeedback();
    try {
      const feedback = await ai.correctWriting(text, p.title, level());
      await store.saveWriting({ prompt: p.title, text, words, feedback });
      view().querySelector('#result').innerHTML = renderFeedback(feedback, words, p);
    } catch (x) {
      view().querySelector('#result').innerHTML = '';
      aiError(x);
    } finally {
      e.target.disabled = false;
    }
  });
  view().querySelectorAll('[data-h]').forEach((b) =>
    b.addEventListener('click', () => {
      const w = history[+b.dataset.h];
      ta.value = w.text;
      update();
      view().querySelector('#result').innerHTML = renderFeedback(w.feedback, w.words, p);
      view().querySelector('#result').scrollIntoView({ behavior: 'smooth' });
    }),
  );
}

function renderFeedback(f, words, p) {
  const li = (a) => a.map((x) => `<li>${esc(x)}</li>`).join('');
  return `<div class="card feedback-card">
    <div class="fb-head">${ring(f.score / 10)}<div><h2>${f.score}/10</h2><p>${esc(f.summary)}</p><small class="muted">${words} palavras${words < p.min || words > p.max ? ' · fora do intervalo pedido' : ''}</small></div></div>
    ${f.strengths.length ? `<h3>Pontos fortes</h3><ul>${li(f.strengths)}</ul>` : ''}
    ${f.corrections.length ? `<h3>Correções</h3>${f.corrections.map((c) => `<div class="corr"><p><s>${esc(c.original)}</s> → <b>${esc(c.corrected)}</b></p><small class="muted">${esc(c.why)}</small></div>`).join('')}` : '<h3>Correções</h3><p>Sem erros relevantes.</p>'}
    ${f.betterPhrases.length ? `<h3>Como dizer melhor</h3>${f.betterPhrases.map((c) => `<div class="corr"><p>${esc(c.original)} → <b>${esc(c.better)}</b></p><small class="muted">${esc(c.why)}</small></div>`).join('')}` : ''}
    ${f.improvedVersion ? `<h3>Versão melhorada</h3><blockquote>${esc(f.improvedVersion)}</blockquote>` : ''}
    ${f.tips.length ? `<h3>Dicas</h3><ul>${li(f.tips)}</ul>` : ''}</div>`;
}

// ---------- definições ----------
function viewSettings() {
  const st = store.state.settings;
  setView(`<section class="page narrow"><h1>Definições</h1>
    <div class="card stack">
      <label>Nível de dificuldade da IA
        <select id="level">${['A2', 'B1', 'B2'].map((l) => `<option ${level() === l ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      ${backend.mode === 'local' ? `<label>Chave da API Gemini <small class="muted">(só modo local)</small>
        <input id="key" type="password" placeholder="AIza…" value="${esc(st.geminiKey || '')}" autocomplete="off" /></label>` : '<p class="muted small">A IA já está incluída: não precisas de nenhuma chave.</p>'}
      <button class="btn primary" id="save">Guardar</button>
    </div>
    <div class="card"><p>Sessão: <b>${esc(me.email || me.name)}</b> ${backend.mode === 'local' ? '<span class="chip">modo local</span>' : ''}</p><button class="btn" id="out">Terminar sessão</button></div></section>`);
  view().querySelector('#save').addEventListener('click', async () => {
    await store.saveSettings({ level: view().querySelector('#level').value, geminiKey: view().querySelector('#key')?.value.trim() || '' });
    toast('Guardado.');
  });
  view().querySelector('#out').addEventListener('click', () => backend.signOut());
}
