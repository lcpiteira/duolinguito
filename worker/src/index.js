// Proxy do Gemini: só responde a utilizadores com login Firebase e limita pedidos por dia.
// A chave GEMINI_API_KEY fica como segredo do Worker e nunca chega ao browser.
const JWKS_URL = 'https://www.googleapis.com/robot/v1/metadata/jwk/securetoken@system.gserviceaccount.com';
const MAX_PROMPT = 8000;

const b64 = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));
const parts = (t) => t.split('.');
const json = (o) => JSON.parse(new TextDecoder().decode(b64(o)));

async function verifyFirebaseToken(token, projectId) {
  const [h, p, s] = parts(token);
  if (!h || !p || !s) throw new Error('token malformado');
  const header = json(h);
  const payload = json(p);
  if (header.alg !== 'RS256') throw new Error('algoritmo inválido');

  const res = await fetch(JWKS_URL, { cf: { cacheTtl: 3600, cacheEverything: true } });
  const jwk = (await res.json()).keys.find((k) => k.kid === header.kid);
  if (!jwk) throw new Error('chave desconhecida');
  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
  const ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, b64(s), new TextEncoder().encode(`${h}.${p}`));
  if (!ok) throw new Error('assinatura inválida');

  const now = Math.floor(Date.now() / 1000);
  if (payload.aud !== projectId || payload.iss !== `https://securetoken.google.com/${projectId}`) throw new Error('projeto inválido');
  if (payload.exp < now || payload.iat > now + 60 || !payload.sub) throw new Error('token expirado');
  return payload.sub;
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const allowed = env.ALLOWED_ORIGINS.split(',');
    const cors = {
      'Access-Control-Allow-Origin': allowed.includes(origin) ? origin : allowed[0],
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      Vary: 'Origin',
    };
    const reply = (status, body) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (request.method !== 'POST') return reply(405, { error: 'Método não permitido' });
    if (!allowed.includes(origin)) return reply(403, { error: 'Origem não autorizada' });

    let uid;
    try {
      uid = await verifyFirebaseToken((request.headers.get('Authorization') || '').replace(/^Bearer /, ''), env.FIREBASE_PROJECT_ID);
    } catch {
      return reply(401, { error: 'Sessão inválida. Volta a entrar.' });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return reply(400, { error: 'Pedido inválido' });
    }
    const { system = '', prompt = '', temperature = 0.8 } = body;
    if (!prompt || prompt.length > MAX_PROMPT || system.length > MAX_PROMPT) return reply(400, { error: 'Texto demasiado grande' });

    // limite diário por utilizador (KV grátis)
    const usageKey = `${uid}:${new Date().toISOString().slice(0, 10)}`;
    const used = parseInt((await env.USAGE.get(usageKey)) || '0', 10);
    const limit = parseInt(env.DAILY_LIMIT, 10);
    if (used >= limit) return reply(429, { error: `Atingiste o limite de ${limit} pedidos de IA por hoje. Volta amanhã.` });
    await env.USAGE.put(usageKey, String(used + 1), { expirationTtl: 172800 });

    const upstream = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${env.GEMINI_MODEL}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json', temperature: Math.min(1.2, Math.max(0, Number(temperature) || 0.8)) },
      }),
    });
    if (upstream.ok) return new Response(upstream.body, { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } });

    // Reserva: Gemini sem quota ou com erro → Workers AI (grátis), devolvido no mesmo formato do Gemini
    try {
      const out = await env.AI.run(env.FALLBACK_MODEL, {
        messages: [
          { role: 'system', content: `${system}\nReply with a single valid JSON object and nothing else.` },
          { role: 'user', content: prompt },
        ],
        temperature: Math.min(1, Math.max(0, Number(temperature) || 0.7)),
        max_tokens: 3000,
      });
      const text = typeof out.response === 'string' ? out.response : JSON.stringify(out.response);
      return reply(200, { candidates: [{ content: { parts: [{ text }] } }], fallback: true });
    } catch {
      return reply(upstream.status === 429 ? 429 : 502, { error: 'A IA está sem quota grátis por agora. Tenta daqui a pouco ou usa as perguntas do site.' });
    }
  },
};
