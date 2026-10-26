/**
 * Procedural Web Audio API sound generator for ARENA
 * Generates punchy impact bass, digital particle shatter, and victory chimes
 * Zero external asset dependencies - works instantly in all modern browsers.
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

export function playImpactSound(isMuted: boolean = false): void {
  if (isMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  // 1. Deep sub-bass boom
  const osc1 = ctx.createOscillator();
  const gain1 = ctx.createGain();
  osc1.type = "sine";
  osc1.frequency.setValueAtTime(150, now);
  osc1.frequency.exponentialRampToValueAtTime(30, now + 0.4);

  gain1.gain.setValueAtTime(0.7, now);
  gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

  osc1.connect(gain1);
  gain1.connect(ctx.destination);
  osc1.start(now);
  osc1.stop(now + 0.5);

  // 2. High-frequency digital glitch / impact crack
  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  osc2.type = "sawtooth";
  osc2.frequency.setValueAtTime(800, now);
  osc2.frequency.exponentialRampToValueAtTime(80, now + 0.15);

  gain2.gain.setValueAtTime(0.4, now);
  gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

  osc2.connect(gain2);
  gain2.connect(ctx.destination);
  osc2.start(now);
  osc2.stop(now + 0.2);
}

export function playShatterSound(isMuted: boolean = false): void {
  if (isMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  // Noise burst for crystal fragmentation
  const bufferSize = ctx.sampleRate * 0.3;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  const noise = ctx.createBufferSource();
  noise.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = "highpass";
  filter.frequency.setValueAtTime(2000, now);
  filter.frequency.exponentialRampToValueAtTime(800, now + 0.3);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.35, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

  noise.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  noise.start(now);
  noise.stop(now + 0.3);
}

export function playVictoryFanfare(isMuted: boolean = false): void {
  if (isMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const notes = [261.63, 329.63, 392.0, 523.25]; // C, E, G, High C

  notes.forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(freq, now + idx * 0.1);

    gain.gain.setValueAtTime(0, now + idx * 0.1);
    gain.gain.linearRampToValueAtTime(0.3, now + idx * 0.1 + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.6);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now + idx * 0.1);
    osc.stop(now + idx * 0.1 + 0.7);
  });
}

/**
 * High-energy party fanfare & celebratory melody for Marco Easter Egg.
 * Uses Web Audio synthesizer to generate festive brass, bouncy bass, and chimes.
 * Returns a cancel function to stop playback immediately when modal closes.
 */
export function playPartyFanfare(isMuted: boolean = false): () => void {
  if (isMuted) return () => {};
  const ctx = getAudioContext();
  if (!ctx) return () => {};

  const masterGain = ctx.createGain();
  masterGain.gain.setValueAtTime(0.28, ctx.currentTime);
  masterGain.connect(ctx.destination);

  const activeNodes: OscillatorNode[] = [];
  const now = ctx.currentTime;

  // Party melody notes (frequencies in Hz: C4, E4, G4, A4, G4, C5, E5, D5, C5...)
  const melody = [
    { freq: 261.63, time: 0.0, dur: 0.18, type: "sawtooth" as OscillatorType }, // C4
    { freq: 329.63, time: 0.18, dur: 0.18, type: "sawtooth" as OscillatorType }, // E4
    { freq: 392.00, time: 0.36, dur: 0.22, type: "sawtooth" as OscillatorType }, // G4
    { freq: 523.25, time: 0.60, dur: 0.35, type: "triangle" as OscillatorType }, // C5
    { freq: 392.00, time: 0.98, dur: 0.18, type: "sawtooth" as OscillatorType }, // G4
    { freq: 523.25, time: 1.18, dur: 0.20, type: "sawtooth" as OscillatorType }, // C5
    { freq: 659.25, time: 1.40, dur: 0.55, type: "triangle" as OscillatorType }, // E5
    { freq: 587.33, time: 1.98, dur: 0.20, type: "sawtooth" as OscillatorType }, // D5
    { freq: 523.25, time: 2.20, dur: 0.65, type: "triangle" as OscillatorType }, // C5
    // Joyful secondary arpeggio
    { freq: 659.25, time: 2.90, dur: 0.15, type: "triangle" as OscillatorType }, // E5
    { freq: 783.99, time: 3.08, dur: 0.15, type: "triangle" as OscillatorType }, // G5
    { freq: 1046.50, time: 3.26, dur: 0.70, type: "triangle" as OscillatorType }, // C6
  ];

  // Upbeat bouncy bass line
  const bassNotes = [
    { freq: 130.81, time: 0.0, dur: 0.35 },
    { freq: 164.81, time: 0.4, dur: 0.35 },
    { freq: 196.00, time: 0.8, dur: 0.35 },
    { freq: 130.81, time: 1.2, dur: 0.35 },
    { freq: 174.61, time: 1.6, dur: 0.35 },
    { freq: 196.00, time: 2.0, dur: 0.45 },
    { freq: 130.81, time: 2.6, dur: 0.70 },
    { freq: 130.81, time: 3.3, dur: 0.80 },
  ];

  // Schedule melody
  melody.forEach((note) => {
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.type = note.type;
      osc.frequency.setValueAtTime(note.freq, now + note.time);

      filter.type = "lowpass";
      filter.frequency.setValueAtTime(2500, now + note.time);

      gain.gain.setValueAtTime(0, now + note.time);
      gain.gain.linearRampToValueAtTime(0.3, now + note.time + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + note.time + note.dur);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(masterGain);

      osc.start(now + note.time);
      osc.stop(now + note.time + note.dur + 0.05);
      activeNodes.push(osc);
    } catch {
      // Guard against scheduling errors
    }
  });

  // Schedule bass
  bassNotes.forEach((note) => {
    try {
      const bassOsc = ctx.createOscillator();
      const bassGain = ctx.createGain();

      bassOsc.type = "sine";
      bassOsc.frequency.setValueAtTime(note.freq, now + note.time);

      bassGain.gain.setValueAtTime(0, now + note.time);
      bassGain.gain.linearRampToValueAtTime(0.25, now + note.time + 0.04);
      bassGain.gain.exponentialRampToValueAtTime(0.001, now + note.time + note.dur);

      bassOsc.connect(bassGain);
      bassGain.connect(masterGain);

      bassOsc.start(now + note.time);
      bassOsc.stop(now + note.time + note.dur + 0.05);
      activeNodes.push(bassOsc);
    } catch {
      // Guard against scheduling errors
    }
  });

  return () => {
    try {
      masterGain.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.05);
      setTimeout(() => {
        activeNodes.forEach((node) => {
          try {
            node.stop();
            node.disconnect();
          } catch {
            // Already stopped
          }
        });
      }, 100);
    } catch {
      // Ignore
    }
  };
}

/**
 * 8-Bit Pixel Glitch / Arcade Zap Sound.
 * Emits a punchy, retro chiptune glitch arpeggio using square waves.
 */
export function playPixelGlitchSound(isMuted: boolean = false): void {
  if (isMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "square"; // Classic 8-bit NES/Arcade square wave

  // Arpeggiate glitch frequencies rapidly
  osc.frequency.setValueAtTime(320, now);
  osc.frequency.setValueAtTime(840, now + 0.02);
  osc.frequency.setValueAtTime(560, now + 0.04);
  osc.frequency.setValueAtTime(1280, now + 0.06);
  osc.frequency.setValueAtTime(420, now + 0.09);

  gain.gain.setValueAtTime(0.18, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.13);
}

