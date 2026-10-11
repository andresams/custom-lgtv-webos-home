import fs from "node:fs";
const IP="192.168.15.118";
const key=fs.readFileSync(new URL("./.lgkey",import.meta.url),"utf8").trim();
const ws=new WebSocket(`ws://${IP}:3000`);
ws.addEventListener("open",()=>ws.send(JSON.stringify({type:"register",id:"r",payload:{"client-key":key,manifest:{manifestVersion:1,permissions:["LAUNCH","READ_INSTALLED_APPS","CONTROL_DISPLAY"]}}})));
ws.addEventListener("message",ev=>{
  const m=JSON.parse(ev.data);
  console.log("FULL:",JSON.stringify(m));
  if(m.id==="r"&&m.type==="registered"){
    setTimeout(()=>{
      ws.send(JSON.stringify({type:"request",id:"g",uri:"ssap://org.webosbrew.hbchannel.service/getConfiguration"}));
    },400);
  }
});
setTimeout(()=>process.exit(0),6000);
