// Captura teclas dos dispositivos de input por N segundos (roda na TV, como root).
// Uso: node evcap.js <segundos> <dev1> [dev2 ...]
// Imprime, para tamanhos de registro 16 e 24 bytes, os códigos de EV_KEY (press).
var fs = require('fs');
var secs = parseInt(process.argv[2] || '15', 10);
var devs = process.argv.slice(3);
var bufs = {};
var streams = [];

devs.forEach(function (d) {
  bufs[d] = Buffer.alloc(0);
  try {
    var s = fs.createReadStream(d);
    s.on('data', function (chunk) { bufs[d] = Buffer.concat([bufs[d], chunk]); });
    s.on('error', function (e) { console.log('ERR ' + d + ': ' + e.message); });
    streams.push(s);
    console.log('abrindo ' + d);
  } catch (e) { console.log('OPEN ERR ' + d + ': ' + e.message); }
});

console.log('capturando por ' + secs + 's — aperte as teclas agora...');
setTimeout(function () {
  console.log('=== bytes recebidos por dispositivo ===');
  devs.forEach(function (d) { console.log('  ' + d + ': ' + bufs[d].length + ' bytes'); });
  [16, 24].forEach(function (rs) {
    console.log('=== registro ' + rs + ' bytes — teclas (press) ===');
    devs.forEach(function (d) {
      var b = bufs[d], out = [];
      for (var i = 0; i + rs <= b.length; i += rs) {
        var type = b.readUInt16LE(i + rs - 8);
        var code = b.readUInt16LE(i + rs - 6);
        var val = b.readInt32LE(i + rs - 4);
        if (type === 1 && val === 1) out.push(code);
      }
      if (out.length) console.log('  ' + d + ' -> ' + out.join(','));
    });
  });
  console.log('FIM');
  process.exit(0);
}, secs * 1000);
