/**
 * Web Audio API Sound Synthesizer & Mobile Ringtone Engine
 * Supports WhatsApp Web notification alerts, mobile phone ringtone generator, and Web Push notifications.
 */

let audioCtx: AudioContext | null = null;
let currentRingtoneOscillators: { stop: () => void }[] = [];
let isRingtoneActive = false;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

/**
 * Play WhatsApp incoming message sound (double soft chime)
 */
export function playIncomingSound() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // First tone (E5 ~ 659Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(659.25, now);
    gain1.gain.setValueAtTime(0.15, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.15);

    // Second tone (A5 ~ 880Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, now + 0.08);
    gain2.gain.setValueAtTime(0.2, now + 0.08);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.08);
    osc2.stop(now + 0.3);
  } catch (err) {
    console.warn('Could not play incoming sound audio:', err);
  }
}

/**
 * Play WhatsApp outgoing message sound (soft pop/tick)
 */
export function playOutgoingSound() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.06);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.06);
  } catch (err) {
    console.warn('Could not play outgoing sound audio:', err);
  }
}

/**
 * Play Mobile Phone Ringtone (dual-tone phone ring melody)
 * Simulates a realistic incoming call / urgent notification ringtone
 */
export function playMobileRingtone(durationMs: number = 4000) {
  try {
    stopMobileRingtone();
    const ctx = getAudioContext();
    isRingtoneActive = true;

    const playRingBurst = (timeOffset: number) => {
      if (!isRingtoneActive) return;

      const now = ctx.currentTime + timeOffset;

      // Tone 1: 440Hz (Standard A4)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(440, now);

      gain1.gain.setValueAtTime(0.25, now);
      gain1.gain.exponentialRampToValueAtTime(0.01, now + 1.2);

      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 1.2);

      // Tone 2: 480Hz (Harmonic blend)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(480, now);

      gain2.gain.setValueAtTime(0.25, now);
      gain2.gain.exponentialRampToValueAtTime(0.01, now + 1.2);

      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now);
      osc2.stop(now + 1.2);

      currentRingtoneOscillators.push({
        stop: () => {
          try {
            osc1.stop();
            osc2.stop();
          } catch (_) {}
        }
      });
    };

    // Sequence of 2 ring bursts
    playRingBurst(0);
    playRingBurst(1.6);

    // Auto stop after duration
    setTimeout(() => {
      stopMobileRingtone();
    }, durationMs);

  } catch (err) {
    console.warn('Could not play mobile ringtone:', err);
  }
}

/**
 * Stop mobile ringtone if currently playing
 */
export function stopMobileRingtone() {
  isRingtoneActive = false;
  currentRingtoneOscillators.forEach((o) => o.stop());
  currentRingtoneOscillators = [];
}

/**
 * Trigger Browser Native Notification & Audio Ringtone
 */
export async function triggerBrowserNotification(title: string, body: string, playRingtone = true) {
  // Play sound/ringtone
  if (playRingtone) {
    playMobileRingtone(3500);
  } else {
    playIncomingSound();
  }

  // Native notification
  if (!('Notification' in window)) return;

  if (Notification.permission === 'granted') {
    try {
      new Notification(title, {
        body,
        icon: 'https://i.ibb.co/Zz6H1zth/1785576538638.png',
        dir: 'rtl',
        lang: 'he',
      });
    } catch (e) {
      console.warn('Notification construction error:', e);
    }
  } else if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      new Notification(title, {
        body,
        icon: 'https://i.ibb.co/Zz6H1zth/1785576538638.png',
        dir: 'rtl',
        lang: 'he',
      });
    }
  }
}
