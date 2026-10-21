/* ============================ app.js ============================ */
(function(){
  "use strict";
  var CFG = window.HOME_CONFIG;

  /* ---------- util ---------- */
  function $(s){ return document.querySelector(s); }
  function el(tag, cls){ var e=document.createElement(tag); if(cls) e.className=cls; return e; }
  var COLS = 4;

  // fetch com timeout (evita travar se uma API não responder)
  function fetchJSON(url, ms){
    return Promise.race([
      fetch(url).then(function(r){ return r.json(); }),
      new Promise(function(_, rej){ setTimeout(function(){ rej(new Error("timeout")); }, ms || 8000); })
    ]);
  }

  /* ---------- chamada luna via bridge nativo do webOS (sem webOSTV.js) ---------- */
  function lunaRequest(uri, params, onDone){
    // webOS nativo: PalmServiceBridge (o SDK usa isto por baixo)
    if(window.PalmServiceBridge){
      try{
        var bridge = new window.PalmServiceBridge();
        bridge.onservicecallback = function(msg){
          var r; try{ r = JSON.parse(msg); }catch(e){ r = {}; }
          if(onDone) onDone(r);
        };
        bridge.call(uri, JSON.stringify(params || {}));
        return true;
      }catch(e){ console.warn("[home] luna falhou:", uri, e); }
    }
    // fallback: SDK webOSTV.js, se presente
    if(window.webOS && window.webOS.service && window.webOS.service.request){
      var parts = uri.split("/"); var method = parts.pop(); var svc = parts.join("/");
      window.webOS.service.request(svc, { method: method, parameters: params || {}, onComplete: onDone });
      return true;
    }
    console.log("[preview] luna", uri, params || {});
    return false;
  }

  /* ---------- lançar app nativo da TV ---------- */
  function launchApp(appId, launchParams){
    if(!appId){ console.warn("[home] sem appId configurado"); return; }
    var p = { id: appId };
    if(launchParams) p.params = launchParams;
    lunaRequest("luna://com.webos.applicationManager/launch", p, function(r){
      if(r && r.returnValue === false) console.warn("[home] launch falhou:", appId, r);
    });
  }

  /* ---------- backlight da TV pelas teclas numéricas ----------
     1..9 => 10%..90%, 0 => 100%. Ajusta o backlight da imagem via
     settingsservice (categoria "picture"). Mostra um overlay rápido. */
  function setBacklight(pct){
    pct = Math.max(0, Math.min(100, Math.round(pct)));
    // o app (sandbox) não tem ACG para settingsservice; o serviço do Homebrew
    // roda como root e executa o luna-send por nós. Fallback: chamada direta.
    var payload = '{"category":"picture","settings":{"backlight":' + pct + '}}';
    var cmd = "luna-send -n 1 -f luna://com.webos.settingsservice/setSystemSettings '" + payload + "'";
    lunaRequest("luna://org.webosbrew.hbchannel.service/exec", { command: cmd }, function(r){
      if(!r || r.returnValue !== true){
        lunaRequest("luna://com.webos.settingsservice/setSystemSettings",
          { category: "picture", settings: { backlight: pct } });
      }
    });
    showBacklight(pct);
  }
  function showBacklight(pct){
    var ov = $("#blOverlay"); if(!ov) return;
    var fill = $("#blFill"), lbl = $("#blPct");
    if(fill) fill.style.width = pct + "%";
    if(lbl) lbl.textContent = pct + "%";
    ov.classList.add("show");
    clearTimeout(ov._t); ov._t = setTimeout(function(){ ov.classList.remove("show"); }, 1600);
  }

  /* ---------- relógio + saudação + data ---------- */
  function greeting(h){
    if(h<6) return "Boa madrugada";
    if(h<12) return "Bom dia";
    if(h<18) return "Boa tarde";
    return "Boa noite";
  }
  function tick(){
    var now = new Date();
    var hh = String(now.getHours()).padStart(2,"0");
    var mm = String(now.getMinutes()).padStart(2,"0");
    var t = hh + ":" + mm;
    $("#clockBig").textContent = t;
    $("#greet").textContent = greeting(now.getHours()) + ", " + CFG.userName;
    var dateStr = now.toLocaleDateString("pt-BR", { weekday:"long", day:"numeric", month:"long" });
    $("#dateLine").textContent = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);
  }

  /* ---------- clima (Open-Meteo, sem chave) ---------- */
  var CLOUD = 'M18 34a10 10 0 0 1 1-20 13 13 0 0 1 24 5 8 8 0 0 1-3 15H18z';
  var WICONS = {
    clear:  '<svg viewBox="0 0 48 48" width="46" height="46"><circle cx="24" cy="24" r="10" fill="#FDB813"/><g stroke="#FDB813" stroke-width="3" stroke-linecap="round"><line x1="24" y1="4" x2="24" y2="9"/><line x1="24" y1="39" x2="24" y2="44"/><line x1="4" y1="24" x2="9" y2="24"/><line x1="39" y1="24" x2="44" y2="24"/><line x1="10" y1="10" x2="14" y2="14"/><line x1="34" y1="34" x2="38" y2="38"/><line x1="38" y1="10" x2="34" y2="14"/><line x1="14" y1="34" x2="10" y2="38"/></g></svg>',
    partly: '<svg viewBox="0 0 56 48" width="52" height="44"><circle cx="20" cy="17" r="8" fill="#FDB813"/><g stroke="#FDB813" stroke-width="2.5" stroke-linecap="round"><line x1="20" y1="3" x2="20" y2="7"/><line x1="5" y1="17" x2="9" y2="17"/><line x1="9" y1="6" x2="12" y2="9"/><line x1="31" y1="6" x2="28" y2="9"/></g><path d="M20 40a9 9 0 0 1 .5-18 12 12 0 0 1 22 4 7 7 0 0 1-2 14H20z" fill="#EAEFF4" stroke="#C7D0D9" stroke-width="1.4"/></svg>',
    cloudy: '<svg viewBox="0 0 56 48" width="50" height="42"><path d="'+CLOUD+'" fill="#D7DEE6" stroke="#B9C3CE" stroke-width="1.4"/></svg>',
    fog:    '<svg viewBox="0 0 56 50" width="50" height="44"><path d="'+CLOUD+'" fill="#D7DEE6" stroke="#B9C3CE" stroke-width="1.4"/><g stroke="#B9C3CE" stroke-width="2.5" stroke-linecap="round"><line x1="14" y1="42" x2="42" y2="42"/><line x1="18" y1="47" x2="38" y2="47"/></g></svg>',
    drizzle:'<svg viewBox="0 0 56 52" width="50" height="46"><path d="'+CLOUD+'" fill="#CFD6DE" stroke="#B2BCC7" stroke-width="1.4"/><g stroke="#5FB0EE" stroke-width="2.6" stroke-linecap="round"><line x1="24" y1="40" x2="23" y2="46"/><line x1="34" y1="40" x2="33" y2="46"/></g></svg>',
    rain:   '<svg viewBox="0 0 56 52" width="50" height="46"><path d="'+CLOUD+'" fill="#C3CCD6" stroke="#A7B2BE" stroke-width="1.4"/><g stroke="#3FA0E8" stroke-width="3" stroke-linecap="round"><line x1="22" y1="40" x2="20" y2="48"/><line x1="31" y1="40" x2="29" y2="48"/><line x1="40" y1="40" x2="38" y2="48"/></g></svg>',
    snow:   '<svg viewBox="0 0 56 52" width="50" height="46"><path d="'+CLOUD+'" fill="#D7DEE6" stroke="#B9C3CE" stroke-width="1.4"/><g fill="#8FB8E0"><circle cx="22" cy="44" r="2"/><circle cx="31" cy="47" r="2"/><circle cx="40" cy="44" r="2"/></g></svg>',
    storm:  '<svg viewBox="0 0 56 52" width="50" height="46"><path d="'+CLOUD+'" fill="#B8C2CE" stroke="#9AA6B3" stroke-width="1.4"/><path d="M30 34l-6 10h5l-2 8 9-12h-5l3-6z" fill="#FDB813"/></svg>'
  };
  var WCODE = {
    0:["Céu limpo","clear"],1:["Predom. limpo","partly"],2:["Parcialmente nublado","partly"],3:["Nublado","cloudy"],
    45:["Névoa","fog"],48:["Névoa","fog"],51:["Garoa leve","drizzle"],53:["Garoa","drizzle"],55:["Garoa forte","drizzle"],
    61:["Chuva leve","rain"],63:["Chuva","rain"],65:["Chuva forte","rain"],66:["Chuva congelante","rain"],67:["Chuva congelante","rain"],
    71:["Neve leve","snow"],73:["Neve","snow"],75:["Neve forte","snow"],77:["Neve","snow"],
    80:["Pancadas","rain"],81:["Pancadas","rain"],82:["Pancadas fortes","storm"],
    85:["Neve","snow"],86:["Neve","snow"],95:["Tempestade","storm"],96:["Tempestade","storm"],99:["Tempestade","storm"]
  };
  function loadWeather(onDone){
    var L = CFG.location;
    $("#city").textContent = L.name;
    var url = "https://api.open-meteo.com/v1/forecast?latitude=" + L.lat + "&longitude=" + L.lon +
      "&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min&timezone=" + encodeURIComponent(L.tz);
    fetch(url).then(function(r){ return r.json(); }).then(function(d){
      if(d && d.current){
        var code = d.current.weather_code;
        var info = WCODE[code] || ["—","partly"];
        $("#temp").textContent = Math.round(d.current.temperature_2m) + "°";
        $("#cond").textContent = info[0];
        $("#wicon").innerHTML = WICONS[info[1]] || WICONS.partly;
        if(d.daily){
          var mx = Math.round(d.daily.temperature_2m_max[0]);
          var mn = Math.round(d.daily.temperature_2m_min[0]);
          $("#minmax").textContent = mx + "° / " + mn + "°";
        }
      }
      if(onDone) onDone();
    }).catch(function(e){ console.warn("[home] clima indisponível", e); if(onDone) onDone(); });
  }

  /* ---------- jogo em destaque ---------- */
  function badge(elBox, team){
    if(team.badge){
      elBox.innerHTML = '<img src="' + team.badge + '" alt="">';
      elBox.style.background = "transparent";
    } else {
      elBox.textContent = (team.short || team.name.slice(0,3)).toUpperCase();
      elBox.style.background = team.color || "#444";
    }
  }
  function renderMatch(m){
    $("#league").textContent = m.league || "";
    $("#homeName").textContent = m.home.name;
    $("#awayName").textContent = m.away.name;
    badge($("#homeBadge"), m.home);
    badge($("#awayBadge"), m.away);
    $("#matchLabel").textContent = m.label || "";
    $("#matchTime").textContent = m.time || "";
    $("#venue").textContent = m.venue || "";
  }

  /* ---------- próximo jogo do Palmeiras (TheSportsDB, CORS aberto) ---------- */
  function dayLabel(d, tz){
    var fmt = function(x){ return x.toLocaleDateString("pt-BR",{timeZone:tz}); };
    var today = new Date();
    var tomorrow = new Date(today.getTime() + 86400000);
    if(fmt(d) === fmt(today)) return "Hoje";
    if(fmt(d) === fmt(tomorrow)) return "Amanhã";
    var wd = d.toLocaleDateString("pt-BR",{weekday:"short", day:"numeric", month:"short", timeZone:tz});
    return wd.charAt(0).toUpperCase() + wd.slice(1);
  }
  function renderMatchFromEvent(ev, M, tz){
    var ts = ev.strTimestamp ? new Date(ev.strTimestamp + (/[zZ]$/.test(ev.strTimestamp)?"":"Z")) : null;
    var time = ts ? ts.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit",timeZone:tz}) : (ev.strTime||"").slice(0,5);
    renderMatch({
      league: ev.strLeague || M.league,
      home: { name: ev.strHomeTeam, badge: ev.strHomeTeamBadge },
      away: { name: ev.strAwayTeam, badge: ev.strAwayTeamBadge },
      label: ts ? dayLabel(ts, tz) : "",
      time: time,
      venue: ev.strVenue || ""
    });
  }
  function loadSports(onDone){
    var M = CFG.match;
    var fb = CFG.football || {};
    if(!M.teamId){ if(onDone) onDone(); return; }
    var tz = CFG.location.tz;
    var done = function(){ if(onDone) onDone(); };

    // preferência: Worker (mesmo endpoint do painel, com cache + CORS)
    if(fb.proxyUrl){
      var pu = fb.proxyUrl.replace(/\/$/,"") + "/football";
      fetchJSON(pu, 9000).then(function(d){
        var evs = (d && d.events) || [];
        var now = Date.now();
        // próximo jogo do Palmeiras (home ou away), o mais próximo no futuro
        var mine = evs.filter(function(e){ return e && (e.idHomeTeam===M.teamId || e.idAwayTeam===M.teamId); });
        mine.sort(function(a,b){
          var ta = new Date((a.strTimestamp||a.dateEvent||"") + "Z").getTime()||0;
          var tb = new Date((b.strTimestamp||b.dateEvent||"") + "Z").getTime()||0;
          var fa = ta>=now, fbb = tb>=now;
          if(fa!==fbb) return fa?-1:1; return fa?(ta-tb):(tb-ta);
        });
        if(mine[0]) renderMatchFromEvent(mine[0], M, tz);
        done();
      }).catch(function(e){ console.warn("[home] jogos (proxy) indisponível", e); done(); });
      if(!onDone) setTimeout(function(){ loadSports(); }, 6*60*60*1000);
      return;
    }

    // fallback: API direto
    var url = "https://www.thesportsdb.com/api/v1/json/" + (M.apiKey||"123") +
      "/eventsnext.php?id=" + M.teamId;
    fetchJSON(url, 8000).then(function(d){
      var ev = d && d.events && d.events[0];
      if(ev) renderMatchFromEvent(ev, M, tz);
      done();
    }).catch(function(e){ console.warn("[home] jogos indisponível", e); done(); });
    if(!onDone) setTimeout(function(){ loadSports(); }, 6*60*60*1000); // poll só na cadeia automática
  }

  /* ---------- painel Crunchyroll ---------- */
  function renderCrunchyroll(cr){
    $("#crSub").textContent = cr.subtitle;
    var list = $("#crList");
    list.innerHTML = "";
    var pending = []; // itens sem imagem -> busca capa no Jikan (preview)
    var MAX = 20, count = 0, first = true;
    for (var gi = 0; gi < cr.groups.length && count < MAX; gi++) {
      var g = cr.groups[gi];
      if (!g.items || !g.items.length) continue;
      var lbl = el("div","cr-group-label" + (first ? " first" : ""));
      lbl.textContent = g.label;
      list.appendChild(lbl);
      first = false;
      for (var ii = 0; ii < g.items.length && count < MAX; ii++) {
        var it = g.items[ii];
        var row = el("div","cr-item");
        var thumb = el("div","cr-thumb");
        thumb.style.background = "linear-gradient(135deg," + (it.c1||"#888") + "," + (it.c2||"#333") + ")";
        if(it.img){ thumb.style.backgroundImage = "url(" + it.img + ")"; }
        else { pending.push({ el: thumb, name: it.name }); }
        if(it.isNew){ var b=el("div","cr-badge"); b.textContent="NEW"; thumb.appendChild(b); }
        var meta = el("div","cr-meta");
        var nm = el("div","cr-name"); nm.textContent = it.name;
        var ep = el("div","cr-ep"); ep.textContent = it.ep;
        meta.appendChild(nm); meta.appendChild(ep);
        row.appendChild(thumb); row.appendChild(meta);
        list.appendChild(row);
        count++;
      }
    }
    fillThumbsJikan(pending);
  }

  /* capas reais via Jikan (MyAnimeList) para o preview — respeita rate limit */
  function fillThumbsJikan(items){
    items.forEach(function(p, i){
      setTimeout(function(){
        var q = p.name.replace(/[−–].*$/,"").replace(/[:!].*$/,"").trim(); // encurta título
        fetch("https://api.jikan.moe/v4/anime?q=" + encodeURIComponent(q) + "&limit=1&sfw")
          .then(function(r){ return r.json(); })
          .then(function(d){
            var a = d && d.data && d.data[0];
            var img = a && a.images && (a.images.webp && a.images.webp.image_url || a.images.jpg && a.images.jpg.image_url);
            if(img){ p.el.style.backgroundImage = "url(" + img + ")"; p.el.style.backgroundColor = "#111"; }
          }).catch(function(){});
      }, i * 380); // escalona ~2.6 req/s
    });
  }

  /* ---------- Crunchyroll ao vivo (via Worker proxy) ---------- */
  function loadCrunchyroll(force, onDone){
    var cr = CFG.crunchyroll;
    if(!cr.proxyUrl){ if(onDone) onDone(); return; }
    // force: fura o cache do Worker (?fresh=1) e evita cache do webview (&t=...)
    var url = cr.proxyUrl.replace(/\/+$/,"") + "/watchlist" + (force ? ("?fresh=1&t=" + Date.now()) : "");
    fetch(url).then(function(r){ return r.json(); }).then(function(d){
      if(d && d.groups && d.groups.length){
        renderCrunchyroll({ subtitle: d.subtitle || cr.subtitle, groups: d.groups });
      } else if(d && d.error){
        console.warn("[home] proxy Crunchyroll:", d.error);
      }
      if(onDone) onDone();
    }).catch(function(e){ console.warn("[home] Crunchyroll indisponível", e); if(onDone) onDone(); });
    if(!force) setTimeout(function(){ loadCrunchyroll(); }, 30*60*1000); // poll só na cadeia automática
  }

  /* ---------- abas do painel (Crunchyroll / Futebol) ---------- */
  window.switchTab = function(tab){
    var crunchy = tab === "crunchy";
    var tc = $("#tabCrunchy"), tf = $("#tabFutebol");
    if(tc) tc.classList.toggle("active", crunchy);
    if(tf) tf.classList.toggle("active", !crunchy);
    var pc = $("#panelCrunchy"), pf = $("#panelFutebol");
    if(pc) pc.style.display = crunchy ? "" : "none";
    if(pf) pf.style.display = crunchy ? "none" : "";
  };

  /* ---------- última atualização + toast ---------- */
  function setLastUpdate(){
    var el = $("#lastUpdate");
    if(!el) return;
    var now = new Date();
    el.textContent = "última atualização " +
      String(now.getHours()).padStart(2,"0") + ":" + String(now.getMinutes()).padStart(2,"0");
  }
  function showToast(msg){
    var t = $("#toast");
    if(!t) return;
    t.textContent = msg || "Atualizado";
    t.classList.add("show");
    clearTimeout(t._timer);
    t._timer = setTimeout(function(){ t.classList.remove("show"); }, 2200);
  }

  /* ---------- botão global: atualiza TODAS as APIs da tela ---------- */
  window.refreshAll = function(){
    var btn = $("#refreshAll");
    if(btn && btn.classList.contains("spin")) return; // já atualizando
    if(btn) btn.classList.add("spin");
    var started = Date.now();
    var p = function(fn){ return new Promise(function(res){ try{ fn(res); }catch(e){ res(); } }); };
    var all = Promise.all([
      p(function(d){ loadWeather(d); }),
      p(function(d){ loadSports(d); }),
      p(function(d){ loadCrunchyroll(true, d); }),
      p(function(d){ loadFootball(d, true); })
    ]);
    // race com um teto de segurança: o botão sempre volta mesmo se uma API travar
    Promise.race([ all, new Promise(function(res){ setTimeout(res, 12000); }) ]).then(function(){
      var wait = Math.max(0, 600 - (Date.now() - started)); // gira ao menos 0,6s
      setTimeout(function(){
        if(btn) btn.classList.remove("spin");
        setLastUpdate();
        showToast("Tudo atualizado");
      }, wait);
    });
  };

  /* ---------- painel de futebol (semente; depois via Worker) ---------- */
  function fbTeamCol(t){
    var team = el("div","fb-team");
    var crest = el("div","fb-crest");
    if(t.crest){ crest.innerHTML = '<img src="'+t.crest+'" alt="">'; }
    else { crest.innerHTML = '<span class="ini" style="background:'+(t.color||'#556')+'">'+t.name.slice(0,3).toUpperCase()+'</span>'; }
    var nm = el("div","fb-tname"); nm.textContent = t.name;
    team.appendChild(crest); team.appendChild(nm);
    return team;
  }
  function renderFootball(matches){
    var list = $("#fbList");
    if(!list) return;
    var data = matches || (CFG.football && CFG.football.matches) || [];
    list.innerHTML = "";
    data.forEach(function(m, i){
      var it = el("div","fb-item" + (i===0?" first":""));
      var comp = el("div","fb-comp"); comp.textContent = m.comp; it.appendChild(comp);

      var row = el("div","fb-row");
      row.appendChild(fbTeamCol(m.home));

      var center = el("div","fb-center");
      var label = el("div","fb-label");
      var mid = el("div","fb-mid");
      var venue = el("div","fb-venue"); venue.textContent = m.venue || "";
      if(m.status === "finished"){
        label.textContent = m.date || "Encerrado";
        mid.textContent = (m.home.score!=null?m.home.score:"") + " - " + (m.away.score!=null?m.away.score:"");
      } else {
        label.textContent = m.date || "";
        mid.textContent = m.time || "";
      }
      center.appendChild(label); center.appendChild(mid); center.appendChild(venue);
      row.appendChild(center);

      row.appendChild(fbTeamCol(m.away));
      it.appendChild(row);
      list.appendChild(it);
    });
  }

  /* ---------- futebol ao vivo (TheSportsDB, agregado por time) ---------- */
  function fbMatchFrom(e, tz){
    var raw = e.strTimestamp && /\d/.test(e.strTimestamp) ? e.strTimestamp
            : (e.dateEvent ? (e.dateEvent + "T" + (e.strTime || "00:00:00")) : "");
    var ts = raw ? new Date(raw + (/[zZ]$/.test(raw) ? "" : "Z")).getTime() : 0;
    var hasScore = e.intHomeScore != null && e.intHomeScore !== "" && e.intAwayScore != null && e.intAwayScore !== "";
    var finished = hasScore || (ts && ts < Date.now() - 2*3600*1000);
    return {
      _ts: ts, comp: e.strLeague || "",
      date: ts ? dayLabel(new Date(ts), tz) : "",
      time: ts ? new Date(ts).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit",timeZone:tz}) : "",
      status: finished ? "finished" : "upcoming", venue: e.strVenue || "",
      home: { name: e.strHomeTeam, crest: e.strHomeTeamBadge, score: finished ? Number(e.intHomeScore) : null },
      away: { name: e.strAwayTeam, crest: e.strAwayTeamBadge, score: finished ? Number(e.intAwayScore) : null }
    };
  }
  // normaliza + dedup + ordena + renderiza a lista de eventos do TheSportsDB
  function processFootballEvents(events, tz){
    var seen = {}, matches = [];
    (events||[]).forEach(function(e){
      if(!e || !e.idEvent || seen[e.idEvent]) return; seen[e.idEvent] = 1;
      matches.push(fbMatchFrom(e, tz));
    });
    if(!matches.length) return false; // mantém a semente
    var now = Date.now();
    matches.sort(function(a,b){
      var fa = a._ts >= now, fbb = b._ts >= now;
      if(fa !== fbb) return fa ? -1 : 1;                 // próximos primeiro
      return fa ? (a._ts - b._ts) : (b._ts - a._ts);     // próximos asc, passados desc
    });
    renderFootball(matches.slice(0, 16));
    console.log("[home] futebol ao vivo:", matches.length, "jogos");
    return true;
  }
  function loadFootball(onDone, force){
    var fb = CFG.football || {};
    var tz = CFG.location.tz;
    var done = function(){ if(onDone) onDone(); };

    // preferência: Worker (agrega no servidor, com cache + CORS)
    if(fb.proxyUrl){
      var u = fb.proxyUrl.replace(/\/$/,"") + "/football" + (force ? "?fresh=1&t=" + Date.now() : "");
      fetchJSON(u, 9000).then(function(d){
        processFootballEvents(d && d.events, tz); done();
      }).catch(function(e){ console.warn("[home] futebol (proxy) indisponível", e); done(); });
      if(!onDone && !force) setTimeout(function(){ loadFootball(); }, 60*60*1000);
      return;
    }

    // fallback: chama a API direto (sofre rate-limit/CORS, mas serve offline)
    if(!fb.teamIds || !fb.teamIds.length){ done(); return; }
    var base = "https://www.thesportsdb.com/api/v1/json/" + (fb.apiKey||"123") + "/";
    var reqs = [];
    fb.teamIds.forEach(function(id){
      reqs.push(fetchJSON(base+"eventsnext.php?id="+id, 8000).then(function(d){return d.events||[];}).catch(function(){return [];}));
      reqs.push(fetchJSON(base+"eventslast.php?id="+id, 8000).then(function(d){return d.results||[];}).catch(function(){return [];}));
    });
    Promise.all(reqs).then(function(lists){
      var all = [];
      lists.forEach(function(evs){ (evs||[]).forEach(function(e){ all.push(e); }); });
      processFootballEvents(all, tz); done();
    }).catch(function(e){ console.warn("[home] futebol indisponível", e); done(); });
    if(!onDone) setTimeout(function(){ loadFootball(); }, 60*60*1000); // poll só na cadeia automática
  }

  /* ---------- grade de apps + navegação ---------- */
  var tiles = [];
  function renderApps(){
    var grid = $("#apps");
    grid.innerHTML = "";
    tiles = [];
    CFG.apps.forEach(function(a, i){
      var t = el("div","tile");
      t.style.background = a.grad || a.bg || "#222";
      t.style.color = a.fg || "#fff";
      t.setAttribute("tabindex","0");
      if(a.logo){
        t.innerHTML = '<div class="logo">' + a.logo + '</div>';
      } else {
        // estilo padrão para apps sem logo personalizado
        var nm = a.name || a.id || "App";
        t.innerHTML = '<div class="def"><div class="ini">' + nm.charAt(0).toUpperCase() +
                      '</div><div class="nm">' + nm + '</div></div>';
      }
      t.addEventListener("click", function(){ launchApp(a.appId); });
      t.addEventListener("mouseenter", function(){ focusIdx(i); });
      grid.appendChild(t);
      tiles.push(t);
    });
  }
  var cur = 0;
  function focusIdx(i){
    if(i<0 || i>=tiles.length) return;
    cur = i;
    tiles.forEach(function(t){ t.classList.remove("focus"); });
    tiles[cur].classList.add("focus");
    tiles[cur].focus();
    // 1ª linha de apps: rola o contêiner até o topo para revelar os widgets de novo
    var sc = document.querySelector(".apps-scroll");
    if(sc && cur < COLS){
      try { sc.scrollTo({ top: 0, behavior: "smooth" }); } catch(e){ sc.scrollTop = 0; }
    } else {
      try { tiles[cur].scrollIntoView({ block: "nearest" }); } catch(e) { tiles[cur].scrollIntoView(); }
    }
  }
  function onKey(e){
    var k = e.keyCode;
    // teclas numéricas (fileira 48-57 e numpad 96-105): ajustam o backlight
    if((k>=48 && k<=57) || (k>=96 && k<=105)){
      var d = k>=96 ? k-96 : k-48;      // dígito 0..9
      setBacklight(d===0 ? 100 : d*10); // 0 => 100%, 1..9 => 10..90%
      e.preventDefault();
      return;
    }
    var moved = true;
    if(k===37){ if(cur%COLS>0) focusIdx(cur-1); }              // ←
    else if(k===39){ if(cur%COLS<COLS-1 && cur+1<tiles.length) focusIdx(cur+1); } // →
    else if(k===38){ if(cur-COLS>=0) focusIdx(cur-COLS); }      // ↑
    else if(k===40){ if(cur+COLS<tiles.length) focusIdx(cur+COLS); } // ↓
    else if(k===13){ launchApp(CFG.apps[cur].appId); moved=false; } // OK/Enter
    else moved=false;
    if(moved) e.preventDefault();
  }

  /* ---------- boot ---------- */
  function init(){
    tick(); setInterval(tick, 1000);
    loadWeather(); setInterval(loadWeather, 30*60*1000);
    renderMatch(CFG.match);
    loadSports();
    renderCrunchyroll(CFG.crunchyroll);
    loadCrunchyroll();
    renderFootball();
    loadFootball();
    renderApps();
    setLastUpdate();
    focusIdx(0);
    document.addEventListener("keydown", onKey);
  }
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
