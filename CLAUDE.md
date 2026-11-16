# EnglishPrep (repositório `duolinguito`)

Site para preparar o teste de inglês britânico. Interface e textos em **português europeu**; os exercícios são em inglês britânico.

## Stack e regras
- HTML/CSS/JS puro com módulos ES. **Sem build, sem bundler, sem dependências npm no site.** Deploy: GitHub Pages (branch `main`, pasta raiz).
- Firebase Auth + Realtime Database (`js/backend.js`, `js/store.js`). Regras em `database.rules.json`. Quando o Firebase não está configurado há um modo local em localStorage.
- IA via Cloudflare Worker (`worker/`), que guarda a chave Gemini. O browser nunca vê a chave.
- **Tudo tem de ser grátis.** Nunca adicionar serviços pagos nem dependências que exijam cartão. Mantém-te nos planos gratuitos (Firebase Spark, Cloudflare Free, Gemini free tier).
- **Nunca escrever segredos, chaves ou tokens em ficheiros.** A `apiKey` web do Firebase em `js/config.js` é pública por desenho.
- Estilo visual "Editorial" (ver `css/style.css`): sem emojis na interface, serifa nos títulos, uma cor de acento, tema claro/escuro por variáveis CSS. Segue o código à volta.
- Interfaces construídas com template strings: **escapar sempre texto dinâmico com `esc()`**.

## Como trabalhar a partir de issues
1. Quando pedirem um **plano**: responde só com um comentário (ficheiros a alterar, passos, riscos, dúvidas). Não alteres ficheiros nem abras pull request.
2. Só implementa quando o dono pedir explicitamente (ex.: "implementa"). Trabalha numa branch nova, nunca diretamente em `main`.
3. Mudanças pequenas e focadas. Verifica a sintaxe dos módulos alterados.
4. Se mexeres em `worker/`, avisa na descrição que é preciso `npx wrangler deploy` à mão (a Action não faz deploy do Worker).
5. Se mexeres na estrutura dos dados do Firebase ou nas regras, explica o impacto nos dados existentes.
