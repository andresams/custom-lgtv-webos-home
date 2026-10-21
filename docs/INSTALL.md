# Install & deploy

How to build the app, put it on the TV, and make it the home screen.

> These steps assume a **rooted** webOS TV with the Homebrew Channel, on the same LAN
> as your computer. They install into `/media/developer/apps` (developer/dev-mode
> location). You accept the usual rooted-TV risks.

## 0. Prerequisites

- **On the TV:** Homebrew Channel installed; either its **SSAP** interface (port 3000)
  or a root **Telnet** shell (port 23) reachable. Both are available with the Homebrew
  Channel's "Telnet"/remote options enabled.
- **On your computer:** `bash`, `tar`, `ar` (built into macOS/Linux), **Node.js**, and
  **Python 3**.
- Know your TV's IP (e.g. `192.168.15.118`) and your computer's LAN IP (e.g.
  `192.168.15.98`).

## 1. Build the `.ipk`

```bash
bash tools/build-ipk.sh
# → com.andresa.home_1.0.0_all.ipk  (in the project root)
```

The script cache-busts the scripts and bumps the app version each run, so every build
is seen by the TV as a fresh update (no stale webview). See
[HOW-IT-WORKS.md](HOW-IT-WORKS.md#packaging-the-ipk-by-hand).

## 2. Serve the `.ipk` to the TV

The TV downloads the package over HTTP from your machine. Serve the project folder:

```bash
python3 -m http.server 8777
# the .ipk is now at  http://<YOUR-COMPUTER-IP>:8777/com.andresa.home_1.0.0_all.ipk
```

## 3. Install it — pick one method

### Method A — Homebrew Channel (SSAP)

First time only, pair with the TV (writes `tools/.lgkey`; accept the prompt on the TV):

```bash
node tools/ssap-list-apps.mjs        # pairs + prints installed app IDs
```

Then install, passing the HTTP URL and the file's SHA-256:

```bash
HASH=$(shasum -a 256 com.andresa.home_1.0.0_all.ipk | awk '{print $1}')
node tools/hb-install.mjs "http://<YOUR-COMPUTER-IP>:8777/com.andresa.home_1.0.0_all.ipk" "$HASH"
```

### Method B — root Telnet + luna install

Download on the TV, then install through the luna install service:

```bash
# download onto the TV
python3 tools/tvtelnet.py "curl -s -o /tmp/home.ipk http://<YOUR-COMPUTER-IP>:8777/com.andresa.home_1.0.0_all.ipk && sha256sum /tmp/home.ipk" <TV-IP> 12

# install
python3 tools/tvtelnet.py "luna-send -n 1 -f luna://com.webos.appInstallService/dev/install '{\"id\":\"com.andresa.home\",\"ipkUrl\":\"/tmp/home.ipk\",\"subscribe\":true}'" <TV-IP> 25
```

Verify the installed version:

```bash
python3 tools/tvtelnet.py "grep -i version /media/developer/apps/usr/palm/applications/com.andresa.home/appinfo.json" <TV-IP> 10
```

## 4. Launch it

```bash
python3 tools/tvtelnet.py "luna-send -n 1 -f luna://com.webos.applicationManager/launch '{\"id\":\"com.andresa.home\"}'" <TV-IP> 10
```

Because the version changes on every build, the launch loads the new code (WAM discards
the cached webview).

## 5. Make it the home screen (optional)

```bash
bash tools/autostart-apply.sh        # review the script first; edit IPs inside if needed
```

This installs a webosbrew autostart entry (so the app opens on boot) plus a small
foreground-watcher daemon that redirects the **Home** button to `com.andresa.home`.
It is reversible — remove the autostart entry / watcher to go back to the stock home.

> **Keep firmware auto-update OFF.** A firmware update can remove root and the autostart
> hooks.

## 6. Global backlight daemon (optional)

Makes the number-key backlight shortcuts work in **any** app (not just the home). It
installs a small root daemon plus a boot entry:

```bash
# serve the two files (step 2 already does this), then on the TV:
python3 tools/tvtelnet.py "mkdir -p /var/lib/webosbrew/backlight-keys /var/lib/webosbrew/init.d && \
  curl -s -o /var/lib/webosbrew/backlight-keys/daemon.js http://<YOUR-COMPUTER-IP>:8777/backlight-keys.js && \
  curl -s -o /var/lib/webosbrew/init.d/backlight-keys http://<YOUR-COMPUTER-IP>:8777/autostart-backlight.sh && \
  chmod +x /var/lib/webosbrew/init.d/backlight-keys && \
  sh /var/lib/webosbrew/init.d/backlight-keys && echo ok" <TV-IP> 12
```

It reads the remote at the input layer (`/dev/input/event*`), so it catches digits even
while another app is foreground, and shows a system toast. Starts automatically at boot.
To disable: `touch /var/lib/webosbrew/backlight-keys/disabled` (and `pkill -f daemon.js`).

## Updating later

Re-run **build → serve → install → launch** (steps 1–4). Nothing else is needed; the
cache-bust + version bump guarantee the TV shows the new build.

## Troubleshooting

- **Blank wallpaper / missing assets on the TV** — a file was left non-world-readable.
  `build-ipk.sh` already `chmod 644`s everything; rebuild and reinstall.
- **Changes don't appear** — you launched an old cached webview. Always install the
  freshly built `.ipk` (new version number) and relaunch; don't copy files in place.
- **Home button doesn't open the app** — the foreground watcher isn't running; re-run
  `tools/autostart-apply.sh` and check the webosbrew init.d logs.
- **Panels show seed data only** — the Worker isn't deployed or `config.js` doesn't
  point at it; see [../crunchyroll-proxy/README.md](../crunchyroll-proxy/README.md).
