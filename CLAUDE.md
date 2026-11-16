# EnglishPrep (repositório `duolinguito`)

Site para preparar o teste de inglês britânico. Interface e textos em **português europeu**; os exercícios são em inglês britânico.

## Stack e regras
- HTML/CSS/JS puro com módulos ES. **Sem build, sem bundler, sem dependências npm no site.** Deploy: GitHub Pages (branch `main`, pasta raiz).
- Firebase Auth + Realtime Database (`js/backend.js`, `js/store.js`). Regras em `database.rules.json`. Quando o Firebase não está configurado há um modo local em localStorage.
- IA via Cloudflare Worker (`worker/`), que guarda a chave Gemini. O browser nunca vê a chave.
- `mcp/` é um segundo Worker (servidor MCP com OAuth GitHub) que deixa o Claude abrir e acompanhar issues deste repositório. Tem dependências npm próprias (só nessa pasta; o site continua sem npm). Deploy manual com `npx wrangler deploy` dentro de `mcp/`.
- **Tudo tem de ser grátis.** Nunca adicionar serviços pagos nem dependências que exijam cartão. Mantém-te nos planos gratuitos (Firebase Spark, Cloudflare Free, Gemini free tier).
- **Nunca escrever segredos, chaves ou tokens em ficheiros.** A `apiKey` web do Firebase em `js/config.js` é pública por desenho.
- Estilo visual "Editorial" (ver `css/style.css`): sem emojis na interface, serifa nos títulos, uma cor de acento, tema claro/escuro por variáveis CSS. Segue o código à volta.
- Interfaces construídas com template strings: **escapar sempre texto dinâmico com `esc()`**.

## Como trabalhar a partir de issues
1. Quando pedirem um **plano**: responde só com um comentário (ficheiros a alterar, passos, riscos, dúvidas). Não alteres ficheiros nem abras pull request.
2. Só implementa quando o dono pedir explicitamente (ex.: "implementa"). Trabalha numa branch nova, nunca diretamente em `main`.
3. Mudanças pequenas e focadas. Verifica a sintaxe dos módulos alterados.
4. Se mexeres em `worker/` ou `mcp/`, avisa na descrição que é preciso `npx wrangler deploy` à mão na respetiva pasta (a Action não faz deploy dos Workers).
5. Se mexeres na estrutura dos dados do Firebase ou nas regras, explica o impacto nos dados existentes.

## Pré-visualização visual (obrigatória quando a interface muda)
Sempre que um plano ou uma implementação alterar algo visível no site, gera imagens do resultado. Um passo do workflow publica-as depois num comentário (tu **não** publicas imagens nem fazes commit de `.preview/`).

- **No plano (antes de haver código):** faz um **protótipo temporário** no diretório de trabalho, escreve `.preview/spec.json` com `"prototype": true`, corre `node scripts/preview.mjs .preview/spec.json` e **reverte tudo** com `git checkout -- .` e `git clean -fd`. Nunca faças commit do protótipo nem o deixes no repositório. A pasta `.preview/` é ignorada pelo git e sobrevive à reversão. No comentário do plano escreve que a pré-visualização aparece num comentário seguinte.
- **Na implementação:** depois de alterar o código, corre o script com `"prototype": false` sobre o código final. Não faças commit de `.preview/`.
- **O que fotografar:** os ecrãs alterados, em **telemóvel primeiro** e desktop, tema claro e escuro quando as cores contam. Máximo de cerca de 8 imagens. Para estados específicos usa `steps` (clicar, preencher, selecionar texto, toque longo) e `seed` (por exemplo, lista de notas vazia). Se o ecrã depender da IA, usa `mockAI`.
- Formato do `spec.json` e passos disponíveis: ver o comentário no topo de `scripts/preview.mjs`. `node scripts/preview.mjs --default` fotografa os ecrãs principais.
- Se a alteração não tem efeito visual (Workers, regras, dados, refactor), não geres imagens e diz isso no plano.
- O script corre o site em modo local com dados de demonstração e sem rede. Não precisa de Firebase nem de chaves.
