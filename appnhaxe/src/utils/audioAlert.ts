// Native Speech Synthesis & Web Audio API synthesizer for proximity warnings
// Works 100% offline with zero external network or asset dependencies.

export function playSuccessBeep() {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Low double tone for success sync
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
    osc.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.1); // E5
    
    gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
    
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    osc.start();
    osc.stop(audioCtx.currentTime + 0.35);
  } catch (e) {
    console.warn("AudioContext failed or blocked by user interaction gesture", e);
  }
}

export function playProximityAlert() {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Pulsing siren-like beep
    const time = audioCtx.currentTime;
    
    const osc1 = audioCtx.createOscillator();
    const osc2 = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(880, time); // A5
    osc1.frequency.linearRampToValueAtTime(660, time + 0.2); // E5
    osc1.frequency.linearRampToValueAtTime(880, time + 0.4);
    
    gainNode.gain.setValueAtTime(0.2, time);
    gainNode.gain.setValueAtTime(0.2, time + 0.1);
    gainNode.gain.exponentialRampToValueAtTime(0.01, time + 0.8);
    
    osc1.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    osc1.start();
    osc1.stop(time + 0.8);
    
    // Trigger motor vibration
    if (navigator.vibrate) {
      navigator.vibrate([200, 100, 200, 100, 300]);
    }
  } catch (e) {
    console.warn("AudioContext prohibited. User interaction required first", e);
  }
}

export function speakVietnamese(text: string) {
  if (!('speechSynthesis' in window)) {
    console.warn("speechSynthesis is not supported in this browser");
    return;
  }
  
  try {
    // Cancel any active speech to avoid queuing delays
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'vi-VN';
    utterance.volume = 1;
    utterance.rate = 0.95; // slightly slower for high intelligibility on noisy buses
    
    // Try to find a Vietnamese speaking voice
    const voices = window.speechSynthesis.getVoices();
    const viVoice = voices.find(v => v.lang.includes('vi') || v.lang.includes('VI'));
    if (viVoice) {
      utterance.voice = viVoice;
    }
    
    window.speechSynthesis.speak(utterance);
  } catch (e) {
    console.warn("Speech synthesis failed", e);
  }
}
