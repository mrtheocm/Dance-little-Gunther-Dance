# Dance little Gunther, Dance 🕺

Página web que **ouve a música da balada pelo microfone**, detecta a batida e o BPM em tempo real, e põe um personagem 2D dançando no ritmo.

**Abra e dance: https://mrtheocm.github.io/Dance-little-Gunther-Dance/**

- Funciona no Safari e no Firefox do iPhone, no Android e em qualquer navegador de computador (Chrome, Firefox, Edge, Safari).
- Toque em **Começar a ouvir** e permita o microfone. Nada é gravado nem enviado: a análise acontece toda no aparelho.
- No iPhone, pelo Safari, use **Compartilhar → Adicionar à Tela de Início** para ter um ícone como app.
- HTML, CSS e JavaScript puro, sem dependências e sem build.

## Personagens

Toque em **Personagens** (ou no nome do personagem atual) para abrir a galeria, com cada um dançando ao vivo, e toque no cartão para escolher. Também dá para trocar pelas setas, deslizando o dedo sobre o palco ou com as setas do teclado. A escolha fica salva no navegador.

- **Gunther**, o humano, com 8 passos: passo lateral, mãos pra cima, twist, pulo, running man, disco, headbang e onda.
- **Tiny Oddity**, o bichinho fofo de chifres amarelo e roxo. Como é quase só rosto, dança com squash & stretch, pulinhos, giro e expressões: olhos no ritmo, felizes, de estrela no grave forte, piscadinha, surpresa e dormindo no silêncio.
- **Zig**, inseto com seis pernas que marcha em tripé, antenas e braços de louva-a-deus.
- **Glob**, ameba de contorno vivo, com pseudópodes e um núcleo com carinha.
- **Cardume** e **Enxame**, peixes e abelhas dançando em formação: roda, onda, oito, colunas quicando e coração.

Cada personagem troca de passo a cada 8 batidas e reage ao volume, ao grave e aos agudos. A pista e os holofotes pulsam junto.

## Como a música vira dança

1. **Batida e BPM**: FFT do microfone, fluxo espectral com peso no grave (o bumbo), detecção de onsets com limiar adaptativo, autocorrelação para o BPM e um relógio de batidas que prevê a próxima e corrige a fase a cada bumbo.
2. **Sincronia com o kick**: logo depois de cada kick há uma janela curta de contato com o chão. Os pulos e passos acontecem no resto da batida e pousam exatamente no kick seguinte, amassando só depois de tocar o chão. As pernas do Gunther usam cinemática inversa, para o pé apoiado tocar o chão de verdade.
3. **Ajuste fino**: na engrenagem há um ajuste de **sincronia** (em ms) caso o personagem pareça atrasado ou adiantado no seu aparelho. O valor fica salvo.

## Estrutura

```
web/
├── index.html                   Página, estilos, HUD e galeria
├── app.js                       Microfone (Web Audio), estado, controles e galeria
├── beat.js                      FFT, onsets, BPM e relógio de batidas
├── worklet.js                   AudioWorklet que entrega o áudio em mono
├── dancer.js                    Cena, fundo, pista, holofotes e registro de personagens
├── char-gunther.js              Gunther (8 passos, pernas com cinemática inversa)
├── char-oddity.js               Tiny Oddity
├── char-insect.js               Zig, o inseto
├── char-amoeba.js               Glob, a ameba
├── char-swarm.js                Cardume e Enxame (formações)
└── test/
    ├── beat-test.js             Detector com bumbo sintético em vários BPMs
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
  node web/test/sync-test.js
  ```
- Cada push no `main` que mexe em `web/` roda os testes e publica no GitHub Pages pelo workflow **Publicar versão web**. Se um teste falhar, o site não é atualizado.

## Versão iOS antiga

Houve um app nativo para iPhone (SwiftUI), abandonado em favor da versão web. Ele foi removido do `main`, mas continua no histórico do Git: a última versão está no commit `3cda1b6`. Para recuperá-lo:

```
git checkout 3cda1b6
```
