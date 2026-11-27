# Dance little Gunther, Dance 🕺

App para iPhone que **ouve a música da balada pelo microfone**, detecta a batida e o BPM em tempo real, e anima o **Gunther**, um bonequinho 2D, dançando no ritmo.

- 100% nativo: SwiftUI + AVFoundation + Accelerate. Sem dependências externas, sem internet.
- Análise em tempo real: FFT, fluxo espectral (com peso no grave/bumbo), detecção de onsets, autocorrelação para o BPM e um relógio de batidas que corrige a fase a cada bumbo.
- O Gunther troca de passo a cada 8 batidas (passo lateral, mãos pra cima, twist, pulo, running man) e reage ao volume, ao grave e aos agudos. A pista e os holofotes pulsam junto.
- iOS 17 ou mais novo.

## Versão web (mais fácil: sem instalar nada)

A pasta `web/` tem a mesma coisa em HTML, CSS e JavaScript puro, publicada automaticamente no GitHub Pages a cada push:

**https://mrtheocm.github.io/Dance-little-Gunther-Dance/**

- Funciona no Safari e no Firefox do iPhone, e em qualquer navegador de computador (Chrome, Firefox, Edge, Safari).
- Abra o link, toque em **Começar a ouvir** e permita o microfone. Nada é gravado nem enviado.
- No iPhone, pelo Safari, use **Compartilhar → Adicionar à Tela de Início** para ter um ícone como app.
- **Seis personagens**, trocados pelas setas na tela, deslizando o dedo sobre o palco ou com as setas do teclado:
  - **Gunther**, o humano, com 8 passos (passo lateral, mãos pra cima, twist, pulo, running man, disco, headbang e onda).
  - **Tiny Oddity**, o bichinho de pixel art: como é quase só rosto, dança com squash & stretch, pulinhos, giro e expressões (olhos no ritmo, felizes, de estrela no grave forte, piscadinha, surpresa e dormindo no silêncio).
  - **Zig**, inseto com seis pernas em onda, antenas e braços de louva-a-deus.
  - **Glob**, ameba de contorno vivo, com pseudópodes e um núcleo com carinha.
  - **Cardume** e **Enxame**, peixes e abelhas dançando em formação (roda, onda, oito, colunas e coração).
- Na engrenagem há um ajuste de **sincronia** (em ms) caso o Gunther pareça atrasado ou adiantado nesse navegador. O valor fica salvo.
- Teste offline do detector: `node web/test/beat-test.js`.

## Como instalar o app nativo no seu iPhone

### Opção A: com um Mac e Xcode (recomendado)

1. Instale o **Xcode 16** ou mais novo pela App Store.
2. Clone este repositório e abra `GuntherDance.xcodeproj`.
3. Em **Signing & Capabilities** do target `GuntherDance`:
   - Em *Team*, adicione sua conta Apple (uma conta gratuita funciona, não precisa pagar o programa de desenvolvedor).
   - Troque o *Bundle Identifier* para algo só seu, por exemplo `com.seunome.GuntherDance`.
4. Conecte o iPhone pelo cabo e, no celular, ative **Ajustes → Privacidade e Segurança → Modo Desenvolvedor**.
5. Escolha o iPhone como destino no Xcode e aperte **Run** (⌘R).
6. Na primeira vez, o iPhone vai pedir para confiar no desenvolvedor: **Ajustes → Geral → VPN e Gerenciamento de Dispositivo** → toque na sua conta → *Confiar*.

Com conta gratuita o app expira em 7 dias e precisa ser reinstalado pelo Xcode. Com a conta paga do Apple Developer Program ele dura 1 ano, e você também pode distribuir pelo TestFlight.

### Opção B: sem Mac, pelo GitHub Actions + sideload

Cada push neste repositório roda o workflow **Build iOS**, que compila o app e publica um artefato `GuntherDance-unsigned-ipa`.

1. Em **Actions → Build iOS**, abra a última execução e baixe o artefato.
2. Instale o `.ipa` com uma ferramenta de sideload que assina com a sua conta Apple, como **AltStore** ou **Sideloadly** (ambas precisam de um computador, Windows ou Mac, pelo menos na primeira instalação).

## Como usar

1. Abra o app e permita o microfone.
2. Deixe a música tocar. Em uns 4 segundos o número de **BPM** aparece e o indicador passa de *Procurando o ritmo* para *No ritmo!*.
3. Em silêncio o Gunther só balança de leve, esperando a próxima música.

A tela fica ligada enquanto o app está aberto. Ao sair do app, o microfone é desligado.

## Estrutura

```
web/
├── index.html                   Página, estilos e HUD
├── app.js                       Microfone (Web Audio), estado e controles
├── beat.js                      FFT, onsets, BPM e relógio de batidas (mesma lógica do Swift)
├── dancer.js                    Cena, fundo, pista, holofotes e registro de personagens
├── char-gunther.js              Gunther (8 passos)
├── char-oddity.js               Tiny Oddity, rasterizado em pixel art 64x64
├── char-insect.js               Zig, o inseto
├── char-amoeba.js               Glob, a ameba
├── char-swarm.js                Cardume e Enxame (formações)
├── worklet.js                   AudioWorklet que entrega o áudio em mono
└── test/beat-test.js            Teste com bumbo sintético em vários BPMs

GuntherDance/
├── GuntherDanceApp.swift        Entrada do app
├── ContentView.swift            Tela principal: HUD de BPM, barras de nível e controles
├── Audio/
│   ├── AudioAnalyzer.swift      Sessão de áudio, AVAudioEngine, permissão do microfone
│   └── BeatDetector.swift       FFT, onsets, BPM e relógio de batidas
└── Dancer/
    ├── DanceState.swift         Estado compartilhado entre áudio e tela
    └── DancerView.swift         Canvas com o Gunther, pista e holofotes
```

## Ajustes finos

- Compensação de latência: `lead` em `DanceScene.init` (`DancerView.swift`). Aumente se o Gunther parecer atrasado.
- Faixa de BPM e preferência por ~125 BPM: `estimateTempo()` em `BeatDetector.swift`.
- Sensibilidade a onsets: o limiar `mean + 1.5 * std + 0.01` em `analyzeHop`.
