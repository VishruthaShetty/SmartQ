/**
 * Gentle hospital synthesized announcement chime using Web Audio API
 * No external audio files needed; 100% reliable offline.
 */
let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  try {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      audioCtx = new AudioContextClass();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  } catch {
    return null;
  }
}

export function playHospitalChime() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  // Hospital dual-bell chime notes (E5 -> G#5 -> B5 pleasant triad)
  const notes = [
    { freq: 659.25, time: 0.0, dur: 0.4 },
    { freq: 830.61, time: 0.18, dur: 0.45 },
    { freq: 987.77, time: 0.38, dur: 0.7 },
  ];

  notes.forEach(({ freq, time, dur }) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now + time);

    // Smooth envelope attack and exponential decay
    gain.gain.setValueAtTime(0.001, now + time);
    gain.gain.exponentialRampToValueAtTime(0.2, now + time + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + time + dur);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now + time);
    osc.stop(now + time + dur + 0.05);
  });
}

export function playEmergencyAlertSound() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'triangle';
  osc.frequency.setValueAtTime(880, now);
  osc.frequency.setValueAtTime(700, now + 0.12);
  osc.frequency.setValueAtTime(880, now + 0.24);

  gain.gain.setValueAtTime(0.001, now);
  gain.gain.linearRampToValueAtTime(0.25, now + 0.05);
  gain.gain.linearRampToValueAtTime(0.001, now + 0.4);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.45);
}
