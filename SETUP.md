# Setup

## 1. Firebase
1. [Firebase Console](https://console.firebase.google.com/) → criar projeto (ex.: `englishprep`).
2. **Authentication → Sign-in method**: ativar **Google** e **Email/Password**.
3. **Realtime Database** → criar (região `europe-west1`). Em *Rules*, colar o conteúdo de `database.rules.json`.
4. **Project settings → Your apps → Web (`</>`)** → copiar a config para `js/config.js`.
5. **Authentication → Settings → Authorized domains**: adicionar o domínio onde publicares (ex.: `o-teu-user.github.io`; `localhost` já vem).

## 2. IA (Gemini)
- Criar chave em https://aistudio.google.com/apikey.
- Colar em **Definições** no site (fica em `users/{uid}/settings`, só tu a lês), **ou** criar o nó `config/geminiApiKey` na Realtime Database (partilhada por todos os utilizadores autenticados, como no BoraAli).
- A chave corre no browser: restringe-a por HTTP referrer (Google Cloud Console → Credentials) ao teu domínio.

## 3. Publicar
GitHub Pages: push dos ficheiros → Settings → Pages → branch `main`, pasta `/`.

## Estrutura de dados
```
users/{uid}/
  topics/{topicId}: { n, c, recent[≤30], last }
  sessions/{id}:    { topic, source, score, total, at }
  mistakes/{hash}:  { topic, type, q, options?, answer?, answers?, explain, your, at }
  writings/{id}:    { prompt, text, words, feedback{...}, at }
  settings:         { level, geminiKey }
```
