// Instala um .ipk na TV via Homebrew Channel (org.webosbrew.hbchannel.service/install)
// usando a conexão SSAP já pareada (.lgkey). Node 22.
import fs from "node:fs";
const IP = "192.168.15.118";
const IPK_URL = process.argv[2];
const IPK_HASH = process.argv[3];
const key = fs.readFileSync(new URL("./.lgkey", import.meta.url), "utf8").trim();

const ws = new WebSocket(`ws://${IP}:3000`);
const die = (c) => { try { ws.close(); } catch {} process.exit(c); };
const timer = setTimeout(() => { console.log("TIMEOUT"); die(2); }, 90000);

ws.addEventListener("open", () => ws.send(JSON.stringify({
  type: "register", id: "r",
  payload: { "client-key": key, manifest: { manifestVersion: 1, permissions: ["LAUNCH","READ_INSTALLED_APPS","CONTROL_DISPLAY"] } }
})));
ws.addEventListener("error", (e) => { console.log("WS ERR", e.message || e); die(3); });
ws.addEventListener("message", (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id === "r" && m.type === "registered") {
    console.log("pareado; chamando install…");
    ws.send(JSON.stringify({
      type: "subscribe", id: "install",
      uri: "ssap://org.webosbrew.hbchannel.service/install",
      payload: { ipkUrl: IPK_URL, ipkHash: IPK_HASH, subscribe: true }
    }));
    return;
  }
  if (m.id === "install") {
    console.log("INSTALL:", JSON.stringify(m.payload || m));
    const p = m.payload || {};
    if (m.type === "error" || p.returnValue === false) { console.log("FALHOU"); clearTimeout(timer); die(4); }
    if (p.finished === true || p.statusText === "Done" || p.installProgress === 100 && p.finished !== false) {
      console.log("OK: instalado"); clearTimeout(timer); die(0);
    }
  }
});
