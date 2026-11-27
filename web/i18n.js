// Traduções da interface. Para adicionar um idioma, copie o bloco "en" e traduza os valores;
// o teste web/test/i18n-test.js confere que nenhuma chave ficou faltando.
(function (root) {
  'use strict';

  const LANGS = {
    pt: {
      'lang.name': 'Português', 'lang.html': 'pt-BR',
      'meta.desc': 'O Gunther ouve a música e dança no ritmo.',
      'sync.paused': 'Pausado', 'sync.chooseMusic': 'Escolha músicas', 'sync.analyzeFailed': 'Não deu para analisar',
      'sync.analyzing': 'Analisando a música...', 'sync.waitingBeat': 'Esperando a batida', 'sync.locked': 'No ritmo!',
      'sync.listening': 'Ouvindo...', 'sync.searching': 'Procurando o ritmo', 'sync.locking': 'Pegando o ritmo',
      'bars.bass': 'GRAVE', 'bars.mid': 'MÉDIO', 'bars.high': 'AGUDO',
      'link.placeholder': 'Cole um link do YouTube ou SoundCloud', 'link.aria': 'Link da música', 'link.play': 'Tocar',
      'link.hint': 'O personagem ouve pelo microfone: use o alto-falante, não fone de ouvido.',
      'link.hide': '▴ Esconder player', 'link.show': '▾ Mostrar player',
      'link.unknown': 'Não reconheci esse link. Cole um link do YouTube, YouTube Music ou SoundCloud.',
      'link.ytTitle': 'Player do YouTube', 'link.scTitle': 'Player do SoundCloud',
      'player.prev': 'Música anterior', 'player.play': 'Tocar', 'player.pause': 'Pausar', 'player.next': 'Próxima música',
      'player.list': 'Lista de músicas', 'player.add': 'Adicionar músicas', 'player.seek': 'Posição na música',
      'player.none': 'Nenhuma música', 'player.empty': 'Toque em + para escolher músicas do aparelho',
      'player.badFile': 'Não consegui ler este arquivo. Tente MP3 ou M4A.',
      'player.analyzing': 'Analisando a batida... {p}%', 'player.info': '{bpm} BPM · faixa {i} de {n}',
      'picker.prev': 'Personagem anterior', 'picker.next': 'Próximo personagem', 'picker.all': 'Ver todos os personagens',
      'controls.settings': 'Ajustes', 'controls.characters': 'Personagens', 'controls.switchSource': 'Trocar fonte',
      'controls.fullscreen': 'Tela cheia',
      'settings.sync': 'Sincronia', 'settings.language': 'Idioma',
      'settings.syncHelp': 'Se o personagem parecer atrasado em relação à música, aumente. Se estiver adiantado, diminua.',
      'start.question': 'De onde vem a música? Nada é gravado nem enviado para lugar nenhum.',
      'start.mic.title': '🎤 Microfone', 'start.mic.desc': 'Para a balada: ouve o som do ambiente.',
      'start.file.title': '🎵 Minhas músicas', 'start.file.desc': 'Arquivos do aparelho, com sincronia perfeita.',
      'start.link.title': '▶️ YouTube ou SoundCloud', 'start.link.desc': 'Cole um link; o personagem ouve pelo microfone.',
      'start.chooseCharacter': '👾 Escolher personagem:',
      'gallery.title': 'Escolha quem vai dançar', 'gallery.close': 'Fechar',
      'error.noMic': 'Este navegador não dá acesso ao microfone. No iPhone, use o Safari ou atualize o iOS.',
      'error.micDenied': 'Sem permissão para o microfone. Libere o microfone para este site nos ajustes do navegador e tente de novo.',
      'error.micFailed': 'Não consegui abrir o microfone: {msg}',
      'char.gunther.desc': 'O dançarino da balada. Oito passos, do running man ao headbang.',
      'char.oddity.desc': 'Bichinho de chifres coloridos que dança com a cara toda.',
      'char.insect.desc': 'Inseto de seis pernas com braços de louva-a-deus.',
      'char.amoeba.desc': 'Ameba gelatinosa que pulsa com o grave.',
      'char.fish.name': 'Cardume', 'char.fish.desc': 'Quatorze peixes nadando em formação no ritmo.',
      'char.bees.name': 'Enxame', 'char.bees.desc': 'Doze abelhas que zumbem mais forte com os agudos.',
    },
    en: {
      'lang.name': 'English', 'lang.html': 'en',
      'meta.desc': 'Gunther listens to the music and dances to the beat.',
      'sync.paused': 'Paused', 'sync.chooseMusic': 'Pick some music', 'sync.analyzeFailed': "Couldn't analyze",
      'sync.analyzing': 'Analyzing the song...', 'sync.waitingBeat': 'Waiting for the beat', 'sync.locked': 'On beat!',
      'sync.listening': 'Listening...', 'sync.searching': 'Finding the beat', 'sync.locking': 'Catching the beat',
      'bars.bass': 'BASS', 'bars.mid': 'MID', 'bars.high': 'TREBLE',
      'link.placeholder': 'Paste a YouTube or SoundCloud link', 'link.aria': 'Music link', 'link.play': 'Play',
      'link.hint': 'The dancer listens through the microphone: use the speaker, not headphones.',
      'link.hide': '▴ Hide player', 'link.show': '▾ Show player',
      'link.unknown': "I didn't recognize that link. Paste a YouTube, YouTube Music or SoundCloud link.",
      'link.ytTitle': 'YouTube player', 'link.scTitle': 'SoundCloud player',
      'player.prev': 'Previous song', 'player.play': 'Play', 'player.pause': 'Pause', 'player.next': 'Next song',
      'player.list': 'Song list', 'player.add': 'Add songs', 'player.seek': 'Song position',
      'player.none': 'No song', 'player.empty': 'Tap + to pick songs from your device',
      'player.badFile': "Couldn't read this file. Try MP3 or M4A.",
      'player.analyzing': 'Analyzing the beat... {p}%', 'player.info': '{bpm} BPM · track {i} of {n}',
      'picker.prev': 'Previous character', 'picker.next': 'Next character', 'picker.all': 'See all characters',
      'controls.settings': 'Settings', 'controls.characters': 'Characters', 'controls.switchSource': 'Change source',
      'controls.fullscreen': 'Full screen',
      'settings.sync': 'Sync', 'settings.language': 'Language',
      'settings.syncHelp': 'If the dancer looks late compared with the music, turn it up. If it looks early, turn it down.',
      'start.question': 'Where is the music coming from? Nothing is recorded or sent anywhere.',
      'start.mic.title': '🎤 Microphone', 'start.mic.desc': 'For the club: listens to the sound around you.',
      'start.file.title': '🎵 My music', 'start.file.desc': 'Files on your device, with perfect sync.',
      'start.link.title': '▶️ YouTube or SoundCloud', 'start.link.desc': 'Paste a link; the dancer listens through the microphone.',
      'start.chooseCharacter': '👾 Choose character:',
      'gallery.title': 'Choose who dances', 'gallery.close': 'Close',
      'error.noMic': "This browser doesn't allow microphone access. On iPhone, use Safari or update iOS.",
      'error.micDenied': 'No microphone permission. Allow the microphone for this site in your browser settings and try again.',
      'error.micFailed': "Couldn't open the microphone: {msg}",
      'char.gunther.desc': 'The club dancer. Eight moves, from the running man to headbanging.',
      'char.oddity.desc': 'A little creature with colorful horns that dances with its whole face.',
      'char.insect.desc': 'A six-legged insect with praying-mantis arms.',
      'char.amoeba.desc': 'A jelly amoeba that pulses with the bass.',
      'char.fish.name': 'School', 'char.fish.desc': 'Fourteen fish swimming in formation to the beat.',
      'char.bees.name': 'Swarm', 'char.bees.desc': 'Twelve bees that buzz harder with the treble.',
    },
    es: {
      'lang.name': 'Español', 'lang.html': 'es',
      'meta.desc': 'Gunther escucha la música y baila al ritmo.',
      'sync.paused': 'En pausa', 'sync.chooseMusic': 'Elige música', 'sync.analyzeFailed': 'No se pudo analizar',
      'sync.analyzing': 'Analizando la canción...', 'sync.waitingBeat': 'Esperando el ritmo', 'sync.locked': '¡Al ritmo!',
      'sync.listening': 'Escuchando...', 'sync.searching': 'Buscando el ritmo', 'sync.locking': 'Casi al ritmo',
      'bars.bass': 'GRAVES', 'bars.mid': 'MEDIOS', 'bars.high': 'AGUDOS',
      'link.placeholder': 'Pega un enlace de YouTube o SoundCloud', 'link.aria': 'Enlace de la música', 'link.play': 'Reproducir',
      'link.hint': 'El personaje escucha por el micrófono: usa el altavoz, no auriculares.',
      'link.hide': '▴ Ocultar reproductor', 'link.show': '▾ Mostrar reproductor',
      'link.unknown': 'No reconocí ese enlace. Pega un enlace de YouTube, YouTube Music o SoundCloud.',
      'link.ytTitle': 'Reproductor de YouTube', 'link.scTitle': 'Reproductor de SoundCloud',
      'player.prev': 'Canción anterior', 'player.play': 'Reproducir', 'player.pause': 'Pausar', 'player.next': 'Siguiente canción',
      'player.list': 'Lista de canciones', 'player.add': 'Añadir canciones', 'player.seek': 'Posición en la canción',
      'player.none': 'Ninguna canción', 'player.empty': 'Toca + para elegir canciones de tu dispositivo',
      'player.badFile': 'No pude leer este archivo. Prueba con MP3 o M4A.',
      'player.analyzing': 'Analizando el ritmo... {p}%', 'player.info': '{bpm} BPM · pista {i} de {n}',
      'picker.prev': 'Personaje anterior', 'picker.next': 'Siguiente personaje', 'picker.all': 'Ver todos los personajes',
      'controls.settings': 'Ajustes', 'controls.characters': 'Personajes', 'controls.switchSource': 'Cambiar fuente',
      'controls.fullscreen': 'Pantalla completa',
      'settings.sync': 'Sincronía', 'settings.language': 'Idioma',
      'settings.syncHelp': 'Si el personaje parece atrasado respecto a la música, súbelo. Si va adelantado, bájalo.',
      'start.question': '¿De dónde viene la música? No se graba ni se envía nada.',
      'start.mic.title': '🎤 Micrófono', 'start.mic.desc': 'Para la fiesta: escucha el sonido del ambiente.',
      'start.file.title': '🎵 Mi música', 'start.file.desc': 'Archivos de tu dispositivo, con sincronía perfecta.',
      'start.link.title': '▶️ YouTube o SoundCloud', 'start.link.desc': 'Pega un enlace; el personaje escucha por el micrófono.',
      'start.chooseCharacter': '👾 Elegir personaje:',
      'gallery.title': 'Elige quién baila', 'gallery.close': 'Cerrar',
      'error.noMic': 'Este navegador no permite usar el micrófono. En iPhone, usa Safari o actualiza iOS.',
      'error.micDenied': 'Sin permiso para el micrófono. Permite el micrófono para este sitio en los ajustes del navegador e inténtalo de nuevo.',
      'error.micFailed': 'No pude abrir el micrófono: {msg}',
      'char.gunther.desc': 'El bailarín de la fiesta. Ocho pasos, del running man al headbanging.',
      'char.oddity.desc': 'Criaturita de cuernos de colores que baila con toda la cara.',
      'char.insect.desc': 'Insecto de seis patas con brazos de mantis religiosa.',
      'char.amoeba.desc': 'Ameba gelatinosa que late con los graves.',
      'char.fish.name': 'Cardumen', 'char.fish.desc': 'Catorce peces nadando en formación al ritmo.',
      'char.bees.name': 'Enjambre', 'char.bees.desc': 'Doce abejas que zumban más fuerte con los agudos.',
    },
    fr: {
      'lang.name': 'Français', 'lang.html': 'fr',
      'meta.desc': 'Gunther écoute la musique et danse en rythme.',
      'sync.paused': 'En pause', 'sync.chooseMusic': 'Choisis de la musique', 'sync.analyzeFailed': 'Analyse impossible',
      'sync.analyzing': 'Analyse du morceau...', 'sync.waitingBeat': 'En attente du rythme', 'sync.locked': 'En rythme !',
      'sync.listening': 'À l’écoute...', 'sync.searching': 'Recherche du rythme', 'sync.locking': 'Presque en rythme',
      'bars.bass': 'GRAVES', 'bars.mid': 'MÉDIUMS', 'bars.high': 'AIGUS',
      'link.placeholder': 'Colle un lien YouTube ou SoundCloud', 'link.aria': 'Lien de la musique', 'link.play': 'Lire',
      'link.hint': 'Le personnage écoute par le micro : utilise le haut-parleur, pas des écouteurs.',
      'link.hide': '▴ Masquer le lecteur', 'link.show': '▾ Afficher le lecteur',
      'link.unknown': 'Je n’ai pas reconnu ce lien. Colle un lien YouTube, YouTube Music ou SoundCloud.',
      'link.ytTitle': 'Lecteur YouTube', 'link.scTitle': 'Lecteur SoundCloud',
      'player.prev': 'Morceau précédent', 'player.play': 'Lire', 'player.pause': 'Pause', 'player.next': 'Morceau suivant',
      'player.list': 'Liste des morceaux', 'player.add': 'Ajouter des morceaux', 'player.seek': 'Position dans le morceau',
      'player.none': 'Aucun morceau', 'player.empty': 'Touche + pour choisir des morceaux sur ton appareil',
      'player.badFile': 'Impossible de lire ce fichier. Essaie un MP3 ou un M4A.',
      'player.analyzing': 'Analyse du rythme... {p} %', 'player.info': '{bpm} BPM · morceau {i} sur {n}',
      'picker.prev': 'Personnage précédent', 'picker.next': 'Personnage suivant', 'picker.all': 'Voir tous les personnages',
      'controls.settings': 'Réglages', 'controls.characters': 'Personnages', 'controls.switchSource': 'Autre source',
      'controls.fullscreen': 'Plein écran',
      'settings.sync': 'Synchronisation', 'settings.language': 'Langue',
      'settings.syncHelp': 'Si le personnage semble en retard sur la musique, augmente. S’il est en avance, diminue.',
      'start.question': 'D’où vient la musique ? Rien n’est enregistré ni envoyé.',
      'start.mic.title': '🎤 Micro', 'start.mic.desc': 'Pour la soirée : écoute le son ambiant.',
      'start.file.title': '🎵 Ma musique', 'start.file.desc': 'Les fichiers de ton appareil, synchronisation parfaite.',
      'start.link.title': '▶️ YouTube ou SoundCloud', 'start.link.desc': 'Colle un lien ; le personnage écoute par le micro.',
      'start.chooseCharacter': '👾 Choisir le personnage :',
      'gallery.title': 'Qui va danser ?', 'gallery.close': 'Fermer',
      'error.noMic': 'Ce navigateur ne donne pas accès au micro. Sur iPhone, utilise Safari ou mets iOS à jour.',
      'error.micDenied': 'Pas d’autorisation pour le micro. Autorise le micro pour ce site dans les réglages du navigateur et réessaie.',
      'error.micFailed': 'Impossible d’ouvrir le micro : {msg}',
      'char.gunther.desc': 'Le danseur de la soirée. Huit pas, du running man au headbang.',
      'char.oddity.desc': 'Petite créature aux cornes colorées qui danse avec tout son visage.',
      'char.insect.desc': 'Insecte à six pattes avec des bras de mante religieuse.',
      'char.amoeba.desc': 'Amibe gélatineuse qui pulse avec les basses.',
      'char.fish.name': 'Banc de poissons', 'char.fish.desc': 'Quatorze poissons qui nagent en formation, en rythme.',
      'char.bees.name': 'Essaim', 'char.bees.desc': 'Douze abeilles qui bourdonnent plus fort avec les aigus.',
    },
    de: {
      'lang.name': 'Deutsch', 'lang.html': 'de',
      'meta.desc': 'Gunther hört die Musik und tanzt im Takt.',
      'sync.paused': 'Pausiert', 'sync.chooseMusic': 'Wähle Musik', 'sync.analyzeFailed': 'Analyse fehlgeschlagen',
      'sync.analyzing': 'Song wird analysiert …', 'sync.waitingBeat': 'Warte auf den Beat', 'sync.locked': 'Im Takt!',
      'sync.listening': 'Hört zu …', 'sync.searching': 'Suche den Takt', 'sync.locking': 'Fast im Takt',
      'bars.bass': 'BASS', 'bars.mid': 'MITTEN', 'bars.high': 'HÖHEN',
      'link.placeholder': 'YouTube- oder SoundCloud-Link einfügen', 'link.aria': 'Musiklink', 'link.play': 'Abspielen',
      'link.hint': 'Die Figur hört über das Mikrofon mit: Nutze den Lautsprecher, keine Kopfhörer.',
      'link.hide': '▴ Player ausblenden', 'link.show': '▾ Player einblenden',
      'link.unknown': 'Diesen Link kenne ich nicht. Füge einen Link von YouTube, YouTube Music oder SoundCloud ein.',
      'link.ytTitle': 'YouTube-Player', 'link.scTitle': 'SoundCloud-Player',
      'player.prev': 'Vorheriger Song', 'player.play': 'Abspielen', 'player.pause': 'Pause', 'player.next': 'Nächster Song',
      'player.list': 'Songliste', 'player.add': 'Songs hinzufügen', 'player.seek': 'Position im Song',
      'player.none': 'Kein Song', 'player.empty': 'Tippe auf +, um Songs von deinem Gerät auszuwählen',
      'player.badFile': 'Diese Datei kann ich nicht lesen. Versuch es mit MP3 oder M4A.',
      'player.analyzing': 'Beat wird analysiert … {p} %', 'player.info': '{bpm} BPM · Titel {i} von {n}',
      'picker.prev': 'Vorherige Figur', 'picker.next': 'Nächste Figur', 'picker.all': 'Alle Figuren ansehen',
      'controls.settings': 'Einstellungen', 'controls.characters': 'Figuren', 'controls.switchSource': 'Quelle wechseln',
      'controls.fullscreen': 'Vollbild',
      'settings.sync': 'Synchronisierung', 'settings.language': 'Sprache',
      'settings.syncHelp': 'Wenn die Figur der Musik hinterherhinkt, erhöhe den Wert. Wenn sie vorauseilt, verringere ihn.',
      'start.question': 'Woher kommt die Musik? Nichts wird aufgenommen oder verschickt.',
      'start.mic.title': '🎤 Mikrofon', 'start.mic.desc': 'Für den Club: hört den Sound um dich herum.',
      'start.file.title': '🎵 Meine Musik', 'start.file.desc': 'Dateien auf deinem Gerät, perfekt synchron.',
      'start.link.title': '▶️ YouTube oder SoundCloud', 'start.link.desc': 'Link einfügen; die Figur hört über das Mikrofon mit.',
      'start.chooseCharacter': '👾 Figur wählen:',
      'gallery.title': 'Wer soll tanzen?', 'gallery.close': 'Schließen',
      'error.noMic': 'Dieser Browser erlaubt keinen Mikrofonzugriff. Nutze auf dem iPhone Safari oder aktualisiere iOS.',
      'error.micDenied': 'Keine Mikrofonberechtigung. Erlaube das Mikrofon für diese Seite in den Browsereinstellungen und versuche es erneut.',
      'error.micFailed': 'Mikrofon konnte nicht geöffnet werden: {msg}',
      'char.gunther.desc': 'Der Clubtänzer. Acht Moves, vom Running Man bis zum Headbangen.',
      'char.oddity.desc': 'Kleines Wesen mit bunten Hörnern, das mit dem ganzen Gesicht tanzt.',
      'char.insect.desc': 'Sechsbeiniges Insekt mit Gottesanbeterin-Armen.',
      'char.amoeba.desc': 'Glibber-Amöbe, die mit dem Bass pulsiert.',
      'char.fish.name': 'Fischschwarm', 'char.fish.desc': 'Vierzehn Fische, die im Takt in Formation schwimmen.',
      'char.bees.name': 'Bienenschwarm', 'char.bees.desc': 'Zwölf Bienen, die bei hohen Tönen lauter summen.',
    },
  };

  const FALLBACK = 'en';
  const listeners = [];
  let lang = FALLBACK;

  function detect() {
    let saved = null;
    try { saved = root.localStorage && root.localStorage.getItem('gunther-lang'); } catch (_) { /* sem storage */ }
    if (saved && LANGS[saved]) return saved;
    const wanted = (root.navigator && (root.navigator.languages || [root.navigator.language])) || [];
    for (const l of wanted) {
      const code = String(l || '').toLowerCase().split('-')[0];
      if (LANGS[code]) return code;
    }
    return FALLBACK;
  }

  // t('chave', { var: valor }); se faltar a tradução, usa inglês e depois a própria chave.
  function t(key, vars, fallback) {
    let s = LANGS[lang][key];
    if (s === undefined) s = LANGS[FALLBACK][key];
    if (s === undefined) s = fallback !== undefined ? fallback : key;
    if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? String(vars[k]) : m));
    return s;
  }

  // Aplica nos elementos com data-i18n="chave" (texto) e data-i18n-attr="atributo:chave, atributo:chave".
  function apply(doc) {
    doc = doc || root.document;
    if (!doc) return;
    doc.documentElement.lang = t('lang.html');
    doc.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
    doc.querySelectorAll('[data-i18n-attr]').forEach((el) => {
      for (const pair of el.dataset.i18nAttr.split(',')) {
        const [attr, key] = pair.split(':').map((x) => x.trim());
        if (attr && key) el.setAttribute(attr, t(key));
      }
    });
    const meta = doc.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute('content', t('meta.desc'));
  }

  function setLang(code) {
    if (!LANGS[code]) return;
    lang = code;
    try { root.localStorage && root.localStorage.setItem('gunther-lang', code); } catch (_) { /* sem storage */ }
    apply();
    listeners.forEach((fn) => fn(code));
  }

  lang = detect();
  const api = {
    LANGS, t, apply, setLang, detect,
    getLang: () => lang,
    languages: () => Object.keys(LANGS).map((code) => ({ code, name: LANGS[code]['lang.name'] })),
    onChange: (fn) => listeners.push(fn),
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.GuntherI18n = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
