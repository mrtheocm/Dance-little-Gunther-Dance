# Dance little Gunther, Dance 🕺

[English](README.md) · **Português**

Página web que põe um personagem 2D dançando no ritmo da música, seja a que toca na balada, seja a que você escolhe.

**Abra e dance: https://mrtheocm.github.io/Dance-little-Gunther-Dance/**

- Funciona no Safari e no Firefox do iPhone, no Android e em qualquer navegador de computador (Chrome, Firefox, Edge, Safari).
- Nada é gravado nem enviado: a análise acontece toda no aparelho.
- No iPhone, pelo Safari, use **Compartilhar → Adicionar à Tela de Início** para ter um ícone como app.
- Em **português, inglês, espanhol, francês e alemão**. O idioma vem do navegador e pode ser trocado na tela inicial ou na engrenagem.
- HTML, CSS e JavaScript puro, sem dependências e sem build.

## De onde vem a música

Na tela inicial, escolha uma das três fontes. Para trocar depois, use **Trocar fonte**.

- **🎤 Microfone**: para a balada. Ouve o som do ambiente e acha a batida em tempo real.
- **🎵 Minhas músicas**: toca arquivos do aparelho (MP3, M4A, WAV, OGG, FLAC). No iPhone eles vêm do app Arquivos, inclusive do iCloud Drive. Cada música é analisada inteira antes, em poucos segundos, e o personagem segue a grade de batidas da faixa: sincronia exata, sem atraso de microfone, mesmo pulando para o meio da música. Tem playlist, avançar, voltar e barra de posição, e os controles da tela de bloqueio funcionam.
- **▶️ YouTube ou SoundCloud**: cole um link (YouTube, YouTube Music, Shorts, playlists ou SoundCloud). O player oficial toca dentro da página e o personagem ouve pelo microfone, então use o alto-falante, não fone de ouvido. A sincronia é a do modo microfone. Spotify não funciona: o player deles exige Premium e protege o áudio.

## Personagens

Toque em **Personagens** (ou no nome do personagem atual) para abrir a galeria, com cada um dançando ao vivo, e toque no cartão para escolher. Também dá para trocar pelas setas, deslizando o dedo sobre o palco ou com as setas do teclado. A escolha fica salva no navegador.

- **Gunther**, o humano, com 8 passos: passo lateral, mãos pra cima, twist, pulo, running man, disco, headbang e onda.
- **Tiny Oddity**, o bichinho fofo de chifres amarelo e roxo. Como é quase só rosto, dança com squash & stretch, pulinhos, giro e expressões: olhos no ritmo, felizes, de estrela no grave forte, piscadinha, surpresa e dormindo no silêncio.
- **Zig**, inseto com seis pernas que marcha em tripé, antenas e braços de louva-a-deus.
- **Glob**, ameba de contorno vivo, com pseudópodes e um núcleo com carinha.
- **Cardume** e **Enxame**, peixes e abelhas dançando em formação: roda, onda, oito, colunas quicando e coração.

Cada personagem troca de passo a cada 8 batidas e reage ao volume, ao grave e aos agudos. A pista e os holofotes pulsam junto.

## Como a música vira dança

1. **Batida e BPM ao vivo** (microfone e links): FFT do microfone, fluxo espectral com peso no grave (o bumbo), detecção de onsets com limiar adaptativo, autocorrelação para o BPM e um relógio de batidas que prevê a próxima e corrige a fase a cada bumbo.
2. **Batida de uma música inteira** (arquivos): a faixa é decodificada a 22 kHz, a função de onset é calculada na música toda, o tempo sai da autocorrelação e as batidas de uma programação dinâmica (beat tracker de Ellis). Nos testes, cada batida cai a menos de 6 ms do kick real.
3. **Sincronia com o kick**: logo depois de cada kick há uma janela curta de contato com o chão. Os pulos e passos acontecem no resto da batida e pousam exatamente no kick seguinte, amassando só depois de tocar o chão. As pernas do Gunther usam cinemática inversa, para o pé apoiado tocar o chão de verdade.
4. **Ajuste fino**: na engrenagem há um ajuste de **sincronia** (em ms) caso o personagem pareça atrasado ou adiantado no seu aparelho. O valor fica salvo.

## Estrutura

```
web/
├── index.html                   Página, estilos, HUD e galeria
├── i18n.js                      Traduções da interface (pt, en, es, fr, de)
├── app.js                       As três fontes, player, estado da dança, controles e galeria
├── beat.js                      FFT, onsets, BPM e relógio de batidas ao vivo
├── track.js                     Análise completa de uma música: grade de batidas e envelopes
├── links.js                     Reconhece links do YouTube e SoundCloud e monta o player embutido
├── worklet.js                   AudioWorklet que entrega o áudio em mono
├── dancer.js                    Cena, fundo, pista, holofotes e registro de personagens
├── char-gunther.js              Gunther (8 passos, pernas com cinemática inversa)
├── char-oddity.js               Tiny Oddity
├── char-insect.js               Zig, o inseto
├── char-amoeba.js               Glob, a ameba
├── char-swarm.js                Cardume e Enxame (formações)
└── test/
    ├── beat-test.js             Detector ao vivo com bumbo sintético em vários BPMs
    ├── track-test.js            Grade de batidas de músicas sintéticas (BPM, posição, silêncio)
    ├── links-test.js            Links de YouTube, YouTube Music e SoundCloud
    ├── i18n-test.js             Todos os idiomas com os mesmos textos e variáveis
    └── sync-test.js             Pés do Gunther tocando o chão exatamente no kick
```

## Desenvolvimento

- Para rodar localmente, sirva a pasta `web/` por HTTP (o microfone exige `localhost` ou HTTPS):
  ```
  cd web && python3 -m http.server 8000
  ```
  e abra http://localhost:8000.
- Testes, com Node 18 ou mais novo:
  ```
  node web/test/beat-test.js
  node web/test/track-test.js
  node web/test/links-test.js
  node web/test/i18n-test.js
  node web/test/sync-test.js
  ```
- Cada push no `main` que mexe em `web/` roda os testes e publica no GitHub Pages pelo workflow **Publicar versão web**. Se um teste falhar, o site não é atualizado.

## Traduções

Os textos ficam em `web/i18n.js`. Para adicionar um idioma, copie o bloco `en`, traduza os valores e rode `node web/test/i18n-test.js`, que acusa qualquer texto faltando.

## Versão iOS antiga

Houve um app nativo para iPhone (SwiftUI), abandonado em favor da versão web. Ele foi removido do `main`, mas continua no histórico do Git: a última versão está no commit `3cda1b6`. Para recuperá-lo:

```
git checkout 3cda1b6
```
