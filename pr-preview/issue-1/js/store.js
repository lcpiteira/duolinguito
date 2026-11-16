// Estado do utilizador: estatísticas por tópico, sessões, erros a rever, composições, definições.
import * as backend from './backend.js';
import { TOPICS } from './data/topics.js';

let uid = null;
export let state = { topics: {}, sessions: {}, mistakes: {}, writings: {}, notes: {}, settings: {} };

const RECENT = 30; // janela de respostas recentes usada para avaliar cada tópico
const clean = (o) => JSON.parse(JSON.stringify(o));

export function hash(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return 'q' + (h >>> 0).toString(36);
}

export async function load(userId) {
  uid = userId;
  const d = await backend.loadUser(uid);
  state = { topics: {}, sessions: {}, mistakes: {}, writings: {}, notes: {}, settings: {}, ...d };
}

export function reset() {
  uid = null;
  state = { topics: {}, sessions: {}, mistakes: {}, writings: {}, notes: {}, settings: {} };
}

function bumpTopic(updates, topicId, values, now) {
  const s = state.topics[topicId] || { n: 0, c: 0, recent: [] };
  const next = {
    n: s.n + values.length,
    c: +(s.c + values.reduce((a, b) => a + b, 0)).toFixed(2),
    recent: [...(s.recent || []), ...values].slice(-RECENT),
    last: now,
  };
  state.topics[topicId] = next;
  updates[`topics/${topicId}`] = next;
}

// items: [{ topic, ok, q (pergunta completa), your }]
export async function saveSession({ topicId, source, items }) {
  const now = Date.now();
  const updates = {};
  const byTopic = {};
  items.forEach((it) => (byTopic[it.topic] ??= []).push(it.ok ? 1 : 0));
  for (const [t, vals] of Object.entries(byTopic)) bumpTopic(updates, t, vals, now);

  for (const it of items) {
    const key = hash(it.q.q);
    if (it.ok) {
      if (state.mistakes[key]) {
        delete state.mistakes[key];
        updates[`mistakes/${key}`] = null;
      }
    } else {
      const m = { ...it.q, topic: it.topic, your: it.your || '', at: now };
      state.mistakes[key] = m;
      updates[`mistakes/${key}`] = m;
    }
  }

  const id = `s${now}`;
  const session = { topic: topicId, source, score: items.filter((i) => i.ok).length, total: items.length, at: now };
  state.sessions[id] = session;
  updates[`sessions/${id}`] = session;
  await backend.writeUser(uid, clean(updates));
  return session;
}

export async function saveWriting({ prompt, text, words, feedback }) {
  const now = Date.now();
  const updates = {};
  const w = { prompt, text, words, feedback, at: now };
  state.writings[`w${now}`] = w;
  updates[`writings/w${now}`] = w;
  const score = Math.max(0, Math.min(10, Number(feedback.score) || 0));
  bumpTopic(updates, 'writing', [score / 10], now);
  const session = { topic: 'writing', source: 'ai', score, total: 10, at: now };
  state.sessions[`s${now}`] = session;
  updates[`sessions/s${now}`] = session;
  await backend.writeUser(uid, clean(updates));
}

// Notas: { text, topic?, context? } — id existente = editar
export async function saveNote({ id, ...note }) {
  const now = Date.now();
  const key = id || `n${now}${Math.random().toString(36).slice(2, 6)}`;
  const n = { ...(state.notes[key] || {}), ...note, at: state.notes[key]?.at || now, edited: now };
  state.notes[key] = n;
  await backend.writeUser(uid, { [`notes/${key}`]: clean(n) });
  return key;
}

export async function deleteNote(id) {
  delete state.notes[id];
  await backend.writeUser(uid, { [`notes/${id}`]: null });
}

export async function saveSettings(settings) {
  state.settings = { ...state.settings, ...settings };
  await backend.writeUser(uid, { settings: clean(state.settings) });
}

export async function geminiKey() {
  return state.settings.geminiKey || (await backend.sharedGeminiKey());
}

// ---- análise de progresso ----
export function topicStatus(stat) {
  if (!stat || !stat.n) return { key: 'new', label: 'Por começar', acc: null };
  const r = stat.recent || [];
  const acc = r.reduce((a, b) => a + b, 0) / (r.length || 1);
  if (r.length < 5) return { key: 'learning', label: 'A começar', acc };
  if (acc >= 0.8) return { key: 'good', label: 'Dominado', acc };
  if (acc >= 0.6) return { key: 'ok', label: 'Quase lá', acc };
  return { key: 'weak', label: 'Estudar mais', acc };
}

function streakDays() {
  const days = new Set(Object.values(state.sessions).map((s) => new Date(s.at).toDateString()));
  let streak = 0;
  const d = new Date();
  if (!days.has(d.toDateString())) d.setDate(d.getDate() - 1); // ainda podes manter a série hoje
  while (days.has(d.toDateString())) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

export function summary() {
  const topics = TOPICS.map((t) => {
    const stat = state.topics[t.id];
    return { topic: t, stat, status: topicStatus(stat) };
  });
  const answered = topics.reduce((a, t) => a + (t.stat?.n || 0), 0);
  const correct = topics.reduce((a, t) => a + (t.stat?.c || 0), 0);
  const order = { weak: 0, ok: 1, learning: 2, new: 3, good: 4 };
  const ranked = [...topics].sort((a, b) => order[a.status.key] - order[b.status.key] || (a.status.acc ?? 1) - (b.status.acc ?? 1));
  const weak = topics.filter((t) => t.status.key === 'weak');
  const next = ranked[0].status.key === 'good' ? null : ranked[0];
  return {
    topics,
    ranked,
    weak,
    next,
    answered,
    correct,
    acc: answered ? correct / answered : null,
    started: topics.filter((t) => t.stat?.n).length,
    sessions: Object.values(state.sessions).length,
    streak: streakDays(),
    mistakes: Object.keys(state.mistakes).length,
    recent: Object.values(state.sessions).sort((a, b) => b.at - a.at).slice(0, 8),
  };
}
