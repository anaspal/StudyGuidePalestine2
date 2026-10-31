/* Optional Flow notification sound. No sound is played for ordinary taps. */
(() => {
  const SOUND_KEY = 'sg-flow-notification-sound';
  const VOLUME_KEY = 'sg-flow-notification-volume';
  const sections = ['news', 'homework', 'exams', 'live', 'teachers', 'progress', 'summaries', 'groups', 'schedule'];
  let memoryEnabled = true;
  let memoryVolume = 45;
  let audioContext = null;
  let lastSound = -Infinity;
  let hasGesture = false;
  const seenToasts = new WeakSet();
  const modeIsOn = () => document.documentElement.dataset.glass === 'on';
  const getStored = key => { try { return localStorage.getItem(key); } catch { return null; } };
  const putStored = (key, value) => { try { localStorage.setItem(key, value); } catch { /* use memory */ } };
  function enabled() {
    const value = getStored(SOUND_KEY);
    return value === null ? memoryEnabled : value !== 'off';
  }
  function volume() {
    const saved = getStored(VOLUME_KEY);
    const value = saved === null ? memoryVolume : Number(saved);
    return Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 45;
  }
  function changed() { window.dispatchEvent(new Event('sg-flow-sound-change')); }
  function prime() {
    if (!modeIsOn() || !enabled() || !hasGesture) return Promise.resolve(false);
    try {
      const Context = window.AudioContext || window.webkitAudioContext;
      if (!Context) return Promise.resolve(false);
      if (!audioContext || audioContext.state === 'closed') audioContext = new Context();
      if (audioContext.state === 'suspended') {
        return Promise.resolve(audioContext.resume()).then(() => audioContext.state === 'running').catch(() => false);
      }
      return Promise.resolve(audioContext.state === 'running');
    } catch { return Promise.resolve(false); }
  }
  async function play(isPreview = false) {
    if (!modeIsOn() || !enabled() || volume() <= 0 || !hasGesture) return false;
    const nowMs = Date.now();
    if (!isPreview && nowMs - lastSound < 1400) return false;
    lastSound = nowMs; // Collapse bursts, even while resume() is pending.
    if (!(await prime()) || !modeIsOn() || !enabled()) return false;
    const ctx = audioContext;
    if (!ctx || ctx.state !== 'running') return false;
    try {
      const now = ctx.currentTime;
      const master = ctx.createGain();
      master.gain.setValueAtTime(.055 * volume() / 100, now);
      master.connect(ctx.destination);
      // Two soft, short bell notes with a gentle attack and natural decay.
      let remainingNotes = 2;
      [[783.99, 0, .42, .65], [987.77, .105, .48, .42]].forEach(([frequency, delay, duration, strength]) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const start = now + delay;
        osc.type = 'sine';
        osc.frequency.setValueAtTime(frequency, start);
        gain.gain.setValueAtTime(.0001, start);
        gain.gain.exponentialRampToValueAtTime(strength, start + .025);
        gain.gain.exponentialRampToValueAtTime(.0001, start + duration);
        osc.connect(gain);
        gain.connect(master);
        osc.start(start);
        osc.stop(start + duration + .02);
        osc.onended = () => {
          try { osc.disconnect(); gain.disconnect(); if (--remainingNotes === 0) master.disconnect(); } catch {}
        };
      });
      return true;
    } catch { return false; }
  }
  function setEnabled(on) {
    memoryEnabled = !!on;
    putStored(SOUND_KEY, on ? 'on' : 'off');
    if (on) prime();
    changed();
  }
  function setVolume(value) {
    memoryVolume = Math.max(0, Math.min(100, Number(value) || 0));
    putStored(VOLUME_KEY, String(memoryVolume));
    changed();
  }
  function enableForMode() { setEnabled(true); }
  function modeDisabled() {
    if (audioContext && audioContext.state === 'running') {
      try { const result = audioContext.suspend(); if (result && result.catch) result.catch(() => {}); } catch {}
    }
    changed();
  }
  function changedSections(before, after) {
    return sections.filter(key => JSON.stringify(before?.[key] || {}) !== JSON.stringify(after?.[key] || {}));
  }
  // Resume only after a real interaction, as required by mobile browsers.
  const unlock = () => { hasGesture = true; prime(); };
  document.addEventListener('pointerdown', unlock, { passive: true });
  document.addEventListener('keydown', unlock);
  window.addEventListener('storage', event => {
    if (event.key === SOUND_KEY || event.key === VOLUME_KEY) changed();
  });
  function watchToasts() {
    const observer = new MutationObserver(records => {
      if (!modeIsOn() || !enabled()) return;
      for (const record of records) for (const node of record.addedNodes) {
        if (node.nodeType !== 1) continue;
        const toasts = [];
        if (node.matches('.sg-toast, [data-sonner-toast]')) toasts.push(node);
        toasts.push(...node.querySelectorAll('.sg-toast, [data-sonner-toast]'));
        for (const toast of toasts) {
          if (seenToasts.has(toast)) continue;
          seenToasts.add(toast);
          play(false);
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }
  window.sgFlowSound = { enabled, volume, setEnabled, setVolume, enableForMode, modeDisabled, preview: () => play(true), changedSections };
  if (document.body) watchToasts();
  else document.addEventListener('DOMContentLoaded', watchToasts, { once: true });
})();
