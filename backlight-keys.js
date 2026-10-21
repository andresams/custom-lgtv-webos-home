// =========================================================================
// remote-keys (arquivo backlight-keys/daemon.js) — daemon root, webOS rooteado
// Lê o controle direto da camada de input (/dev/input/event*) e age em
// QUALQUER app (um app web só recebe teclas quando está em primeiro plano):
//   • teclas NUMÉRICAS -> ajustam o backlight (1..9 = 10..90%, 0 = 100%)
//   • botões dedicados -> reabrem o app desejado e fecham o nativo (REMAP)
// Feedback do backlight via toast de sistema. Iniciado por autostart-backlight.sh.
//
// Códigos evdev dos dígitos (Magic Remote): 2..10 = 1..9, 11 = 0.
// =========================================================================
var cp = require('child_process');

// dispositivos do controle (M-RCU e RCU); lê todos para cobrir variações
var DEVICES = [
  '/dev/input/event1', '/dev/input/event3', '/dev/input/event4',
  '/dev/input/event5', '/dev/input/event6', '/dev/input/event7'
];
var REC = 16;        // tamanho do struct input_event (userspace 32-bit)
var DEBOUNCE = 150;  // ms — evita disparo duplicado entre dispositivos
var last = 0, lastBtn = 0;

// Botões dedicados -> { target: app a abrir, kill: [apps nativos a fechar] }
var REMAP = {
  1037: { target: 'youtube.leanback.v4',    kill: ['com.webos.app.discovery', 'netflix'] }, // Netflix  -> YouTube
  1042: { target: 'com.crunchyroll.webapp', kill: ['com.disney.disneyplus-prod'] },          // Disney+  -> Crunchyroll
  1117: { target: 'com.visiontv.app',       kill: ['amazon.alexa.view'] }                    // Assistente -> IPTV
};

function digit(code) {
  if (code >= 2 && code <= 10) return code - 1; // code 2..10 => dígito 1..9
  if (code === 11) return 0;                     // code 11    => dígito 0
  return -1;
}
function sh(cmd) { try { cp.exec(cmd); } catch (e) {} }
function launch(id) { sh("luna-send -n 1 -f luna://com.webos.applicationManager/launch '{\"id\":\"" + id + "\"}'"); }
function closeApp(id) { sh("luna-send -n 1 -f luna://com.webos.applicationManager/closeByAppId '{\"id\":\"" + id + "\"}'"); }
function remap(m) {
  // reativo: enquanto o alvo não estiver em primeiro plano, fecha o nativo que o
  // sistema abriu e relança o alvo. Converge rápido e minimiza o flash do nativo.
  launch(m.target);
  var tries = 0;
  var iv = setInterval(function () {
    tries++;
    cp.exec("luna-send -n 1 -f luna://com.webos.applicationManager/getForegroundAppInfo '{}'",
      function (e, out) {
        out = out || '';
        if (out.indexOf('"' + m.target + '"') !== -1) { clearInterval(iv); return; } // já no alvo
        m.kill.forEach(closeApp);   // fecha o nativo (ou a loja) se apareceu
        launch(m.target);           // traz o alvo de volta
      });
    if (tries >= 16) clearInterval(iv); // ~3,2s de janela
  }, 200);
  console.log(new Date().toISOString() + " remap -> " + m.target);
}
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
        if (REMAP[code]) {                     // botão dedicado remapeado
          var tb = Date.now();
          if (tb - lastBtn > 400) { lastBtn = tb; remap(REMAP[code]); }
          continue;
        }
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
