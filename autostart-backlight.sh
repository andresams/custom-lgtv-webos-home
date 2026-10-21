#!/bin/sh
# Autostart do daemon backlight-keys (ajuste de backlight pelas teclas numéricas,
# em qualquer app). Instalado como symlink em /var/lib/webosbrew/init.d/ — roda via
# run-parts no startup.sh do Homebrew Channel.
# Para desativar:  touch /var/lib/webosbrew/backlight-keys/disabled
BASE=/var/lib/webosbrew/backlight-keys
[ ! -e "$BASE/disabled" ] || exit 0

# não duplica: encerra instância anterior antes de subir
pkill -f "$BASE/daemon.js" 2>/dev/null

(
  # espera o settingsservice responder (sistema pronto)
  i=0
  while [ "$i" -lt 60 ]; do
    luna-send -w 2000 -n 1 luna://com.webos.settingsservice/getSystemSettings \
      '{"category":"picture","keys":["backlight"]}' >/dev/null 2>&1 && break
    sleep 2; i=$((i + 1))
  done
  /usr/bin/node "$BASE/daemon.js" >> /tmp/backlight-keys.log 2>&1
) </dev/null >/dev/null 2>&1 &

exit 0
