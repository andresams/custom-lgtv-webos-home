/* ============================ logos.js ============================
   Logos dos apps como SVG/HTML inline. Cada função devolve o conteúdo
   que vai dentro de .logo (flex centralizado). Reaproveitável e leve.
   ================================================================= */
var L = {
  youtube: function(){ return `
    <img src="assets/youtube.svg" alt="YouTube" style="height:54px;width:auto">`; },

  netflix: function(){ return `
    <span style="font-weight:800;font-size:40px;letter-spacing:3px;color:#E50914;text-shadow:0 2px 10px rgba(229,9,20,.35)">NETFLIX</span>`; },

  prime: function(){ return `
    <img src="assets/primevideo.svg" alt="Prime Video" style="height:120px;width:auto">`; },

  disney: function(){ return `
    <img src="assets/disneyplus.svg" alt="Disney+" style="height:64px;width:auto">`; },

  dazn: function(){ return `
    <span style="font-weight:800;font-size:40px;letter-spacing:1px;color:#fff;font-style:italic">DAZN</span>`; },

  generic: function(title){ return `
    <div class="def"><div class="ini">${(title||'?').charAt(0).toUpperCase()}</div><div class="nm">${title||''}</div></div>`; },

  crunchy: function(){ return `
    <svg width="40" height="40" viewBox="0 0 24 24" fill="#fff"><path d="M2.933 13.467a10.55 10.55 0 1 1 21.067-.8V12c0-6.627-5.373-12-12-12S0 5.373 0 12s5.373 12 12 12h.8a10.617 10.617 0 0 1-9.867-10.533zM19.2 14a3.85 3.85 0 0 1-1.333-7.467A7.89 7.89 0 0 0 14 5.6a8.4 8.4 0 1 0 8.4 8.4 6.492 6.492 0 0 0-.133-1.6A3.415 3.415 0 0 1 19.2 14z"/></svg>
    <span style="font-weight:800;font-size:33px;letter-spacing:-.5px;color:#fff">Crunchyroll</span>`; },

  lgchannels: function(){ return `
    <div style="display:flex;align-items:center">
      <span style="display:grid;place-items:center;width:46px;height:46px;border-radius:12px;background:#ffd34d;color:#c81e24;font-weight:800;font-size:20px;box-shadow:0 4px 10px rgba(0,0,0,.2)">CH</span>
      <span style="font-weight:800;font-size:26px;color:#fff;line-height:1.05;margin-left:12px">LG<br>Channels</span>
    </div>`; },

  globo: function(){ return `
    <div style="display:flex;flex-direction:column;align-items:center;line-height:.9">
      <span style="font-weight:800;font-size:34px;color:#fff;letter-spacing:-1px">globo</span>
      <span style="font-weight:800;font-size:34px;color:#fff;letter-spacing:-1px">play</span>
    </div>`; },

  appletv: function(){ return `
    <svg width="34" height="40" viewBox="0 0 24 28" fill="#fff"><path d="M17.5 15c0-3 2.2-4.2 2.3-4.3-1.2-1.9-3.2-2.1-3.9-2.2-1.7-.2-3.3 1-4.1 1-.8 0-2.1-1-3.5-.9-1.8 0-3.5 1-4.4 2.6-1.9 3.3-.5 8.1 1.3 10.8.9 1.3 1.9 2.7 3.3 2.7 1.3-.1 1.8-.9 3.4-.9 1.6 0 2 .9 3.4.8 1.4 0 2.3-1.3 3.2-2.6.6-.9 1-1.8 1.4-2.8-2.9-1.1-3.1-4.9-3.1-5z"/><path d="M14.6 6.3c.7-.9 1.2-2.1 1.1-3.3-1 0-2.3.7-3 1.6-.7.8-1.3 2-1.1 3.2 1.1.1 2.3-.6 3-1.5z"/></svg>
    <span style="font-weight:600;font-size:40px;color:#fff;margin-left:4px">tv</span>`; },

  mercado: function(){ return `
    <div style="display:flex;align-items:center">
      <span style="display:grid;place-items:center;width:62px;height:62px;border-radius:50%;background:#fff;box-shadow:inset 0 0 0 2px rgba(45,50,119,.15)">
        <img src="assets/handshake.svg" alt="" style="width:40px;height:40px">
      </span>
      <span style="font-weight:800;font-size:30px;color:#2d3277;line-height:.92;margin-left:14px">mercado<br>play</span>
    </div>`; },

  spotify: function(){ return `
    <svg width="42" height="42" viewBox="0 0 24 24"><circle cx="12" cy="12" r="11" fill="#1db954"/><path d="M6.5 9.5c3.2-1 7.3-.6 10 1.1M7 12.6c2.6-.8 5.8-.5 8 1M7.6 15.4c2.1-.6 4.3-.3 5.9.8" stroke="#000" stroke-width="1.5" fill="none" stroke-linecap="round"/></svg>
    <span style="font-weight:800;font-size:32px;letter-spacing:-.5px;color:#fff">Spotify</span>`; },

  applemusic: function(){ return `
    <svg width="40" height="40" viewBox="0 0 24 24" fill="#fff">
      <path d="M9 5.4l9-1.8v3.1l-9 1.8z"/>
      <rect x="8.3" y="6" width="1.5" height="10.2"/>
      <rect x="16.5" y="4" width="1.5" height="9.2"/>
      <circle cx="6.9" cy="16.2" r="2.5"/>
      <circle cx="15.1" cy="13.2" r="2.5"/>
    </svg>
    <span style="color:#fff;font-weight:800;font-size:28px;letter-spacing:-.3px">Music</span>`; },

  apps: function(){ return `
    <div style="display:flex;flex-direction:column;align-items:center">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="#2a2d34"><rect x="3" y="3" width="7.5" height="7.5" rx="2.4"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="2.4"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="2.4"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2.4"/></svg>
      <span style="font-weight:800;font-size:20px;letter-spacing:.5px;color:#2a2d34;margin-top:10px">APPS</span>
    </div>`; },

  iptv: function(){ return `
    <span style="font-weight:800;font-size:40px;color:#fff;letter-spacing:-1px">4K<span style="font-size:18px;color:#8ecbff;margin-left:4px">IPTV</span></span>`; }
};
