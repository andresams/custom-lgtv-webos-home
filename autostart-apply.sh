#!/bin/sh
# Autostart + redirecionamento do botão Home para a "Minha Home" (com.andresa.home).
# Instalado como symlink em /var/lib/webosbrew/init.d/ — roda via run-parts no startup.sh.
# Para desativar:  touch /var/lib/webosbrew/launch-home/disabled
BASE=/var/lib/webosbrew/launch-home
APP=com.andresa.home
HOME_APP=com.webos.app.home
log() { printf '%s %s\n' "$(date)" "$*" >> /tmp/launch-home.log; }

[ ! -e "$BASE/disabled" ] || { log 'disabled; skip'; exit 0; }

# Em background para não bloquear o boot (run-parts espera cada script).
(
  # espera o applicationManager responder (sistema pronto)
  i=0
  while [ "$i" -lt 90 ]; do
    if luna-send -w 2000 -n 1 luna://com.webos.applicationManager/getForegroundAppInfo '{}' >/dev/null 2>&1; then
      break
    fi
    sleep 2; i=$((i + 1))
  done
  sleep 5
  # 1) abre a Minha Home no boot
  luna-send -n 1 luna://com.webos.applicationManager/launch "{\"id\":\"$APP\"}" >> /tmp/launch-home.log 2>&1
  log "boot launch $APP"

  # 2) daemon: toda vez que a home NATIVA ganhar foco (botão Home), redireciona p/ Minha Home
  luna-send -i luna://com.webos.applicationManager/getForegroundAppInfo '{"subscribe":true}' 2>/dev/null \
  | while read -r line; do
      case "$line" in
        *"\"$HOME_APP\""*)
          luna-send -n 1 luna://com.webos.applicationManager/launch "{\"id\":\"$APP\"}" >/dev/null 2>&1
          ;;
      esac
    done
) </dev/null >/dev/null 2>&1 &

exit 0
