// Integração Gemini: gerar exercícios, textos de leitura e corrigir composições.
import { geminiKey } from './store.js';
import * as backend from './backend.js';
import { AI_PROXY_URL } from './config.js';

const MODEL = 'gemini-2.5-flash';
const SYSTEM = `You are an expert British English teacher preparing a Portuguese student for an English test.
Always use British spelling and vocabulary (e.g. colour, mum, holiday, flat, biscuit).
Write every "explain", "why" and "tip" field in European Portuguese (pt-PT), short and clear. Exercise content itself is in English.
Reply with valid JSON only, exactly in the requested shape.`;

export class NoKeyError extends Error {}

async function request(prompt, temperature) {
  // Com Firebase: passa pelo Worker (chave escondida). Em modo local: chave pessoal das Definições.
  if (backend.mode === 'firebase') {
    return fetch(AI_PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await backend.getIdToken()}` },
      body: JSON.stringify({ system: SYSTEM, prompt, temperature }),
    });
  }
  const key = await geminiKey();
  if (!key) throw new NoKeyError('Falta a chave Gemini');
  return fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM }] },
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json', temperature },
    }),
  });
}

async function call(prompt, temperature = 0.8) {
  const res = await request(prompt, temperature);
  if (res.status === 429) {
    throw new Error('Limite grátis da IA atingido. Espera um minuto (ou até amanhã) ou usa as perguntas do site.');
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error?.message || `Erro da IA (${res.status})`);
  }
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') || '';
  try {
    return JSON.parse(text.replace(/^```json\s*|```$/g, ''));
  } catch {
    throw new Error('A IA devolveu uma resposta inválida. Tenta outra vez.');
  }
}

const QUESTION_SHAPE = `{"type":"mc","q":"sentence or question","options":["A","B","C","D"],"answer":"exact text of the correct option","explain":"..."}
or {"type":"gap","q":"sentence with ____ and the base verb in brackets if needed","answers":["accepted answer 1","accepted answer 2"],"explain":"..."}`;

function normalise(q) {
  if (!q || typeof q.q !== 'string' || !q.q.trim()) return null;
  if (q.type === 'gap' && Array.isArray(q.answers) && q.answers.length) {
    return { type: 'gap', q: q.q, answers: q.answers.map(String), explain: q.explain || '' };
  }
  if (q.type === 'mc' && Array.isArray(q.options) && q.options.length >= 3 && q.options.includes(q.answer)) {
    return { type: 'mc', q: q.q, options: q.options.map(String), answer: String(q.answer), explain: q.explain || '' };
  }
  return null;
}

export async function generateQuestions(topic, n, level) {
  const data = await call(`Create ${n} NEW exercises (CEFR ${level}) on this topic:
${topic.aiHint}
Mix about 70% multiple choice (4 options, exactly one correct) and 30% gap-fill. Vary the situations; avoid repeating the same sentence pattern.
Return {"questions":[ ${QUESTION_SHAPE} ]}`);
  const qs = (data.questions || []).map(normalise).filter(Boolean);
  if (!qs.length) throw new Error('A IA não gerou perguntas válidas.');
  return qs;
}

export async function generateReading(level, theme) {
  const data = await call(`Write an original reading text of 150-190 words (CEFR ${level}, British setting) about: ${theme || 'everyday life'}.
Then write 6 comprehension questions: 4 multiple choice and 2 True/False (as multiple choice with options ["True","False"]).
Return {"title":"...","text":"paragraphs separated by \\n\\n","questions":[ ${QUESTION_SHAPE} ]}`);
  const questions = (data.questions || []).map(normalise).filter(Boolean);
  if (!data.text || questions.length < 3) throw new Error('A IA não gerou um texto válido.');
  return { title: data.title || 'Reading', text: data.text, questions };
}

export async function correctWriting(text, promptTitle, level) {
  const data = await call(
    `The student wrote this text (CEFR target ${level}) for the task "${promptTitle}" (required length 100-140 words):
"""${text}"""
Evaluate it like an examiner and return JSON:
{"score": 0-10 number (grammar, vocabulary, organisation, task achievement),
 "summary": "one-sentence overall verdict",
 "strengths": ["..."],
 "corrections": [{"original":"exact words from the text","corrected":"fixed version","why":"short explanation of the rule"}],
 "betterPhrases": [{"original":"a correct but basic phrase from the text","better":"a more natural/richer British English alternative","why":"..."}],
 "improvedVersion": "the full text rewritten naturally in British English, 100-140 words, keeping the student's ideas",
 "tips": ["2-3 concrete tips to improve next time"]}
List at most 8 corrections and 5 better phrases. If there are no mistakes, return an empty corrections array.`,
    0.3,
  );
  return {
    score: Math.max(0, Math.min(10, Number(data.score) || 0)),
    summary: data.summary || '',
    strengths: data.strengths || [],
    corrections: data.corrections || [],
    betterPhrases: data.betterPhrases || [],
    improvedVersion: data.improvedVersion || '',
    tips: data.tips || [],
  };
}
