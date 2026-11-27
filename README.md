# Dance little Gunther, Dance 🕺

**English** · [Português](README.pt-BR.md)

A web page that puts a 2D character dancing to the beat of the music, whether it's what's playing at the club or what you pick.

**Open it and dance: https://mrtheocm.github.io/Dance-little-Gunther-Dance/**

- Works in Safari and Firefox on iPhone, on Android, and in any desktop browser (Chrome, Firefox, Edge, Safari).
- Nothing is recorded or sent anywhere: all the analysis happens on your device.
- On iPhone, in Safari, use **Share → Add to Home Screen** to get an app-like icon.
- Available in **English, Portuguese, Spanish, French and German**. The language follows your browser and can be changed on the start screen or under the gear icon.
- Plain HTML, CSS and JavaScript, with no dependencies and no build step.

## Where the music comes from

Pick one of three sources on the start screen. To switch later, use **Change source**.

- **🎤 Microphone**: for the club. Listens to the sound around you and finds the beat in real time.
- **🎵 My music**: plays audio files from your device (MP3, M4A, WAV, OGG, FLAC). On iPhone they come from the Files app, including iCloud Drive. Each song is analyzed in full first, in a few seconds, and the dancer follows the track's beat grid: exact sync, no microphone delay, even when you jump to the middle of the song. It has a playlist, next, previous and a seek bar, and the lock-screen controls work.
- **▶️ YouTube or SoundCloud**: paste a link (YouTube, YouTube Music, Shorts, playlists or SoundCloud). The official player plays inside the page and the dancer listens through the microphone, so use the speaker, not headphones. Sync is the same as in microphone mode. Spotify doesn't work: its player requires Premium and protects the audio.

## Characters

Tap **Characters** (or the current character's name) to open the gallery, with each one dancing live, and tap a card to choose. You can also switch with the arrows, by swiping across the stage, or with the keyboard arrow keys. The choice is saved in your browser.

- **Gunther**, the human, with 8 moves: side step, hands up, twist, jump, running man, disco, headbang and arm wave.
- **Tiny Oddity**, the fluffy creature with yellow and purple horns. Since it's almost all face, it dances with squash and stretch, hops, spins and expressions: eyes on the beat, happy eyes, star eyes on a big bass hit, a wink, surprise, and sleeping in silence.
- **Zig**, a six-legged insect that walks in a tripod gait, with antennae and praying-mantis arms.
- **Glob**, an amoeba with a living outline, pseudopods and a nucleus with a little face.
- **School** and **Swarm**, fish and bees dancing in formation: ring, wave, figure eight, bouncing columns and a heart.

Every character changes moves every 8 beats and reacts to volume, bass and treble. The dance floor and the spotlights pulse along.

## How music becomes dance

1. **Live beat and BPM** (microphone and links): an FFT of the microphone, spectral flux weighted toward the bass (the kick drum), onset detection with an adaptive threshold, autocorrelation for the BPM, and a beat clock that predicts the next beat and corrects its phase on every kick.
2. **Beat of a whole song** (files): the track is decoded at 22 kHz, the onset function is computed over the whole song, the tempo comes from autocorrelation and the beats from dynamic programming (Ellis's beat tracker). In tests, every beat lands within 6 ms of the real kick.
3. **Kick sync**: right after each kick there's a short floor-contact window. Jumps and steps happen during the rest of the beat and land exactly on the next kick, squashing only after touching the floor. Gunther's legs use inverse kinematics so a planted foot really touches the floor.
4. **Fine-tuning**: under the gear icon there's a **sync** setting (in ms) in case the dancer looks late or early on your device. The value is saved.

## Structure

```
web/
├── index.html                   Page, styles, HUD and gallery
├── i18n.js                      Interface translations (pt, en, es, fr, de)
├── app.js                       The three sources, player, dance state, controls and gallery
├── beat.js                      FFT, onsets, BPM and live beat clock
├── track.js                     Full-song analysis: beat grid and envelopes
├── links.js                     Recognizes YouTube and SoundCloud links and builds the embedded player
├── worklet.js                   AudioWorklet that delivers mono audio
├── dancer.js                    Scene, background, floor, spotlights and character registry
├── char-gunther.js              Gunther (8 moves, inverse-kinematics legs)
├── char-oddity.js               Tiny Oddity
├── char-insect.js               Zig, the insect
├── char-amoeba.js               Glob, the amoeba
├── char-swarm.js                School and Swarm (formations)
└── test/
    ├── beat-test.js             Live detector with a synthetic kick at several BPMs
    ├── track-test.js            Beat grid of synthetic songs (BPM, position, silence)
    ├── links-test.js            YouTube, YouTube Music and SoundCloud links
    ├── i18n-test.js             Every language has the same texts and variables
    └── sync-test.js             Gunther's feet touch the floor exactly on the kick
```

Code comments are in Portuguese.

## Development

- To run locally, serve the `web/` folder over HTTP (the microphone needs `localhost` or HTTPS):
  ```
  cd web && python3 -m http.server 8000
  ```
  and open http://localhost:8000.
- Tests, with Node 18 or newer:
  ```
  node web/test/beat-test.js
  node web/test/track-test.js
  node web/test/links-test.js
  node web/test/i18n-test.js
  node web/test/sync-test.js
  ```
- Every push to `main` that touches `web/` runs the tests and publishes to GitHub Pages through the **Publicar versão web** workflow. If a test fails, the site isn't updated.

## Translations

The texts live in `web/i18n.js`. To add a language, copy the `en` block, translate the values and run `node web/test/i18n-test.js`, which flags any missing text.

## Old iOS version

There used to be a native iPhone app (SwiftUI), dropped in favor of the web version. It was removed from `main` but is still in the Git history: the last version is commit `3cda1b6`. To get it back:

```
git checkout 3cda1b6
```
