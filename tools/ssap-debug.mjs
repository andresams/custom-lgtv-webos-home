import fs from "node:fs";
const IP="192.168.15.118";
const key=fs.readFileSync(new URL("./.lgkey",import.meta.url),"utf8").trim();
const ws=new WebSocket(`ws://${IP}:3000`);
ws.addEventListener("open",()=>ws.send(JSON.stringify({type:"register",id:"r",payload:{"client-key":key,pairingType:"PROMPT",manifest:{manifestVersion:1,permissions:["LAUNCH","READ_INSTALLED_APPS","READ_APP_STATUS","CONTROL_DISPLAY"]}}})));
ws.addEventListener("message",ev=>{
  const m=JSON.parse(ev.data);
  console.log("MSG:",JSON.stringify(m).slice(0,500));
  if(m.id==="r"&&m.type==="registered"){
    ws.send(JSON.stringify({type:"request",id:"a1",uri:"ssap://com.webos.applicationManager/listLaunchPoints"}));
    ws.send(JSON.stringify({type:"subscribe",id:"a2",uri:"ssap://com.webos.applicationManager/listLaunchPoints"}));
    ws.send(JSON.stringify({type:"request",id:"a3",uri:"ssap://com.webos.service.applicationmanager/listLaunchPoints"}));
  }
});
setTimeout(()=>process.exit(0),7000);
