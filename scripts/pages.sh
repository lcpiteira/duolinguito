#!/usr/bin/env bash
# Publica o site na branch gh-pages: produção na raiz, ambientes temporários em pr-preview/<id>/.
#
# Uso:   REMOTE_URL=<url do repositório> scripts/pages.sh site
#        REMOTE_URL=... scripts/pages.sh preview issue-12
#        REMOTE_URL=... scripts/pages.sh cleanup issue-12
# Corre na raiz do checkout que se quer publicar.
set -euo pipefail

cmd="${1:?uso: pages.sh site|preview|cleanup [id]}"
id="${2:-}"
: "${REMOTE_URL:?falta REMOTE_URL}"

if [[ "$cmd" != site && ! "$id" =~ ^(issue|pr)-[0-9]+$ ]]; then
  echo "id inválido: '$id' (esperado issue-N ou pr-N)" >&2
  exit 2
fi

REPO="$(git rev-parse --show-toplevel)"
WORK="${WORKDIR:-$(mktemp -d)}"
GH="$WORK/gh"
SRC="$WORK/src"

# Publica exatamente o que está commitado (nunca ficheiros locais ou ignorados pelo git)
mkdir -p "$SRC"
git -C "$REPO" archive HEAD | tar -x -C "$SRC"

# O que NÃO faz parte do site publicado
EXCLUDES=(--exclude=.git --exclude=.github --exclude=node_modules --exclude=.preview --exclude=worker --exclude=mcp
  --exclude=scripts --exclude=CLAUDE.md --exclude=SETUP.md --exclude=README.md --exclude=firebase.json
  --exclude=.firebaserc --exclude=database.rules.json --exclude=.gitignore --exclude=pr-preview)

if git ls-remote --exit-code --heads "$REMOTE_URL" gh-pages >/dev/null 2>&1; then
  git clone --quiet --depth 1 --branch gh-pages "$REMOTE_URL" "$GH"
else
  git init -q -b gh-pages "$GH"
  git -C "$GH" remote add origin "$REMOTE_URL"
fi
touch "$GH/.nojekyll"

case "$cmd" in
  site)
    rsync -a --delete "${EXCLUDES[@]}" "$SRC/" "$GH/"   # pr-preview/ fica protegido pelo --exclude
    msg="Deploy de produção ($(git -C "$REPO" rev-parse --short HEAD))"
    ;;
  preview)
    mkdir -p "$GH/pr-preview/$id"
    rsync -a --delete "${EXCLUDES[@]}" "$SRC/" "$GH/pr-preview/$id/"
    # etiqueta bem visível: este ambiente é temporário e usa os dados reais
    ID="$id" python3 - "$GH/pr-preview/$id/index.html" <<'PY'
import os, sys
p = sys.argv[1]
html = open(p, encoding="utf-8").read()
badge = ('<div style="position:fixed;top:0;left:50%;transform:translateX(-50%);z-index:99999;background:#b3261e;'
         'color:#fff;font:600 12px system-ui,sans-serif;padding:3px 10px;border-radius:0 0 4px 4px;pointer-events:none">'
         'Pré-visualização · ' + os.environ["ID"] + ' · usa os teus dados reais</div>')
open(p, "w", encoding="utf-8").write(html.replace("</body>", badge + "</body>", 1))
PY
    msg="Ambiente temporário $id ($(git -C "$REPO" rev-parse --short HEAD))"
    ;;
  cleanup)
    rm -rf "$GH/pr-preview/$id"
    msg="Remove ambiente temporário $id"
    ;;
  *)
    echo "comando desconhecido: $cmd" >&2
    exit 2
    ;;
esac

git -C "$GH" add -A
if git -C "$GH" diff --cached --quiet; then
  echo "sem alterações para publicar"
  exit 0
fi
git -C "$GH" -c user.name="github-actions[bot]" -c user.email="41898282+github-actions[bot]@users.noreply.github.com" commit -q -m "$msg"
for attempt in 1 2 3; do
  git -C "$GH" push -q origin gh-pages && { echo "publicado: $msg"; exit 0; }
  git -C "$GH" pull -q --rebase origin gh-pages || true
done
echo "falhou o push para gh-pages" >&2
exit 1
