/**
 * useSounds — suoni procedurali con Web Audio API
 * Nessun file esterno, tutto generato al volo.
 */

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext();
  return audioCtx;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function playTone(
  freq: number, type: OscillatorType, duration: number,
  volume = 0.3, startTime = 0, fadeOut = true
) {
  const ctx = getCtx();
  const t = ctx.currentTime + startTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  gain.gain.setValueAtTime(volume, t);
  if (fadeOut) gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(t);
  osc.stop(t + duration);
}

function playNoise(duration: number, volume = 0.15, startTime = 0) {
  const ctx = getCtx();
  const t = ctx.currentTime + startTime;
  const bufSize = ctx.sampleRate * duration;
  const buffer = ctx.createBuffer(1, bufSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;

  const source = ctx.createBufferSource();
  source.buffer = buffer;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(volume, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 400;
  filter.Q.value = 0.5;

  source.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  source.start(t);
  source.stop(t + duration);
}

// ── Suoni ─────────────────────────────────────────────────────────────────────

/** Click UI — breve tick leggero */
function playClick() {
  playTone(800, 'sine', 0.06, 0.12, 0, true);
}

/** Piazzamento cubetto — "plop" morbido */
function playCubePlaced() {
  const ctx = getCtx();
  const t = ctx.currentTime;
  // Suono basso che sale leggermente
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(180, t);
  osc.frequency.exponentialRampToValueAtTime(260, t + 0.08);
  gain.gain.setValueAtTime(0.35, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(t);
  osc.stop(t + 0.18);
  // Piccolo "click" sovrastante
  playTone(1200, 'triangle', 0.05, 0.08, 0);
}

/** Guerra/Invasione — tamburo di guerra grave + rumore */
function playWar() {
  // Tamburo basso
  const ctx = getCtx();
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(80, t);
  osc.frequency.exponentialRampToValueAtTime(40, t + 0.3);
  gain.gain.setValueAtTime(0.6, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(t);
  osc.stop(t + 0.4);

  // Rumore impatto
  playNoise(0.15, 0.25, 0);

  // Nota acuta di allarme
  playTone(440, 'sawtooth', 0.3, 0.15, 0.05);
  playTone(380, 'sawtooth', 0.25, 0.1, 0.2);
}

/** Fine turno — fanfara medievale breve */
function playEndTurn() {
  // Sequenza di note: sol-la-si-do
  const notes = [392, 440, 494, 523];
  notes.forEach((freq, i) => {
    playTone(freq, 'triangle', 0.18, 0.2, i * 0.12);
  });
  // Basso che accompagna
  playTone(196, 'sine', 0.5, 0.15, 0);
}

/** Vittoria — fanfara trionfale */
function playVictory() {
  const melody = [523, 659, 784, 1047];
  melody.forEach((freq, i) => {
    playTone(freq, 'triangle', 0.25, 0.25, i * 0.15);
  });
  // Accordo finale
  [523, 659, 784].forEach(freq => {
    playTone(freq, 'sine', 0.8, 0.15, 0.65);
  });
  playTone(261, 'sine', 0.8, 0.2, 0.65);
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useSounds() {
  // Inizializza AudioContext al primo uso (richiede interazione utente)
  const resume = () => {
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  };

  return {
    playClick:       () => { resume(); playClick(); },
    playCubePlaced:  () => { resume(); playCubePlaced(); },
    playWar:         () => { resume(); playWar(); },
    playEndTurn:     () => { resume(); playEndTurn(); },
    playVictory:     () => { resume(); playVictory(); },
  };
}