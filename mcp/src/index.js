// Worker MCP com OAuth: o claude.ai regista-se aqui, o utilizador entra com GitHub e só a conta
// ALLOWED_GITHUB_USER é aceite. Os issues são criados com GITHUB_PAT (secret), nunca com o token do utilizador.
import { OAuthProvider, AuthorizationError, authorizationErrorRedirect } from '@cloudflare/workers-oauth-provider';
import { handleMcp } from './mcp.js';

const esc = (v) => String(v).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const html = (body, headers = new Headers(), status = 200) => {
  headers.set('Content-Type', 'text/html; charset=utf-8');
  return new Response(body, { status, headers });
};

const layout = (title, inner) => `<!doctype html><html lang="pt"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<style>body{font:16px/1.5 system-ui,sans-serif;max-width:30rem;margin:12vh auto;padding:0 1.2rem;color:#1a1f36;background:#f4efe6}
h1{font-family:Georgia,serif;font-size:1.5rem}button{font:inherit;font-weight:600;padding:.8rem 1.4rem;border:1px solid #1a1f36;border-radius:4px;cursor:pointer;min-height:48px}
button[value=approve]{background:#1a1f36;color:#f4efe6}button[value=deny]{background:none}.muted{color:#4a4f66;font-size:.9rem}</style>${inner}</html>`;

function consentPage(details, handle) {
  const origin = details.clientDomain ? `Publicado por <b>${esc(details.clientDomain)}</b>.` : 'Esta aplicação registou-se sozinha; o nome não está verificado.';
  return layout(
    'Autorizar acesso',
    `<h1>Permitir que “${esc(details.clientName)}” gira os issues do EnglishPrep?</h1>
<p>${origin} O acesso será enviado para <b>${esc(details.redirectHost)}</b>.</p>
<p class="muted">Vai poder abrir, ler e comentar issues no repositório. Depois escolhes entrar com o GitHub.</p>
<form method="post"><input type="hidden" name="handle" value="${esc(handle)}">
<p><button name="decision" value="approve">Permitir</button> <button name="decision" value="deny">Recusar</button></p></form>`,
  );
}

const errorPage = (message, status = 400) => html(layout('Erro', `<h1>Não foi possível autorizar</h1><p>${esc(message)}</p>`), new Headers(), status);

async function showConsent(request, env) {
  const oauth = env.OAUTH_PROVIDER;
  const authRequest = await oauth.parseAuthRequest(request);
  const details = await oauth.describeConsent(authRequest);
  const consent = await oauth.beginConsent(authRequest);
  return html(consentPage(details, consent.handle), consent.headers);
}

async function submitConsent(request, env) {
  const oauth = env.OAUTH_PROVIDER;
  const form = await request.formData();
  const handle = String(form.get('handle'));
  if (form.get('decision') !== 'approve') {
    const denied = await oauth.denyConsent(request, handle);
    return new Response(null, { status: 302, headers: denied.headers });
  }
  const approved = await oauth.approveConsent(request, handle, { scope: [] });
  const { state, headers } = await oauth.beginUpstream(approved.request, { data: {}, headers: approved.headers });
  const upstream = new URL('https://github.com/login/oauth/authorize');
  upstream.searchParams.set('client_id', env.GITHUB_CLIENT_ID);
  upstream.searchParams.set('redirect_uri', `${new URL(request.url).origin}/callback`);
  upstream.searchParams.set('state', state);
  upstream.searchParams.set('allow_signup', 'false');
  headers.set('Location', upstream.toString());
  return new Response(null, { status: 302, headers });
}

async function githubUser(code, env, origin) {
  const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'User-Agent': 'englishprep-mcp' },
    body: JSON.stringify({ client_id: env.GITHUB_CLIENT_ID, client_secret: env.GITHUB_CLIENT_SECRET, code, redirect_uri: `${origin}/callback` }),
  });
  const { access_token } = await tokenRes.json().catch(() => ({}));
  if (!access_token) return null;
  const userRes = await fetch('https://api.github.com/user', {
    headers: { Authorization: `Bearer ${access_token}`, Accept: 'application/vnd.github+json', 'User-Agent': 'englishprep-mcp' },
  });
  return userRes.ok ? userRes.json() : null;
}

async function callback(request, env) {
  const oauth = env.OAUTH_PROVIDER;
  const url = new URL(request.url);
  const { request: original, headers } = await oauth.finishUpstream(request);
  const redirect = (location) => {
    headers.set('Location', location);
    return new Response(null, { status: 302, headers });
  };
  const code = url.searchParams.get('code');
  if (url.searchParams.get('error') || !code) return redirect(authorizationErrorRedirect(original, 'access_denied'));

  const user = await githubUser(code, env, url.origin);
  if (!user || String(user.login).toLowerCase() !== env.ALLOWED_GITHUB_USER.toLowerCase()) {
    return redirect(authorizationErrorRedirect(original, 'access_denied'));
  }
  const { redirectTo } = await oauth.completeAuthorization({
    request: original,
    userId: String(user.id),
    metadata: { login: user.login },
    scope: original.scope,
    props: { login: user.login },
  });
  return redirect(redirectTo);
}

const defaultHandler = {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    try {
      if (pathname === '/authorize') return request.method === 'POST' ? await submitConsent(request, env) : await showConsent(request, env);
      if (pathname === '/callback') return await callback(request, env);
    } catch (e) {
      if (e instanceof AuthorizationError && e.redirectTo) return Response.redirect(e.redirectTo, 302);
      if (e instanceof AuthorizationError) return errorPage(e.description || 'Pedido inválido ou expirado. Tenta outra vez.');
      throw e;
    }
    return new Response('EnglishPrep MCP', { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  },
};

const apiHandler = {
  fetch(request, env, ctx) {
    // O token OAuth já foi validado pela biblioteca; confirma a conta por segurança.
    if (String(ctx.props?.login || '').toLowerCase() !== env.ALLOWED_GITHUB_USER.toLowerCase()) {
      return new Response('Acesso negado', { status: 403 });
    }
    return handleMcp(request, env);
  },
};

export default new OAuthProvider({
  apiRoute: '/mcp',
  apiHandler,
  defaultHandler,
  authorizeEndpoint: '/authorize',
  tokenEndpoint: '/oauth/token',
  clientRegistrationEndpoint: '/oauth/register',
  scopesSupported: [],
  resourceMetadata: {
    resource: 'https://englishprep-mcp.lcpiteira.workers.dev/mcp',
    authorization_servers: ['https://englishprep-mcp.lcpiteira.workers.dev'],
  },
});
