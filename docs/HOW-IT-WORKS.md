# How it works

This document explains **what was built and how** — the design decisions, the webOS
constraints that shaped them, and how each piece fits together.

## The big picture

```
┌──────────────────────── LG webOS TV (rooted) ─────────────────────────┐
│  com.andresa.home  (web app, Chromium ~79)                            │
│                                                                       │
│   index.html ── app.js ── config.js ── logos.js                       │
│        │           │                                                  │
│        │           ├── Open-Meteo            (weather, direct, no key) │
│        │           ├── Cloudflare Worker /football   (TheSportsDB)     │
│        │           └── Cloudflare Worker /watchlist  (Crunchyroll)     │
│        │                                                               │
│   luna services ── launch native apps, read foreground app, install   │
└───────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
        crunchyroll-proxy (Cloudflare Worker)
        • holds the Crunchyroll etp_rt cookie as a secret
        • aggregates football fixtures per club + edge cache
        • adds permissive CORS the old TV browser needs
```

The app itself is **plain HTML/CSS/JS** — no framework, no bundler, no build step for
the front end. That keeps it tiny, fast on a weak TV SoC, and trivial to package.

## Why an old browser changes everything

webOS 6.x runs web apps in WAM on a Chromium around version 79. Several modern CSS
features silently do nothing there, so the layout avoids them:

- **`inset` shorthand is unsupported** → every absolutely/fixed-positioned element uses
  explicit `top/right/bottom/left`. This is also used as a feature probe:
  `@supports not (inset: 0){ … }` targets *only* the old engine.
- **Flexbox `gap` is unsupported** → spacing between flex children falls back to
  `margin` rules inside that `@supports not (inset: 0)` block. (CSS **grid** `gap`
  *is* supported, so the app grid and the top widgets use grid.)
- **`filter: drop-shadow()` blurs bitmap images** on this engine → crests/badges use
  plain `object-fit` images without it, and source art is high-res (≈512px) so it stays
  sharp when scaled down.
- A bundled **Inter** variable font (`assets/inter.woff2`, `@font-face`) is shipped
  because the TV has no SF Pro; without it the UI fell back to LG's font and looked off.

The viewport is pinned to `width=1920` so the fixed-pixel layout maps 1:1 to the panel.

## Layout

`index.html` is a single file with all CSS inline. Top-level structure:

- **Top bar** — the `webOS` wordmark, a "last updated HH:MM" stamp, and one **refresh**
  button.
- **Stage** — a CSS grid with two columns: the left column (widgets + app grid) and a
  fixed-width right column (the tabbed side panel).
- **Left column** — the two top widgets (greeting/weather and the match card) and the
  app grid live in **one shared scroll container** (`.apps-scroll`), so scrolling moves
  the widgets together with the apps. Returning D-pad focus to the first app row scrolls
  back to the top to reveal the widgets again.
- **Right panel** — two tabs (Crunchyroll / Futebol); each is a card with its own
  internal scroll.

Colors, radii, gaps and widget/tile heights are CSS custom properties on `:root`, so
restyling is mostly editing a handful of variables (see
[CUSTOMIZING.md](CUSTOMIZING.md)).

## Navigation and launching apps

`app.js` implements a simple focus model over the tile grid:

- Arrow keys move focus (`keyCode` 37–40), **OK/Enter** (13) launches the focused app.
- The Magic Remote pointer also works: hovering a tile focuses it, clicking launches.
- Apps are launched through the webOS luna bus. Because the stock `webOSTV.js` bridge
  is not loaded, the app calls the native **`PalmServiceBridge`** directly
  (`luna://com.webos.applicationManager/launch` with `{id: "<appId>"}`). The real app
  IDs for the installed apps are listed in `tools/tv-apps.json` and wired in `config.js`.

### Backlight via the number keys

The remote's number keys set the TV backlight (1–9 → 10–90%, 0 → 100%). Backlight lives
in `settingsservice` (`category: "picture"`, `settings: { backlight: N }`), but a
sandboxed app has no permission to write it — a direct bridge call silently fails. The
app instead runs the luna command through the Homebrew Channel's root service,
`luna://org.webosbrew.hbchannel.service/exec`, which executes it as root. A direct
`settingsservice` call is kept as a fallback. An on-screen overlay shows the level.

## Data integrations

### Weather — Open-Meteo (direct)

Free, keyless, CORS-open. `app.js` reads the current conditions and daily min/max for
the `location` in `config.js`. No proxy needed.

### Football — TheSportsDB via the Worker

TheSportsDB's free tier (shared API key `123`) is the data source, but calling it
directly from the TV has two problems:

1. **CORS** — when the key is rate-limited, Cloudflare in front of TheSportsDB returns
   an error page *without* CORS headers, which the browser reports as a CORS failure.
2. **Rate limits** — showing a handful of clubs means ~10 requests per refresh
   (`eventsnext` + `eventslast` per team), which trips the shared key's limit (HTTP 429,
   Cloudflare "error code: 1015") almost immediately.

So the front end never calls TheSportsDB directly. Instead the Worker exposes
**`/football`**, which:

- fetches each club's next/last events **server-side** (no browser CORS),
- caches **each endpoint individually at the edge** (Cloudflare Cache API, 6 h), so a
  warm cache serves instantly and the upstream is hit rarely,
- paces real upstream calls (~1.8 s apart) to stay under the rate limit, and **falls
  back to the last good cached value** if a call is throttled — the set fills in over a
  couple of refreshes and then stays warm,
- returns a single merged `{ events: [...] }` payload with permissive CORS.

`app.js` then normalizes those raw events (timezone-aware date labels, upcoming-first
sorting, scores for finished games) and renders both the side panel and the top
"next match" card (the nearest upcoming game for your club). If the Worker is
unreachable, the panel falls back to the seed fixtures in `config.js`.

### Crunchyroll — the Worker's `/watchlist`

The Crunchyroll API is unofficial and tied to your login. The Worker authenticates with
your **`etp_rt` cookie** (stored only as the Worker secret `CR_ETP_RT`), exchanges it for
a short-lived access token against `beta-api.crunchyroll.com` (the app API gateway, which
avoids the website's anti-bot layer), fetches your watchlist, and normalizes it into the
shape the panel expects (grouped by day, with thumbnails). Full details and the
cookie-capture steps are in [../crunchyroll-proxy/README.md](../crunchyroll-proxy/README.md).

### The single refresh button

One top-bar button refreshes **all** panels at once. Each loader accepts an optional
`onDone` callback; `refreshAll()` wraps them in promises and uses a
`Promise.race([...], 12s timeout)` safety net so the spinner always stops and the
"all updated" toast always shows, even if one API hangs. Every network read is wrapped
in a `fetchJSON(url, ms)` helper that rejects on timeout, so a single slow/blocked API
can't freeze the refresh.

## Packaging the `.ipk` (by hand)

A webOS `.ipk` is just an `ar` archive of `debian-binary` + `control.tar.gz` +
`data.tar.gz`. `tools/build-ipk.sh` builds it without ares-cli:

- copies the app files into `./usr/palm/applications/com.andresa.home/`,
- **`chmod 644`** every file (the app sandbox runs as another user; files left at `600`
  — e.g. the wallpaper — show up blank on the TV),
- **cache-busts** the scripts (`?v=<timestamp>` on `config/app/logos.js`) and bumps the
  `appinfo.json` version to `1.0.<timestamp>`, which forces WAM to treat it as an update
  and throw away the cached webview — otherwise code changes don't appear on the TV,
- tars it all up into the `.ipk`.

## Installing and auto-starting

The TV downloads the freshly built `.ipk` over HTTP from your computer and installs it,
either through the **Homebrew Channel** install service (SSAP, `tools/hb-install.mjs`)
or through the luna **`appInstallService/dev/install`** over a root Telnet shell
(`tools/tvtelnet.py`). To open straight into this app, `tools/autostart-apply.sh`
installs a webosbrew autostart entry plus a small foreground-watcher daemon that
redirects the Home button to `com.andresa.home`. Step-by-step: [INSTALL.md](INSTALL.md).

## File-by-file

| File | Role |
|------|------|
| `index.html` | Markup + all CSS (single file). |
| `app.js` | Clock, weather, football, Crunchyroll, grid navigation, refresh logic. |
| `config.js` | Everything you edit: apps, location, teams, proxy URL, seed data. |
| `logos.js` | Inline SVG/HTML logos for the app tiles. |
| `appinfo.json` | webOS app metadata (id, title, icon, colors). |
| `crunchyroll-proxy/src/index.js` | The Worker: `/watchlist`, `/football`, `/raw`, `/health`. |
| `tools/build-ipk.sh` | Manual `.ipk` packaging with cache-busting. |
| `tools/hb-install.mjs` | Install the `.ipk` via the Homebrew Channel (SSAP). |
| `tools/tvtelnet.py` | Run one command in the TV's root Telnet shell. |
| `tools/autostart-apply.sh` | Autostart + Home-button redirect. |
| `tools/ssap-list-apps.mjs` | Pair with the TV and list installed app IDs. |
