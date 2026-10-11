#!/usr/bin/env bash
# Descobre os IDs reais dos apps instalados na TV, para preencher config.js.
# Uso:  ./tools/list-apps.sh 192.168.15.118
# (precisa de SSH liberado pelo Homebrew Channel; usuário root, porta 22 ou 9922)
set -euo pipefail
TV="${1:-192.168.15.118}"
PORT="${2:-22}"
echo "== Apps instalados em $TV =="
ssh -p "$PORT" root@"$TV" \
  "luna-send -n 1 -f luna://com.webos.applicationManager/listLaunchPoints '{}'" \
  | tr ',' '\n' | grep -E '\"(id|title)\"' || {
    echo "Falhou. Tente a porta 9922:  ./tools/list-apps.sh $TV 9922"
    exit 1
  }
