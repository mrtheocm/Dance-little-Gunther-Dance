# Dance little Gunther, Dance 🕺

App para iPhone que **ouve a música da balada pelo microfone**, detecta a batida e o BPM em tempo real, e anima o **Gunther**, um bonequinho 2D, dançando no ritmo.

- 100% nativo: SwiftUI + AVFoundation + Accelerate. Sem dependências externas, sem internet.
- Análise em tempo real: FFT, fluxo espectral (com peso no grave/bumbo), detecção de onsets, autocorrelação para o BPM e um relógio de batidas que corrige a fase a cada bumbo.
- O Gunther troca de passo a cada 8 batidas (passo lateral, mãos pra cima, twist, pulo, running man) e reage ao volume, ao grave e aos agudos. A pista e os holofotes pulsam junto.
- iOS 17 ou mais novo.

## Como instalar no seu iPhone

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
