/* =========================================================================
   CONFIG — edite aqui sem mexer no app.js
   ------------------------------------------------------------------------
   CADA APP:
     appId : ID real na TV (confirme com tools/list-apps.sh)
     grad  : gradiente de fundo do card
     fg    : cor do conteúdo (para o estilo padrão)
     logo  : HTML/SVG do logo. Se omitido, o card usa o ESTILO PADRÃO
             (inicial + nome) automaticamente — bom para apps novos.
   ========================================================================= */
window.HOME_CONFIG = {
  location: { name: "São Paulo", lat: -23.55, lon: -46.63, tz: "America/Sao_Paulo" },
  userName: "Andresa",

  // IDs confirmados pela própria TV (SSAP listLaunchPoints).
  apps: [
    // ----- ordem definida -----
    { id:"youtube",    appId:"youtube.leanback.v4",        grad:"linear-gradient(165deg,#ffffff,#eef0f3)", fg:"#0f0f0f", logo:L.youtube() },
    { id:"crunchy",    appId:"com.crunchyroll.webapp",     grad:"linear-gradient(165deg,#ff9048,#f05e0a)", fg:"#fff", logo:L.crunchy() },
    { id:"prime",      appId:"amazon",                     grad:"linear-gradient(165deg,#31a8ff,#0a66c2)", fg:"#fff", logo:L.prime() },
    { id:"iptv",       appId:"com.visiontv.app",           grad:"linear-gradient(165deg,#1c6cc4,#0a2a5c)", fg:"#fff", logo:L.iptv() },
    { id:"applemusic", appId:"com.apple.applemusic",       grad:"linear-gradient(165deg,#fb5c74,#fa233b)", fg:"#fff", logo:L.applemusic() },
    { id:"mercado",    appId:"com.mercadolibre.mercadoplay",grad:"linear-gradient(165deg,#ffe95a,#ffd000)", fg:"#2d3277", logo:L.mercado() },
    { id:"apps",       appId:"com.webos.app.discovery",    grad:"linear-gradient(165deg,#ffffff,#e7e7ec)", fg:"#2a2d34", logo:L.apps() },
    // ----- restante -----
    { id:"disney",     appId:"com.disney.disneyplus-prod", grad:"linear-gradient(165deg,#1b3fa0,#0a1340)", fg:"#fff", logo:L.disney() },
    { id:"globo",      appId:"globoplaywebos",             grad:"linear-gradient(165deg,#ff5e72,#e51d3a)", fg:"#fff", logo:L.globo() },
    { id:"appletv",    appId:"com.apple.appletv",          grad:"linear-gradient(165deg,#2a2a2e,#070709)", fg:"#fff", logo:L.appletv() },
    { id:"dazn",       appId:"dazn",                       grad:"linear-gradient(165deg,#283142,#070b12)", fg:"#fff", logo:L.dazn() },
    { id:"spotify",    appId:"spotify-beehive",            grad:"linear-gradient(165deg,#242424,#060606)", fg:"#fff", logo:L.spotify() },
    { id:"lgchannels", appId:"com.webos.app.lgchannels",   grad:"linear-gradient(165deg,#ff5257,#d81e24)", fg:"#fff", logo:L.lgchannels() },
    { id:"dgo",          appId:"com.directvgo.webostv-rt",    grad:"linear-gradient(165deg,#20264a,#0a0d1f)", fg:"#fff", name:"DGO" },
    { id:"navegador",    appId:"com.webos.app.browser",       grad:"linear-gradient(165deg,#4a90d9,#1f5fa6)", fg:"#fff", name:"Navegador" },
    { id:"midia",        appId:"com.webos.app.mediadiscovery", grad:"linear-gradient(165deg,#2f8f6a,#13513a)", fg:"#fff", name:"Mídia" },
    { id:"streamingweek",appId:"webos.day",                   grad:"linear-gradient(165deg,#e8344d,#9c1430)", fg:"#fff", name:"Streaming Week" },
    { id:"alexa",        appId:"amazon.alexa.view",           grad:"linear-gradient(165deg,#13b8d4,#0a6a86)", fg:"#fff", name:"Alexa" },
    { id:"homebrew",     appId:"org.webosbrew.hbchannel",     grad:"linear-gradient(165deg,#6a3fa0,#2a1550)", fg:"#fff", name:"Homebrew" }
  ],

  // ----- Jogo: próximo jogo do Palmeiras (TheSportsDB, CORS aberto) -----
  //  Ao vivo via eventsnext; a semente abaixo aparece se a API falhar.
  match: {
    teamId: "134465",     // SE Palmeiras
    apiKey: "123",        // chave de teste pública da TheSportsDB
    // semente (jogo real detectado hoje):
    league: "Copa Libertadores",
    home: { name:"Palmeiras",  badge:"https://r2.thesportsdb.com/images/media/team/badge/vsqwqp1473538105.png" },
    away: { name:"Fluminense", badge:"https://r2.thesportsdb.com/images/media/team/badge/stvvwp1473538082.png" },
    label: "Qua", time: "21:30", venue: "Nubank Parque"
  },

  crunchyroll: {
    proxyUrl: "https://crunchyroll-proxy.contato-ad5.workers.dev",   // Worker ao vivo (vazio = dados-semente)
    subtitle: "Sua watchlist · Áudio japonês",
    groups: [
      { label:"Hoje · 20 de outubro", items:[
        { name:"Hello, I am a Witch and my Crush Wants me to Make a Love Potion!", ep:"Episódio 3", isNew:true, img:"https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx207191-VgkIzfH92WoZ.jpg" },
        { name:"Even Though I'm a Super Timid Noble Girl...", ep:"Episódio 3", isNew:true, img:"https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx200455-P3XStRQMJ7Di.png" }
      ]},
      { label:"Ontem · 19 de outubro", items:[
        { name:"The Apothecary Diaries", ep:"Episódio 51", img:"https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx161645-QLbzHXiYRgV2.jpg" },
        { name:"Black Clover", ep:"Episódio 173", img:"https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx97940-fyh8o7gNbha0.png" }
      ]},
      { label:"18 de outubro", items:[
        { name:"Mushoku Tensei: Jobless Reincarnation", ep:"Episódio 14", img:"https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx108465-1ANspF1EWyFx.jpg" },
        { name:"Re:ZERO − Starting Life in Another World", ep:"Episódio 19", img:"https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx21355-wRVUrGxpvIQQ.jpg" }
      ]},
      { label:"17 de outubro", items:[
        { name:"Solo Leveling", ep:"Episódio 8", img:"https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx151807-it355ZgzquUd.png" },
        { name:"Frieren: Beyond Journey's End", ep:"Episódio 28", img:"https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx170068-ijY3tCP8KoWP.jpg" },
        { name:"Dandadan", ep:"Episódio 10", img:"https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx171018-60q1B6GK2Ghb.jpg" }
      ]},
      { label:"16 de outubro", items:[
        { name:"Spy x Family", ep:"Episódio 38", img:"https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx140960-Kb6R5nYQfjmP.jpg" },
        { name:"Jujutsu Kaisen", ep:"Episódio 47", img:"https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx113415-LHBAeoZDIsnF.jpg" },
        { name:"One Piece", ep:"Episódio 1130", img:"https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx21-ELSYx3yMPcKM.jpg" }
      ]}
    ]
  },

  // ----- Futebol: dados-semente (depois ligamos via Worker). Ligas: Brasileirão,
  //  Copa do Brasil, Libertadores, Paulista, Intercontinental. status: upcoming|finished -----
  football: {
    // dados reais via TheSportsDB (CORS aberto): próximo + último jogo de cada time,
    // agregados e ordenados. Cobre as competições que os clubes disputam.
    // Worker agrega os jogos no servidor (cache + CORS); vazio = chama a API direto.
    proxyUrl: "https://crunchyroll-proxy.contato-ad5.workers.dev",
    teamIds: ["134465","134284","134287","134291","134296"], // Palmeiras, Corinthians, Flamengo, São Paulo, Fluminense
    apiKey: "123",
    // semente (fallback se a API falhar):
    matches: [
      { comp:"Copa Libertadores", date:"Amanhã", time:"21:30", status:"upcoming", venue:"Nubank Parque",
        home:{ name:"Palmeiras",   crest:"https://r2.thesportsdb.com/images/media/team/badge/vsqwqp1473538105.png" },
        away:{ name:"Fluminense",  crest:"https://r2.thesportsdb.com/images/media/team/badge/stvvwp1473538082.png" } },
      { comp:"Brasileirão Série A", date:"Dom · 19/10", status:"finished", venue:"Maracanã",
        home:{ name:"Flamengo",    crest:"https://r2.thesportsdb.com/images/media/team/badge/syptwx1473538074.png", score:2 },
        away:{ name:"São Paulo",   crest:"https://r2.thesportsdb.com/images/media/team/badge/sxpupx1473538135.png", score:1 } },
      { comp:"Brasileirão Série A", date:"Dom · 19/10", status:"finished", venue:"Neo Química Arena",
        home:{ name:"Corinthians", crest:"https://r2.thesportsdb.com/images/media/team/badge/vvuvps1473538042.png", score:0 },
        away:{ name:"Cruzeiro",    crest:"https://r2.thesportsdb.com/images/media/team/badge/upsvvu1473538059.png", score:0 } },
      { comp:"Copa do Brasil", date:"Qua · 22/10", time:"20:30", status:"upcoming", venue:"Neo Química Arena",
        home:{ name:"Corinthians", crest:"https://r2.thesportsdb.com/images/media/team/badge/vvuvps1473538042.png" },
        away:{ name:"Athletico-PR",crest:"https://r2.thesportsdb.com/images/media/team/badge/irzu1u1554237406.png" } },
      { comp:"Campeonato Paulista", date:"Jan 2026", time:"vs", status:"upcoming", venue:"Allianz Parque",
        home:{ name:"Palmeiras",   crest:"https://r2.thesportsdb.com/images/media/team/badge/vsqwqp1473538105.png" },
        away:{ name:"Corinthians", crest:"https://r2.thesportsdb.com/images/media/team/badge/vvuvps1473538042.png" } },
      { comp:"Intercontinental", date:"Dez 2026", time:"vs", status:"upcoming", venue:"Lusail, Catar",
        home:{ name:"Palmeiras",   crest:"https://r2.thesportsdb.com/images/media/team/badge/vsqwqp1473538105.png" },
        away:{ name:"Flamengo",    crest:"https://r2.thesportsdb.com/images/media/team/badge/syptwx1473538074.png" } }
    ]
  }
};
