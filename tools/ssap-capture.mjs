import fs from "node:fs";
const IP="192.168.15.118";
const OUT=new URL("./tv-apps.json",import.meta.url);
const key=fs.readFileSync(new URL("./.lgkey",import.meta.url),"utf8").trim();
const ws=new WebSocket(`ws://${IP}:3000`);
ws.addEventListener("open",()=>ws.send(JSON.stringify({type:"register",id:"r",payload:{"client-key":key,pairingType:"PROMPT",manifest:{manifestVersion:1,permissions:["LAUNCH","READ_INSTALLED_APPS","READ_APP_STATUS","CONTROL_DISPLAY"]}}})));
ws.addEventListener("message",ev=>{
  const m=JSON.parse(ev.data);
  if(m.id==="r"&&m.type==="registered") ws.send(JSON.stringify({type:"request",id:"a1",uri:"ssap://com.webos.applicationManager/listLaunchPoints"}));
  if(m.id==="a1"&&m.payload&&m.payload.launchPoints){
    const apps=m.payload.launchPoints.map(x=>({id:x.id,title:x.title,systemApp:x.systemApp,removable:x.removable}));
    fs.writeFileSync(OUT,JSON.stringify(apps,null,2));
    console.log("TOTAL:",apps.length);
    process.exit(0);
  }
});
setTimeout(()=>{console.log("timeout");process.exit(1)},8000);
