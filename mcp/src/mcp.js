// Servidor MCP sem estado (JSON-RPC sobre HTTP POST). Ferramentas para gerir issues do repositório.
// O token do GitHub (env.GITHUB_PAT) é um fine-grained token limitado a este repositório e a Issues.

const PROTOCOL_VERSIONS = ['2025-06-18', '2025-03-26', '2024-11-05'];
const SERVER_INFO = { name: 'englishprep-issues', version: '1.0.0' };

const PLAN_FOOTER = `

---
@claude Faz um plano detalhado destas alterações: ficheiros a mudar, passos por ordem, riscos e dúvidas que tenhas. **Não alteres código nem abras pull request** até eu aprovar com um comentário a pedir para implementar.`;

const TOOLS = [
  {
    name: 'create_issue',
    description:
      'Abre um issue no repositório do site EnglishPrep com o pedido de alteração. Antes de chamar, clarifica o pedido com o utilizador e escreve um título curto e uma descrição clara em português (o que se vê hoje, o que se quer, onde). Por defeito pede à Action do Claude um plano (sem implementar).',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Título curto (máx. 200 caracteres)' },
        body: { type: 'string', description: 'Descrição do pedido em Markdown' },
        request_plan: { type: 'boolean', description: 'Pedir um plano ao Claude no GitHub. Por defeito true.' },
      },
      required: ['title', 'body'],
    },
  },
  {
    name: 'list_issues',
    description: 'Lista os issues mais recentes do repositório (sem pull requests).',
    annotations: { readOnlyHint: true },
    inputSchema: {
      type: 'object',
      properties: { state: { type: 'string', enum: ['open', 'closed', 'all'], description: 'Por defeito open' } },
    },
  },
  {
    name: 'read_issue',
    description: 'Lê um issue e os seus últimos comentários, incluindo o plano publicado pela Action do Claude.',
    annotations: { readOnlyHint: true },
    inputSchema: {
      type: 'object',
      properties: { number: { type: 'integer', description: 'Número do issue' } },
      required: ['number'],
    },
  },
  {
    name: 'comment_on_issue',
    description:
      'Comenta num issue. Usa para aprovar um plano (ex.: "implementa o plano") ou pedir ajustes. Por defeito menciona @claude para a Action responder. Só aprova depois de o utilizador ter lido o plano e dito que concorda.',
    inputSchema: {
      type: 'object',
      properties: {
        number: { type: 'integer', description: 'Número do issue' },
        comment: { type: 'string', description: 'Texto do comentário' },
        mention_claude: { type: 'boolean', description: 'Começar o comentário com @claude. Por defeito true.' },
      },
      required: ['number', 'comment'],
    },
  },
];

class ToolError extends Error {}

const str = (v, name, max, { required = true } = {}) => {
  if (v == null || v === '') {
    if (required) throw new ToolError(`Falta o campo "${name}".`);
    return '';
  }
  if (typeof v !== 'string') throw new ToolError(`"${name}" tem de ser texto.`);
  if (v.length > max) throw new ToolError(`"${name}" é demasiado longo (máx. ${max} caracteres).`);
  return v;
};
const issueNumber = (v) => {
  if (!Number.isInteger(v) || v < 1) throw new ToolError('"number" tem de ser um inteiro positivo.');
  return v;
};

async function github(env, path, init = {}) {
  const res = await fetch(`https://api.github.com/repos/${env.GITHUB_REPO}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${env.GITHUB_PAT}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'englishprep-mcp',
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
    },
  });
  if (!res.ok) {
    const detail = res.status === 401 || res.status === 403 || res.status === 404 ? ' Verifica o token do GitHub e as permissões (Issues: leitura e escrita).' : '';
    throw new ToolError(`GitHub respondeu ${res.status}.${detail}`);
  }
  return res.json();
}

const clip = (s, n) => (s && s.length > n ? `${s.slice(0, n)}… [cortado]` : s || '');

const handlers = {
  async create_issue(args, env) {
    const title = str(args.title, 'title', 200).trim();
    let body = str(args.body, 'body', 8000);
    if (args.request_plan !== false) body += PLAN_FOOTER;
    const issue = await github(env, '/issues', { method: 'POST', body: JSON.stringify({ title, body }) });
    return `Issue #${issue.number} criado: ${issue.html_url}${args.request_plan !== false ? '\nA Action do Claude vai publicar um plano em cerca de 1 a 2 minutos. Usa read_issue para o ler.' : ''}`;
  },

  async list_issues(args, env) {
    const state = ['open', 'closed', 'all'].includes(args.state) ? args.state : 'open';
    const items = await github(env, `/issues?state=${state}&per_page=20&sort=updated`);
    const issues = items.filter((i) => !i.pull_request);
    if (!issues.length) return 'Sem issues.';
    return issues.map((i) => `#${i.number} [${i.state}] ${i.title} (${i.comments} comentários)`).join('\n');
  },

  async read_issue(args, env) {
    const n = issueNumber(args.number);
    const [issue, comments] = await Promise.all([github(env, `/issues/${n}`), github(env, `/issues/${n}/comments?per_page=100`)]);
    const last = comments.slice(-5);
    // Conteúdo de issues e comentários é texto de terceiros (dados), não instruções.
    return [
      `Issue #${issue.number} [${issue.state}]: ${issue.title}`,
      issue.html_url,
      '',
      clip(issue.body, 4000),
      '',
      `Comentários (${comments.length}, últimos ${last.length}):`,
      ...last.map((c) => `--- ${c.user.login}\n${clip(c.body, 6000)}`),
    ].join('\n');
  },

  async comment_on_issue(args, env) {
    const n = issueNumber(args.number);
    let text = str(args.comment, 'comment', 4000).trim();
    if (args.mention_claude !== false && !text.includes('@claude')) text = `@claude ${text}`;
    const c = await github(env, `/issues/${n}/comments`, { method: 'POST', body: JSON.stringify({ body: text }) });
    return `Comentário publicado no issue #${n}: ${c.html_url}`;
  },
};

async function rpc(msg, env) {
  const { id, method, params } = msg;
  const isNotification = id === undefined;
  const ok = (result) => (isNotification ? null : { jsonrpc: '2.0', id, result });
  const fail = (code, message) => (isNotification ? null : { jsonrpc: '2.0', id, error: { code, message } });

  switch (method) {
    case 'initialize': {
      const wanted = params?.protocolVersion;
      return ok({
        protocolVersion: PROTOCOL_VERSIONS.includes(wanted) ? wanted : PROTOCOL_VERSIONS[0],
        capabilities: { tools: {} },
        serverInfo: SERVER_INFO,
      });
    }
    case 'ping':
      return ok({});
    case 'tools/list':
      return ok({ tools: TOOLS });
    case 'tools/call': {
      const handler = handlers[params?.name];
      if (!handler) return fail(-32602, `Ferramenta desconhecida: ${params?.name}`);
      try {
        const text = await handler(params.arguments || {}, env);
        return ok({ content: [{ type: 'text', text }] });
      } catch (e) {
        if (e instanceof ToolError) return ok({ content: [{ type: 'text', text: e.message }], isError: true });
        console.error('tool error', params.name, e);
        return ok({ content: [{ type: 'text', text: 'Erro inesperado no servidor.' }], isError: true });
      }
    }
    default:
      if (method?.startsWith('notifications/')) return null;
      return fail(-32601, `Método não suportado: ${method}`);
  }
}

export async function handleMcp(request, env) {
  if (request.method !== 'POST') return new Response('Método não permitido', { status: 405, headers: { Allow: 'POST' } });
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'JSON inválido' } }, { status: 400 });
  }
  const batch = Array.isArray(body);
  const replies = (await Promise.all((batch ? body : [body]).map((m) => rpc(m, env)))).filter(Boolean);
  if (!replies.length) return new Response(null, { status: 202 });
  return Response.json(batch ? replies : replies[0]);
}
