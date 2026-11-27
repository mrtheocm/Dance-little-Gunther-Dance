// Teste do reconhecimento de links de música.
'use strict';
const { parseMusicLink } = require('../links.js');

const cases = [
  ['https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'youtube', 'embed/dQw4w9WgXcQ?'],
  ['https://youtu.be/dQw4w9WgXcQ?si=abc', 'youtube', 'embed/dQw4w9WgXcQ?'],
  ['youtube.com/watch?v=dQw4w9WgXcQ&t=42', 'youtube', 'embed/dQw4w9WgXcQ?'],
  ['https://m.youtube.com/watch?v=dQw4w9WgXcQ', 'youtube', 'embed/dQw4w9WgXcQ?'],
  ['https://music.youtube.com/watch?v=dQw4w9WgXcQ&list=RDAMVMdQw4w9WgXcQ', 'youtube', 'list=RDAMVMdQw4w9WgXcQ'],
  ['https://www.youtube.com/shorts/dQw4w9WgXcQ', 'youtube', 'embed/dQw4w9WgXcQ?'],
  ['https://www.youtube.com/playlist?list=PL1234567890abcdef', 'youtube', 'videoseries?list=PL1234567890abcdef'],
  ['https://soundcloud.com/artista/musica', 'soundcloud', encodeURIComponent('https://soundcloud.com/artista/musica')],
  ['https://m.soundcloud.com/artista/musica?utm_source=x', 'soundcloud', encodeURIComponent('https://soundcloud.com/artista/musica') + '&'],
  ['https://on.soundcloud.com/AbCdEf', 'soundcloud', encodeURIComponent('https://on.soundcloud.com/AbCdEf')],
  ['https://open.spotify.com/track/123', null],
  ['https://www.youtube.com/watch?v=curto', null],
  ['https://soundcloud.com/', null],
  ['qualquer coisa', null],
  ['', null],
];
let failed = false;
for (const [input, kind, fragment] of cases) {
  const r = parseMusicLink(input);
  const ok = kind === null ? r === null : r && r.kind === kind && r.embedUrl.includes(fragment);
  if (!ok) failed = true;
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${JSON.stringify(input)} -> ${r ? r.kind + ' ' + r.embedUrl : 'não reconhecido'}`);
}
process.exit(failed ? 1 : 0);
