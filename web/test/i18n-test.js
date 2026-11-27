// Confere que todos os idiomas têm as mesmas chaves, sem texto vazio e com as mesmas variáveis {x}.
'use strict';
const { LANGS } = require('../i18n.js');
const base = LANGS.pt;
const vars = (s) => (s.match(/\{\w+\}/g) || []).sort().join(',');
let failed = false;
for (const [code, dict] of Object.entries(LANGS)) {
  const missing = Object.keys(base).filter((k) => !(k in dict));
  const extra = Object.keys(dict).filter((k) => !(k in base));
  const empty = Object.keys(dict).filter((k) => !String(dict[k]).trim());
  const badVars = Object.keys(base).filter((k) => k in dict && vars(base[k]) !== vars(dict[k]));
  const ok = !missing.length && !extra.length && !empty.length && !badVars.length;
  if (!ok) failed = true;
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${code} (${dict['lang.name']}): ${Object.keys(dict).length} textos` +
    (missing.length ? ` | faltando: ${missing.join(', ')}` : '') + (extra.length ? ` | sobrando: ${extra.join(', ')}` : '') +
    (empty.length ? ` | vazios: ${empty.join(', ')}` : '') + (badVars.length ? ` | variáveis diferentes: ${badVars.join(', ')}` : ''));
}
process.exit(failed ? 1 : 0);
