// =========================================================================
// backlight-keys — daemon root para a TV webOS (rooteada)
// Lê as teclas NUMÉRICAS do controle direto da camada de input
// (/dev/input/event*) e ajusta o backlight da imagem, funcionando em
// QUALQUER app (a home só recebe teclas quando está em primeiro plano).
// Feedback via toast de sistema. Instalado/iniciado por autostart-backlight.sh.
//
// Mapeamento: 1..9 => 10%..90% ; 0 => 100%
// Códigos evdev dos dígitos no Magic Remote: 2..10 = 1..9, 11 = 0.
// =========================================================================
var cp = require('child_process');

// dispositivos do controle (M-RCU e RCU); lê todos para cobrir variações
var DEVICES = [
  '/dev/input/event1', '/dev/input/event3', '/dev/input/event4',
  '/dev/input/event5', '/dev/input/event6', '/dev/input/event7'
];
var REC = 16;        // tamanho do struct input_event (userspace 32-bit)
var DEBOUNCE = 150;  // ms — evita disparo duplicado entre dispositivos
var last = 0;

function digit(code) {
  if (code >= 2 && code <= 10) return code - 1; // code 2..10 => dígito 1..9
  if (code === 11) return 0;                     // code 11    => dígito 0
  return -1;
}
function sh(cmd) { try { cp.exec(cmd); } catch (e) {} }
function setBacklight(pct) {
  pct = pct < 0 ? 0 : (pct > 100 ? 100 : pct);
  sh("luna-send -n 1 -f luna://com.webos.settingsservice/setSystemSettings " +
     "'{\"category\":\"picture\",\"settings\":{\"backlight\":" + pct + "}}'");
  sh("luna-send -n 1 -f luna://com.webos.notification/createToast " +
     "'{\"message\":\"Brilho " + pct + "%\"}'");
  console.log(new Date().toISOString() + " backlight " + pct + "%");
}
function watch(dev) {
  var c;
  try { c = cp.spawn('cat', [dev]); }
  catch (e) { return setTimeout(function () { watch(dev); }, 3000); }
  var buf = Buffer.alloc(0);
  c.stdout.on('data', function (chunk) {
    buf = Buffer.concat([buf, chunk]);
    while (buf.length >= REC) {
      var type = buf.readUInt16LE(8);
      var code = buf.readUInt16LE(10);
      var val = buf.readInt32LE(12);
      buf = buf.slice(REC);
      if (type === 1 && val === 1) {           // EV_KEY, press
        var d = digit(code);
        if (d >= 0) {
          var now = Date.now();
          if (now - last > DEBOUNCE) { last = now; setBacklight(d === 0 ? 100 : d * 10); }
        }
      }
    }
  });
  var reopen = function () { setTimeout(function () { watch(dev); }, 2000); };
  c.on('exit', reopen);
  c.on('error', reopen);
}
DEVICES.forEach(watch);
console.log(new Date().toISOString() + " backlight-keys daemon iniciado (" + DEVICES.length + " devices)");
