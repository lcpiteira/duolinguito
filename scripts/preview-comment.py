#!/usr/bin/env python3
"""Gera o comentário em Markdown com as pré-visualizações (.preview/captions.json).
Uso: BASE=<url base das imagens> python3 scripts/preview-comment.py [.preview/captions.json]"""
import html
import json
import os
import sys

path = sys.argv[1] if len(sys.argv) > 1 else ".preview/captions.json"
base = os.environ["BASE"].rstrip("/")
data = json.load(open(path, encoding="utf-8"))

out = ["### Pré-visualização", ""]
if data.get("prototype"):
    out.append("> Protótipo gerado automaticamente a partir da proposta. **Ainda não está no código** e pode diferir um pouco do resultado final.")
else:
    out.append("> Capturas geradas automaticamente a partir do código desta alteração.")
out.append("")

for item in data["files"]:
    caption = html.escape(item["caption"], quote=True)
    width = 280 if item.get("viewport") == "mobile" else 640
    out.append(f"**{caption}**")
    out.append("")
    out.append(f'<img src="{base}/{item["file"]}" alt="{caption}" width="{width}">')
    out.append("")

print("\n".join(out))
