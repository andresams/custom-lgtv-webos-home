# crunchyroll-proxy (Cloudflare Worker)

A single small Worker that feeds the home screen's two data panels. It exists because
the TV's old browser can't call these APIs directly (CORS + rate limits), and because
the Crunchyroll cookie must be kept server-side.

## Routes

| Route | Returns |
|-------|---------|
| `GET /watchlist` | Your Crunchyroll watchlist / newest episodes, normalized for the panel: `{ subtitle, groups: [{ label, items:[{ name, ep, isNew, img }] }] }`. |
| `GET /football` | Aggregated fixtures/results for the configured clubs: `{ events: [ …raw TheSportsDB events… ] }`. The front end normalizes these. |
| `GET /raw` | The raw Crunchyroll watchlist JSON (for debugging field names). |
| `GET /health` | `{ ok: true }`. |

Both data routes send permissive CORS headers. Append `?fresh=1` to bypass caches
(the home screen's refresh button does this).

## What it does

### Crunchyroll (`/watchlist`)

Authenticates with your **`etp_rt` cookie** (stored only as the secret `CR_ETP_RT` —
never your password), exchanges it for a short-lived access token against
`beta-api.crunchyroll.com` (the app API gateway, which avoids the website's anti-bot
layer), fetches your watchlist, and reshapes it for the panel. Unofficial API, personal
use of your own account — it can break when Crunchyroll changes things; then the
`normalize()` function in `src/index.js` needs a tweak.

### Football (`/football`)

Aggregates each club's next/last games from [TheSportsDB](https://www.thesportsdb.com/)
(free key `123`) **server-side**, then:

- caches **each upstream endpoint at the edge** (Cloudflare Cache API, 6 h), so warm
  requests are instant and the upstream is rarely hit;
- **paces** real calls (~1.8 s apart) to stay under the shared key's rate limit and
  **falls back to the last cached value** when throttled, so the set fills in over a
  couple of refreshes and stays warm;
- returns one merged, CORS-enabled `{ events: [...] }`.

Change the clubs via the `FB_TEAM_IDS` constant in `src/index.js` (keep it in sync with
`football.teamIds` in `../config.js`).

## Deploy

You set the secret — the cookie is never committed and never leaves your Worker.

### 1. Get your `etp_rt` cookie

1. Open **crunchyroll.com** in a browser, **logged in**.
2. DevTools (F12) → **Application** → **Cookies** → `https://www.crunchyroll.com`.
3. Copy the **value** of the **`etp_rt`** cookie (a long string).

### 2. Deploy the Worker

```bash
cd crunchyroll-proxy
npm install
npx wrangler login
npx wrangler secret put CR_ETP_RT     # paste the etp_rt value when prompted
npx wrangler deploy
# → https://crunchyroll-proxy.<your-subdomain>.workers.dev
```

### 3. Wire it into the home screen

In `../config.js`, set both `crunchyroll.proxyUrl` and `football.proxyUrl` to the
Worker URL. Reload the home screen; if the Worker ever fails, the panels fall back to
the seed data in `config.js` on their own.

## Test / debug

```bash
BASE=https://crunchyroll-proxy.<your-subdomain>.workers.dev
curl "$BASE/health"            # {ok:true}
curl "$BASE/football"          # { events: [...] }  (first call warms the cache)
curl "$BASE/watchlist"         # normalized panel JSON
curl "$BASE/raw"               # raw Crunchyroll JSON
```

- **`/watchlist` returns `token 401`** → the `etp_rt` cookie expired; repeat step 1 and
  re-run `wrangler secret put CR_ETP_RT`.
- **`/football` returns few/zero events on a cold cache** → the shared TheSportsDB key is
  being rate-limited right now; wait and call it again a couple of times to warm the edge
  cache (it then stays warm for 6 h).
- **Crunchyroll titles/episodes look wrong** → send the output of `/raw`; the API's field
  names drift and `normalize()` needs adjusting.

## Note on the `Basic …` token

The `TOKEN_BASIC` constant in `src/index.js` is Crunchyroll's **public web client**
identifier (the same value the website ships in its own requests), used for the
`etp_rt_cookie` grant. It is not a personal credential and is safe to keep in the repo.
Your only real secret is `CR_ETP_RT`.
