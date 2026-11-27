// AudioWorklet: faz o downmix para mono e envia blocos de áudio para a thread principal.
class GuntherCapture extends AudioWorkletProcessor {
  process(inputs) {
    const input = inputs[0];
    if (!input || input.length === 0) return true;
    const n = input[0].length;
    const mono = new Float32Array(n);
    for (let c = 0; c < input.length; c++) {
      const ch = input[c];
      for (let i = 0; i < n; i++) mono[i] += ch[i];
    }
    if (input.length > 1) {
      const s = 1 / input.length;
      for (let i = 0; i < n; i++) mono[i] *= s;
    }
    this.port.postMessage(mono, [mono.buffer]);
    return true;
  }
}
registerProcessor('gunther-capture', GuntherCapture);
