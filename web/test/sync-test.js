// Verifica que os pés do Gunther tocam o chão exatamente no kick.
// Para cada passo, varre a batida inteira e mede a altura de cada pé.
'use strict';
global.window = globalThis;
require('../dancer.js');
require('../char-gunther.js');
const { computeScene, characters, CONTACT } = window.GuntherDancer;
const gunther = characters.find((c) => c.id === 'gunther');

const period = 0.5;
const names = ['passo lateral', 'mãos pra cima', 'twist', 'pulo', 'running man', 'disco', 'headbang', 'onda'];
// Passos em que algum pé (ou o corpo todo) sai do chão entre as batidas.
const airborne = new Set([0, 2, 3, 4, 5, 7]);

function feetAt(move, beat, phase) {
  const state = {
    level: 0.8, bass: 0.8, mid: 0.5, high: 0.3, bpm: 120, hasBeat: true, isSilent: false,
    beatPeriod: period, lastBeatTime: 100, beatCount: move * 8 + beat, confidence: 1, lastOnsetTime: 100,
  };
  const scene = computeScene(state, 100 + phase * period, 0, 0, gunther.moveCount);
  if (scene.moveIndex !== move) throw new Error('passo errado');
  const sk = gunther.solve(gunther.pose(scene));
  return [sk.legL.foot.y, sk.legR.foot.y];
}

let failed = false;
const check = (ok, msg) => { if (!ok) { failed = true; console.log('FAIL ' + msg); } };

for (let move = 0; move < 8; move++) {
  let maxLift = 0, earliestLanding = 1, worstAtKick = 0, worstContact = 0;
  for (let beat = 0; beat < 4; beat++) {
    worstAtKick = Math.max(worstAtKick, ...feetAt(move, beat, 0));
    for (let ph = 0; ph < CONTACT; ph += 0.01) worstContact = Math.max(worstContact, ...feetAt(move, beat, ph));
    // Depois do pico, procura o primeiro instante em que os dois pés voltam ao chão.
    let peak = 0, peakPh = 0;
    for (let ph = CONTACT; ph < 1; ph += 0.005) {
      const h = Math.max(...feetAt(move, beat, ph));
      if (h > peak) { peak = h; peakPh = ph; }
    }
    maxLift = Math.max(maxLift, peak);
    if (peak > 0.05) {
      for (let ph = peakPh; ph < 1; ph += 0.005) {
        if (Math.max(...feetAt(move, beat, ph)) < 0.01) { earliestLanding = Math.min(earliestLanding, ph); break; }
      }
    }
  }
  check(worstAtKick < 0.005, `${names[move]}: pé fora do chão no kick (${worstAtKick.toFixed(3)})`);
  check(worstContact < 0.005, `${names[move]}: pé saiu do chão durante o contato (${worstContact.toFixed(3)})`);
  if (airborne.has(move)) {
    check(maxLift > 0.15, `${names[move]}: nenhum pé sai do chão (${maxLift.toFixed(3)})`);
    check(earliestLanding > 0.97, `${names[move]}: pousou cedo, em ${(earliestLanding * 100).toFixed(0)}% da batida`);
  }
  console.log(`${failed ? '    ' : 'OK  '}${names[move].padEnd(14)} pé no kick: ${worstAtKick.toFixed(3)}  ` +
    `pico: ${maxLift.toFixed(2)}  pouso: ${earliestLanding >= 1 ? 'só no kick' : (earliestLanding * 100).toFixed(1) + '% da batida'}`);
}

// Envelopes do núcleo.
const s0 = computeScene({ hasBeat: true, isSilent: false, beatPeriod: 0.5, lastBeatTime: 0, beatCount: 0, level: 0, bass: 0, mid: 0, high: 0, lastOnsetTime: 0 }, 0, 0, 0, 1);
check(s0.land === 1 && s0.hop === 0, 'no kick: land deve ser 1 e hop 0');
console.log(failed ? 'FALHOU' : 'OK   envelopes do núcleo e pés no kick');
process.exit(failed ? 1 : 0);
