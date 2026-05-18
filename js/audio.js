// ================= Sound (Web Audio API) =================
// 全ての音は合成音で生成、外部ファイル不要

let audioCtx = null;
let soundEnabled = true;

/** AudioContextを必要に応じて生成・再開 */
export function ensureAudio() {
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      audioCtx = null;
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

export function setSoundEnabled(enabled) {
  soundEnabled = enabled;
  if (enabled) ensureAudio();
}

/** 単音再生（基本ユーティリティ） */
function playTone(freq, duration, type = 'sine', volume = 0.1) {
  if (!soundEnabled || !audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(volume, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + duration);
}

/** SFXディクショナリ */
export const sfx = {
  place:    () => playTone(660, 0.08, 'triangle', 0.08),
  reject:   () => playTone(180, 0.15, 'sawtooth', 0.10),
  step:     () => playTone(440, 0.04, 'sine',     0.03),
  reward:   () => {
    playTone(523, 0.10, 'sine', 0.08);
    setTimeout(() => playTone(784, 0.15, 'sine', 0.08), 60);
  },
  cost:     () => playTone(220, 0.18, 'square',   0.06),
  attack:   () => playTone(880, 0.10, 'square',   0.08),
  boom:     () => {
    playTone(150, 0.20, 'sawtooth', 0.15);
    setTimeout(() => playTone(80, 0.25, 'sawtooth', 0.12), 50);
  },
  rotate:   () => playTone(550, 0.05, 'sine', 0.06),
  gameover: () => {
    [330, 277, 220, 165].forEach((f, i) => {
      setTimeout(() => playTone(f, 0.3, 'sawtooth', 0.1), i * 150);
    });
  },
  shop:     () => {
    [659, 784, 988].forEach((f, i) => {
      setTimeout(() => playTone(f, 0.12, 'triangle', 0.07), i * 80);
    });
  },
  best:     () => {
    [784, 988, 1318].forEach((f, i) => {
      setTimeout(() => playTone(f, 0.15, 'sine', 0.1), i * 100);
    });
  }
};
