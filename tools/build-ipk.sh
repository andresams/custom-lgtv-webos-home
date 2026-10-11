#!/usr/bin/env bash
# Monta o .ipk do app webOS manualmente (sem ares-cli, sem npm).
# .ipk = arquivo 'ar' com: debian-binary + control.tar.gz + data.tar.gz
set -euo pipefail
PROJ="$(cd "$(dirname "$0")/.." && pwd)"
APPID="com.andresa.home"
VER="1.0.0"
BVER="1.0.$(date +%s)"   # versão real: muda a cada build p/ o WAM descartar a webview em cache
OUT="$PROJ/${APPID}_${VER}_all.ipk"

STAGE="$(mktemp -d)"
APPDIR="$STAGE/data/usr/palm/applications/$APPID"
mkdir -p "$APPDIR/assets" "$STAGE/control"

# arquivos do app
cp "$PROJ"/index.html "$PROJ"/config.js "$PROJ"/app.js "$PROJ"/logos.js \
   "$PROJ"/appinfo.json "$PROJ"/icon.png "$APPDIR/"
cp "$PROJ"/assets/* "$APPDIR/assets/"

# GARANTE leitura por todos (o sandbox do app roda como outro usuário).
# (o wallpaper.webp vinha com 600 e ficava invisível na TV)
find "$STAGE/data" -type d -exec chmod 755 {} \;
find "$STAGE/data" -type f -exec chmod 644 {} \;

# cache-bust: adiciona ?v=<timestamp> aos scripts para o webview não servir JS em cache
V="$(date +%s)"
sed -i '' -E "s/(src=\"(config|app|logos)\.js)\"/\1?v=$V\"/g" "$APPDIR/index.html"
# versão dinâmica no appinfo (força o WAM a tratar como atualização e recarregar do zero)
sed -i '' -E "s/\"version\":[[:space:]]*\"[^\"]*\"/\"version\": \"$BVER\"/" "$APPDIR/appinfo.json"

# data.tar.gz (caminhos relativos ./usr/...)
( cd "$STAGE/data" && tar --format=ustar -czf "$STAGE/data.tar.gz" ./usr )

# control
ISIZE="$(du -sk "$STAGE/data" | cut -f1)"
cat > "$STAGE/control/control" <<EOF
Package: $APPID
Version: $BVER
Section: misc
Priority: optional
Architecture: all
Installed-Size: $ISIZE
Maintainer: Andresa
Description: Tela inicial personalizada
EOF
( cd "$STAGE/control" && tar --format=ustar -czf "$STAGE/control.tar.gz" ./control )

# debian-binary
printf '2.0\n' > "$STAGE/debian-binary"

# monta o ar na ordem correta (dentro do STAGE p/ garantir arquivo novo)
( cd "$STAGE" && ar -r -c "$STAGE/pkg.ipk" debian-binary control.tar.gz data.tar.gz )
cp "$STAGE/pkg.ipk" "$OUT"

echo "IPK: $OUT"
ls -l "$OUT"
echo "--- membros do ar ---"
ar -t "$OUT"
echo "--- conteúdo do data.tar.gz ---"
tar -tzf "$STAGE/data.tar.gz" | head -20
