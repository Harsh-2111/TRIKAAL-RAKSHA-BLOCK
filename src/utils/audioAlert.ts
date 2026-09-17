/**
 * RAKSHA-BLOCK Audio Alert Engine
 * Synthesizes a crisp, professional Indian Railways control room announcement chime
 * using the Web Audio API without requiring any external audio assets.
 */

const AUDIO_MUTE_STORAGE_KEY = 'raksha_block_audio_muted';

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioContextClass =
    window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!audioCtx) {
    audioCtx = new AudioContextClass();
  }
  return audioCtx;
}

/**
 * Checks if audio is currently muted by user preference
 */
export function isAudioMuted(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(AUDIO_MUTE_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

/**
 * Sets user audio mute preference
 */
export function setAudioMuted(muted: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(AUDIO_MUTE_STORAGE_KEY, String(muted));
  } catch (err) {
    console.warn('Failed to save audio mute preference:', err);
  }
}

/**
 * Plays a melodic Indian Railways control room alert chime:
 * 3 sequential melodic tones with smooth exponential decay envelopes:
 * F5 (698.46 Hz) -> A5 (880.00 Hz) -> C6 (1046.50 Hz)
 */
export function playRailwayChime(overrideMute: boolean = false): void {
  if (!overrideMute && isAudioMuted()) return;

  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;

    const chimeSequence = [
      { freq: 698.46, start: now + 0.02, duration: 0.22, volume: 0.24 }, // F5
      { freq: 880.0, start: now + 0.18, duration: 0.26, volume: 0.28 },  // A5
      { freq: 1046.5, start: now + 0.38, duration: 0.55, volume: 0.32 }, // C6
    ];

    chimeSequence.forEach((note) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      // Warm tone using sine waves
      osc.type = 'sine';
      osc.frequency.setValueAtTime(note.freq, note.start);

      // Attack & decay
      gain.gain.setValueAtTime(0.0001, note.start);
      gain.gain.linearRampToValueAtTime(note.volume, note.start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, note.start + note.duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(note.start);
      osc.stop(note.start + note.duration);
    });
  } catch (err) {
    console.warn('Audio alert playback error:', err);
  }
}

/**
 * Plays an urgent high-priority double warning beep for critical conflicts / caution orders
 */
export function playUrgentAlert(overrideMute: boolean = false): void {
  if (!overrideMute && isAudioMuted()) return;

  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;
    const beeps = [
      { freq: 987.77, start: now + 0.02, duration: 0.15 }, // B5
      { freq: 987.77, start: now + 0.22, duration: 0.25 }, // B5
    ];

    beeps.forEach((beep) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(beep.freq, beep.start);

      gain.gain.setValueAtTime(0.0001, beep.start);
      gain.gain.linearRampToValueAtTime(0.3, beep.start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, beep.start + beep.duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(beep.start);
      osc.stop(beep.start + beep.duration);
    });
  } catch (err) {
    console.warn('Urgent audio alert playback error:', err);
  }
}
