# EnglishPrep 🇬🇧

Site para preparar o teste de inglês (British English). HTML/CSS/JS puro (sem build), Firebase Auth + Realtime Database, Gemini para gerar exercícios e corrigir composições.

## Tópicos
1. Future forms · 2. Present Perfect vs Past Simple · 3. Mistos (future/PP/PS) · 4. Food · 5. Family · 6. Personality adjectives · 7. Money · 8. Reading comprehension · 9. Composição "Write about a friend" (100–140 palavras)

## Funcionalidades
- Login com Google ou email/password
- Banco de ~100 perguntas (funciona sem IA) + geração ilimitada de perguntas e textos de leitura com IA
- Progresso por tópico, pontuação geral, série de dias, **deteção de tópicos fracos** (precisão das últimas 30 respostas)
- "Erros": perguntas falhadas ficam guardadas até acertares
- Composição corrigida por IA: nota, correções, "como dizer melhor" e versão melhorada
- Modo local (sem Firebase) para experimentar

## Correr localmente
```bash
python3 -m http.server 8000   # abrir http://localhost:8000
```
(módulos ES precisam de servidor; não abre com duplo clique)

## Configurar Firebase e IA
Ver [SETUP.md](SETUP.md).
