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
    return JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1));
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

const RULES = `QUALITY RULES (very important):
- Every sentence must sound natural, like real British English that a native speaker would say. No odd or nonsensical sentences.
- Exactly ONE option must be correct. Check each distractor: it must be clearly wrong in this context, never also acceptable. Never use "all of the above" or "none".
- Include a clear clue in the sentence (time expression, context, or a second sentence) so that only one answer fits. If two answers could fit, rewrite the question.
- For gap-fill, give the verb in brackets when it is a grammar question, and list ALL acceptable answers in "answers", including contractions (e.g. "'ll go" and "will go").
- Each "explain" must state the rule that makes the answer correct, in one short sentence.
- Double-check every answer before returning.`;

const norm = (s) => String(s).toLowerCase().replace(/[’‘`]/g, "'").replace(/\s+/g, ' ').trim().replace(/[.!]$/, '');

// Segunda passagem: a IA resolve as perguntas sem ver a resposta; descarta as que discordam ou são ambíguas.
async function verify(questions, passage) {
  const items = questions.map((q, id) => ({ id, type: q.type, q: q.q, ...(q.type === 'mc' ? { options: q.options } : {}) }));
  try {
    const data = await call(
      `You are a strict examiner. ${passage ? `Read this text:\n"""${passage}"""\n` : ''}Solve each question yourself, independently.
For each one return: "answer" (for multiple choice the exact text of the best option; for gap-fill the word(s) that fit),
and "problem": true if the question is ambiguous, has more than one correct answer, has no correct answer, or the sentence sounds unnatural or wrong.
Return {"results":[{"id":0,"answer":"...","problem":false}]}
Questions: ${JSON.stringify(items)}`,
      0,
    );
    const byId = new Map((data.results || []).map((r) => [r.id, r]));
    return questions.filter((q, id) => {
      const r = byId.get(id);
      if (!r) return true; // sem veredicto: mantém
      if (r.problem) return false;
      return q.type === 'mc' ? norm(r.answer) === norm(q.answer) : q.answers.some((a) => norm(a) === norm(r.answer));
    });
  } catch {
    return questions; // se a verificação falhar, usa as perguntas como vieram
  }
}

export async function generateQuestions(topic, n, level) {
  const data = await call(
    `Create ${n + 3} NEW exercises (CEFR ${level}) on this topic:
${topic.aiHint}
Mix about 70% multiple choice (4 options) and 30% gap-fill. Vary the situations and sentence patterns.
${RULES}
Return {"questions":[ ${QUESTION_SHAPE} ]}`,
    0.5,
  );
  const qs = await verify((data.questions || []).map(normalise).filter(Boolean));
  if (qs.length < 3) throw new Error('A IA não gerou perguntas fiáveis desta vez. Tenta outra vez.');
  return qs.slice(0, n);
}

export async function generateReading(level, theme) {
  const data = await call(
    `Write an original reading text of 150-190 words (CEFR ${level}, British setting) about: ${theme || 'everyday life'}. It must read naturally, like a real short article or story.
Then write 6 comprehension questions: 4 multiple choice and 2 True/False (multiple choice with options ["True","False"]). Every answer must be clearly supported by the text.
${RULES}
Return {"title":"...","text":"paragraphs separated by \\n\\n","questions":[ ${QUESTION_SHAPE} ]}`,
    0.5,
  );
  if (!data.text) throw new Error('A IA não gerou um texto válido.');
  const questions = await verify((data.questions || []).map(normalise).filter(Boolean), data.text);
  if (questions.length < 3) throw new Error('A IA não gerou um texto fiável desta vez. Tenta outra vez.');
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
