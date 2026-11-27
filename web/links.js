// Reconhece links do YouTube, YouTube Music e SoundCloud e monta o endereço do player oficial embutido.
(function (root) {
  'use strict';

  function parseMusicLink(input) {
    const text = String(input || '').trim();
    if (!text) return null;
    let url;
    try { url = new URL(/^https?:\/\//i.test(text) ? text : 'https://' + text); } catch (_) { return null; }
    const host = url.hostname.toLowerCase().replace(/^(www|m)\./, '');

    if (host === 'youtu.be' || host === 'youtube.com' || host === 'music.youtube.com' || host === 'youtube-nocookie.com') {
      let id = null;
      if (host === 'youtu.be') id = url.pathname.slice(1).split('/')[0];
      else if (url.pathname === '/watch') id = url.searchParams.get('v');
      else {
        const m = url.pathname.match(/^\/(?:shorts|embed|live|v)\/([\w-]{11})/);
        if (m) id = m[1];
      }
      const list = url.searchParams.get('list');
      const validId = id && /^[\w-]{11}$/.test(id);
      const validList = list && /^[\w-]+$/.test(list);
      const base = 'https://www.youtube-nocookie.com/embed/';
      const opts = 'autoplay=1&playsinline=1&rel=0';
      if (validId) {
        return { kind: 'youtube', embedUrl: `${base}${id}?${opts}${validList ? '&list=' + list : ''}`, ratio: 16 / 9 };
      }
      if (validList) return { kind: 'youtube', embedUrl: `${base}videoseries?list=${list}&${opts}`, ratio: 16 / 9 };
      return null;
    }

    if (host === 'soundcloud.com' || host === 'on.soundcloud.com') {
      if (url.pathname.length <= 1) return null;
      const clean = `https://${host}${url.pathname}`;
      const params = 'auto_play=true&visual=false&hide_related=true&show_comments=false&show_reposts=false&color=%23ff5fa2';
      return { kind: 'soundcloud', embedUrl: `https://w.soundcloud.com/player/?url=${encodeURIComponent(clean)}&${params}`, height: 166 };
    }
    return null;
  }

  const api = { parseMusicLink };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.GuntherLinks = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
