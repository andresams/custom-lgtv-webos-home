#!/usr/bin/env bash
# Reinicia a TV e valida que o autostart abre a Minha Home no boot.
TV=192.168.15.118
HERE="$(cd "$(dirname "$0")" && pwd)"

echo "[1] disparando reboot..."
python3 -I "$HERE/tvtelnet.py" "sync; (sleep 1; /sbin/reboot) >/dev/null 2>&1 &" "$TV" 3 >/dev/null 2>&1 || true

echo "[2] aguardando a TV cair..."
down=0
for i in $(seq 1 40); do
  if ! nc -z -G2 "$TV" 23 2>/dev/null; then down=1; echo "   caiu após ~$((i*2))s"; break; fi
  sleep 2
done
[ "$down" = 1 ] || echo "   (não detectei queda — pode ter reiniciado rápido)"

echo "[3] aguardando a TV voltar (telnet 23)..."
up=0
for i in $(seq 1 90); do
  if nc -z -G2 "$TV" 23 2>/dev/null; then up=1; echo "   voltou após ~$((i*2))s de espera"; break; fi
  sleep 2
done
if [ "$up" != 1 ]; then echo "[X] TV não voltou a tempo — verifique manualmente."; exit 1; fi

echo "[4] dando tempo para o autostart rodar (35s)..."
sleep 35

echo "[5] app em primeiro plano agora:"
python3 -I "$HERE/tvtelnet.py" "luna-send -n 1 -f luna://com.webos.applicationManager/getForegroundAppInfo '{}' 2>/dev/null | grep appId; echo '--- log autostart ---'; cat /tmp/launch-home.log 2>/dev/null | tail -3" "$TV" 8
echo "[fim]"
