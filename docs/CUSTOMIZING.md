# Customizing

Almost everything you'd want to change lives in **`config.js`**, with logos in
**`logos.js`** and the look in the CSS variables at the top of **`index.html`**.
After editing, rebuild and reinstall (see [INSTALL.md](INSTALL.md)).

## `config.js` — the main knobs

### Your name and location (greeting + weather)

```js
location: { name: "São Paulo", lat: -23.55, lon: -46.63, tz: "America/Sao_Paulo" },
userName: "Andresa",
```

Weather is Open-Meteo (no key); change `lat`/`lon`/`tz` to your city. The greeting uses
`userName` and the time of day.

### The app grid

Each tile is an object in the `apps` array; order in the array is order on screen:

```js
{ id:"youtube", appId:"youtube.leanback.v4",
  grad:"linear-gradient(165deg,#ffffff,#eef0f3)", fg:"#0f0f0f", logo:L.youtube() },
```

- **`appId`** — the real webOS app ID to launch. Get the correct IDs for *your* TV with
  `node tools/ssap-list-apps.mjs` (or see `tools/tv-apps.json`). A wrong ID just fails
  to launch.
- **`grad`** — the tile background (any CSS background value).
- **`fg`** — content color.
- **`logo`** — HTML/SVG from `logos.js` (see below). **Omit `logo`** and add `name:"…"`
  to get the automatic default style (initial letter + name) — handy for new apps.

To reorder, move items in the array. To remove an app, delete its object.

### The "next match" widget (top card)

```js
match: { teamId: "134465", apiKey: "123", /* + seed fallback fields */ },
```

`teamId` is your club's [TheSportsDB](https://www.thesportsdb.com/) team ID (134465 =
SE Palmeiras). The widget shows that club's nearest upcoming game, pulled from the same
Worker as the football panel. The other fields are seed data shown if the API is down.

### The football panel (clubs + competitions covered)

```js
football: {
  proxyUrl: "https://crunchyroll-proxy.<your-subdomain>.workers.dev",
  teamIds: ["134465","134284","134287","134291","134296"], // the clubs to aggregate
  apiKey: "123",
  matches: [ /* seed fixtures shown if the Worker is unreachable */ ]
}
```

- **`proxyUrl`** — your deployed Worker. Leave empty to call TheSportsDB directly
  (works in a modern browser, but gets rate-limited/CORS-blocked on the TV — the Worker
  is strongly recommended).
- **`teamIds`** — the clubs to show. The panel automatically covers whatever competitions
  those clubs currently have scheduled/finished fixtures for (the free data source only
  returns active competitions, so e.g. state cups appear in season).
- To change which clubs appear, edit `teamIds` **here** and the `FB_TEAM_IDS` constant in
  `crunchyroll-proxy/src/index.js`, then redeploy the Worker.

### The Crunchyroll panel

```js
crunchyroll: {
  proxyUrl: "https://crunchyroll-proxy.<your-subdomain>.workers.dev",
  subtitle: "Sua watchlist · Áudio japonês",
  groups: [ /* seed episodes shown if the Worker is unreachable */ ]
}
```

Set `proxyUrl` to your Worker. See
[../crunchyroll-proxy/README.md](../crunchyroll-proxy/README.md) for the cookie setup.
Leave `proxyUrl` empty to just show the seed `groups`.

## `logos.js` — tile logos

`L` is an object of functions returning the inner HTML of a tile's `.logo`. Add one:

```js
myapp: function(){ return `
  <img src="assets/myapp.svg" alt="My App" style="height:54px;width:auto">`; },
```

Then reference it in `config.js` as `logo: L.myapp()`. Drop any image into `assets/`.
If you don't want a custom logo, skip `logo` and use `name:"My App"` for the default
initial-and-name style.

## Look & feel — CSS variables (`index.html`)

The top of the `<style>` block defines the theme on `:root`:

```css
--radius: 18px;        /* widget/card corner radius */
--radius-sm: 14px;     /* app tile radius */
--gap: 26px;           /* spacing between tiles/widgets */
--widget-h: 240px;     /* height of the top widgets */
--tile-h: 190px;       /* height of the app tiles */
--card: rgba(255,255,255,.70);   /* glass card background */
--ink / --ink-soft: …  /* text colors */
```

- **Tile/widget size** — change `--tile-h` and `--widget-h`.
- **Grid columns** — the app grid is `grid-template-columns:repeat(4,1fr)` in
  `.apps` (and `COLS = 4` in `app.js`, used for D-pad navigation); change both together.
- **Wallpaper** — replace `assets/wallpaper.webp` (keep it world-readable; the build
  script handles permissions). It's set on `body` as `background-image`.
- **Font** — the bundled Inter variable font is in `assets/inter.woff2`; swap the file
  and the `@font-face`/`--font` to change typefaces.

## App metadata (`appinfo.json`)

Change the app `title`, `icon`, and `iconColor`/`bgColor` here. If you change the `id`,
update it everywhere in `tools/` and reinstall as a new app.
