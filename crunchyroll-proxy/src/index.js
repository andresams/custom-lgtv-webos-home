/* =========================================================================
   crunchyroll-proxy — Cloudflare Worker
   Autentica na API NÃO-OFICIAL do Crunchyroll usando o cookie etp_rt
   (guardado no secret CR_ETP_RT) e devolve a watchlist/novos episódios
   já no formato que a home (app.js) espera, com CORS liberado.

   Rotas:
     GET /watchlist   -> JSON normalizado { subtitle, groups:[...] }
     GET /raw         -> JSON cru da watchlist (para inspecionar campos)
     GET /health      -> ok

   Secret necessário:  wrangler secret put CR_ETP_RT
   (valor = cookie "etp_rt" copiado do navegador logado em crunchyroll.com)
   ========================================================================= */

// beta-api é o gateway de API do app (não passa pelo anti-bot da Cloudflare do www)
const CR_HOST = "https://beta-api.crunchyroll.com";
const TOKEN_BASIC = "Basic bm9haWhkZXZtXzZpeWcwYThsMHE6"; // cliente web (etp_rt_cookie)
const LOCALE = "pt-BR";
const CACHE_MS = 10 * 60 * 1000; // 10 min
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const DEVICE_ID = "b1c2d3e4-f5a6-4789-9abc-def012345678"; // fixo p/ identificar este "device"

let tokenCache = { access: null, account: null, exp: 0 };
let dataCache = { body: null, exp: 0 };

/* ---- Futebol (TheSportsDB) — agregado por time, cacheado, com CORS ----
   A chave pública "123" sofre rate-limit (Cloudflare 1015) e NÃO manda
   cabeçalhos CORS quando bloqueia. Fazendo a agregação aqui no servidor
   com cache de 30 min, batemos na API poucas vezes e a home recebe os
   jogos já com CORS liberado. ?fresh=1 fura o cache (botão "atualizar"). */
const FB_TEAM_IDS = ["134465", "134284", "134287", "134291", "134296"]; // Palmeiras, Corinthians, Flamengo, São Paulo, Fluminense
const FB_KEY = "123";
const FB_FRESH_MS = 2 * 60 * 1000;   // ?fresh=1 revalida endpoints mais velhos que isso
const FB_SOFT_MS = 25 * 60 * 1000;   // chamada normal revalida endpoints mais velhos que isso
const FB_HARD_MS = 6 * 60 * 60 * 1000; // cache de borda guardado por 6h (fallback p/ rate-limit)

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* Busca 1 endpoint com cache de borda persistente (sobrevive entre isolates).
   - serve do cache enquanto estiver "fresco" (< maxAgeMs)  -> { fromApi:false }
   - senão tenta a API; se der certo, regrava                -> { fromApi:true }
   - se a API falhar, devolve o cache velho (stale)          -> { fromApi:false } */
async function fetchEndpoint(url, maxAgeMs) {
  const cache = caches.default;
  const key = new Request(url);
  let cached = null;
  try {
    const hit = await cache.match(key);
    if (hit) {
      cached = await hit.json(); // { t, events }
      if (cached && Date.now() - cached.t < maxAgeMs) return { events: cached.events || [], fromApi: false };
    }
  } catch (_) { /* cache ilegível; segue para o fetch */ }

  try {
    const r = await fetch(url, { headers: { "User-Agent": UA, "Accept": "application/json, text/plain, */*" } });
    if (r.ok) {
      const d = await r.json();
      const arr = (d && (d.events || d.results)) || [];
      if (Array.isArray(arr)) {
        const body = JSON.stringify({ t: Date.now(), events: arr });
        await cache.put(key, new Response(body, {
          headers: { "Content-Type": "application/json", "Cache-Control": `max-age=${Math.floor(FB_HARD_MS / 1000)}` },
        }));
        return { events: arr, fromApi: true };
      }
    }
  } catch (_) { /* rate-limit/erro: cai no cache velho abaixo */ }

  return { events: cached ? (cached.events || []) : [], fromApi: false }; // stale ou vazio
}

async function fetchFootball(fresh) {
  const base = `https://www.thesportsdb.com/api/v1/json/${FB_KEY}/`;
  const maxAge = fresh ? FB_FRESH_MS : FB_SOFT_MS;
  const events = [];
  const seen = new Set();
  for (const id of FB_TEAM_IDS) {
    for (const ep of [`eventsnext.php?id=${id}`, `eventslast.php?id=${id}`]) {
      const res = await fetchEndpoint(base + ep, maxAge);
      for (const e of res.events) {
        if (e && e.idEvent && !seen.has(e.idEvent)) { seen.add(e.idEvent); events.push(e); }
      }
      if (res.fromApi) await sleep(1800); // ritmo anti rate-limit só quando foi à API
    }
  }
  return { events };
}

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(obj, status = 200, extra = {}) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...CORS, ...extra },
  });
}

async function getToken(env) {
  const now = Date.now();
  if (tokenCache.access && tokenCache.exp > now + 15000) return tokenCache;

  const etp = (env.CR_ETP_RT || "").trim();
  if (!etp) throw new Error("secret CR_ETP_RT ausente — rode: wrangler secret put CR_ETP_RT");

  const res = await fetch(`${CR_HOST}/auth/v1/token`, {
    method: "POST",
    headers: {
      "Authorization": TOKEN_BASIC,
      "Content-Type": "application/x-www-form-urlencoded",
      "Cookie": `etp_rt=${etp}`,
      "User-Agent": UA,
      "Accept": "application/json, text/plain, */*",
      "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
      "Origin": "https://www.crunchyroll.com",
      "Referer": "https://www.crunchyroll.com/",
    },
    body: "grant_type=etp_rt_cookie&scope=offline_access" +
          "&device_id=" + DEVICE_ID +
          "&device_type=" + encodeURIComponent("Chrome on Windows"),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`token ${res.status}: ${t.slice(0, 200)} (cookie etp_rt pode ter expirado — pegue um novo)`);
  }
  const d = await res.json();
  tokenCache = {
    access: d.access_token,
    account: d.account_id,
    exp: now + (d.expires_in ? d.expires_in * 1000 : 280000),
  };
  return tokenCache;
}

async function fetchWatchlist(env) {
  const tok = await getToken(env);
  const url = `${CR_HOST}/content/v2/discover/${tok.account}/watchlist?n=24&locale=${LOCALE}`;
  const res = await fetch(url, {
    headers: {
      "Authorization": `Bearer ${tok.access}`,
      "User-Agent": UA,
      "Accept": "application/json, text/plain, */*",
      "Referer": "https://www.crunchyroll.com/",
    },
  });
  if (res.status === 401) { tokenCache.exp = 0; } // força re-login na próxima
  if (!res.ok) throw new Error(`watchlist ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.json();
}

/* ---- imagem: escolhe um thumbnail ~320px dentro da estrutura aninhada ---- */
function pickThumb(panel) {
  try {
    const imgs = (panel.images && (panel.images.thumbnail || panel.images.poster_wide)) || [];
    const arr = Array.isArray(imgs[0]) ? imgs[0] : imgs;
    if (!arr.length) return "";
    let best = arr[0];
    for (const s of arr) if (s.width && s.width >= 280 && s.width <= 480) best = s;
    return best.source || "";
  } catch { return ""; }
}

function dateLabel(iso) {
  if (!iso) return "Recentes";
  const d = new Date(iso);
  if (isNaN(d)) return "Recentes";
  const today = new Date();
  const ymd = (x) => x.toISOString().slice(0, 10);
  const yest = new Date(today); yest.setDate(today.getDate() - 1);
  const pretty = d.toLocaleDateString("pt-BR", { day: "numeric", month: "long" });
  if (ymd(d) === ymd(today)) return `Hoje · ${pretty}`;
  if (ymd(d) === ymd(yest)) return `Ontem · ${pretty}`;
  return pretty;
}

function normalize(raw) {
  const data = (raw && raw.data) || [];
  const rows = [];
  for (const it of data) {
    const panel = it.panel || it;
    const em = panel.episode_metadata || {};
    const name = em.series_title || panel.title || "—";
    const epN = em.episode_number != null ? em.episode_number : em.episode;
    const ep = epN != null ? `Episódio ${epN}` : (panel.title || "");
    const iso = em.episode_air_date || em.availability_starts || panel.last_public || "";
    rows.push({ name, ep, isNew: !!it.new, img: pickThumb(panel), _iso: iso });
  }
  // agrupa por dia, mais recente primeiro
  rows.sort((a, b) => new Date(b._iso || 0) - new Date(a._iso || 0));
  const groups = [];
  const byLabel = new Map();
  for (const r of rows) {
    const label = dateLabel(r._iso);
    if (!byLabel.has(label)) { const g = { label, items: [] }; byLabel.set(label, g); groups.push(g); }
    byLabel.get(label).items.push({ name: r.name, ep: r.ep, isNew: r.isNew, img: r.img });
  }
  return { subtitle: "Sua watchlist · Áudio japonês", groups: groups.slice(0, 12) };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const pathname = url.pathname;
    const fresh = url.searchParams.get("fresh") === "1";
    if (request.method === "OPTIONS") return new Response(null, { headers: CORS });
    if (pathname === "/health") return json({ ok: true });

    try {
      // /football: jogos agregados dos clubes (cache de borda por endpoint; ?fresh=1 revalida)
      if (pathname === "/football") {
        const data = await fetchFootball(fresh);
        return json(data, 200, { "X-Count": String(data.events.length) });
      }

      if (pathname === "/raw") return json(await fetchWatchlist(env));

      // /watchlist: cache curto; ?fresh=1 fura o cache (botão "atualizar")
      const now = Date.now();
      if (!fresh && dataCache.body && dataCache.exp > now) return json(dataCache.body, 200, { "X-Cache": "HIT" });
      const norm = normalize(await fetchWatchlist(env));
      dataCache = { body: norm, exp: now + CACHE_MS };
      return json(norm, 200, { "X-Cache": fresh ? "FRESH" : "MISS" });
    } catch (e) {
      return json({ error: String(e.message || e) }, 502);
    }
  },
};
