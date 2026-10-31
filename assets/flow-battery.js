/* Battery level support is optional; it cannot read the device's OS power-saver switch. */
(() => {
  const root = document.documentElement;
  const KEY = 'sg-flow-battery-mode';
  const valid = new Set(['auto', 'on', 'off']);
  let preference = 'auto', manager = null, apiStatus = 'checking', requested = false;
  let active = false, toastTimer = 0;
  try { const saved = localStorage.getItem(KEY); if (valid.has(saved)) preference = saved; } catch {}
  const isFlow = () => root.dataset.glass === 'on';
  const lang = () => root.lang === 'en' ? 'en' : 'ar';
  const label = (ar, en) => lang() === 'en' ? en : ar;
  function signal() { window.dispatchEvent(new Event('sg-flow-power-change')); }
  function batteryIcon(low) {
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 48 48');
    svg.setAttribute('aria-hidden', 'true');
    const parts = [
      ['rect', {x:3,y:12,width:31,height:23,rx:5,fill:'none',stroke:'currentColor','stroke-width':2.4}],
      ['rect', {x:35,y:19,width:3,height:9,rx:1.5,fill:'currentColor'}],
      ['rect', {x:7,y:16,width:low?7:23,height:15,rx:2,fill:'currentColor',opacity:'.82'}],
      ['path', {d:low?'M41 8v10m-4-4 4 4 4-4':'M40 7v10m-4-6 4-4 4 4',fill:'none',stroke:'currentColor','stroke-width':2.5,'stroke-linecap':'round','stroke-linejoin':'round'}]
    ];
    for (const [tag, attrs] of parts) { const el = document.createElementNS(ns, tag); for (const [k,v] of Object.entries(attrs)) el.setAttribute(k,String(v)); svg.append(el); }
    return svg;
  }
  function notice(on, low, percent) {
    const old = document.querySelector('.sg-power-toast');
    if (old) old.remove();
    const box = document.createElement('div');
    box.className = 'sg-toast sg-power-toast';
    box.setAttribute('role','status'); box.setAttribute('aria-live','polite');
    box.append(batteryIcon(on && low));
    const text = document.createElement('span');
    if (on && low) text.textContent = label(`البطارية منخفضة (${percent}٪). تم إيقاف المؤثرات الإضافية وتهدئة الحركة.`, `Battery is low (${percent}%). Extra effects are off and motion is gentler.`);
    else if (on) text.textContent = label('تم تشغيل توفير الحركة وتهدئة المؤثرات.', 'Motion saving is on and effects are gentler.');
    else text.textContent = label('تم إيقاف توفير الحركة وعادت التأثيرات المعتادة.', 'Motion saving is off and the usual effects are back.');
    box.append(text);
    (document.body || root).append(box);
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => box.remove(), 4500);
  }
  function update() {
    if (!isFlow()) {
      active = false;
      delete root.dataset.flowPower;
      signal();
      return;
    }
    const level = manager && Number.isFinite(manager.level) ? Math.max(0, Math.min(1, manager.level)) : null;
    const notCharging = manager && manager.charging === false;
    const low = !!(notCharging && level !== null && (level <= .20 || (active && preference === 'auto' && level < .25)));
    const next = preference === 'on' || (preference === 'auto' && low);
    if (next !== active) {
      active = next;
      if (active) root.dataset.flowPower = 'save'; else delete root.dataset.flowPower;
      notice(active, preference === 'auto' && low, level === null ? null : Math.round(level * 100));
    } else if (active) root.dataset.flowPower = 'save';
    else delete root.dataset.flowPower;
    signal();
  }
  function requestBattery() {
    if (!isFlow() || requested || manager) return;
    requested = true;
    if (typeof navigator.getBattery !== 'function') { apiStatus = 'unavailable'; update(); return; }
    apiStatus = 'checking'; signal();
    try {
      Promise.resolve(navigator.getBattery()).then(battery => {
        manager = battery; apiStatus = 'available';
        battery.addEventListener('levelchange', update);
        battery.addEventListener('chargingchange', update);
        update();
      }).catch(() => { apiStatus = 'unavailable'; update(); });
    } catch { apiStatus = 'unavailable'; update(); }
  }
  function setMode(mode) {
    if (!valid.has(mode)) return;
    preference = mode;
    try { localStorage.setItem(KEY, mode); } catch {}
    requestBattery(); update();
  }
  function getState() {
    return { mode:preference, active, status:apiStatus,
      level:manager && Number.isFinite(manager.level) ? Math.round(manager.level * 100) : null,
      charging:manager ? !!manager.charging : null };
  }
  function sync() {
    if (isFlow()) { requestBattery(); update(); }
    else { requested = !!manager; update(); }
  }
  window.sgFlowPower = { getState, setMode };
  new MutationObserver(sync).observe(root, { attributes:true, attributeFilter:['data-glass'] });
  window.addEventListener('storage', event => {
    if (event.key !== KEY) return;
    preference = valid.has(event.newValue) ? event.newValue : 'auto';
    update();
  });
  if (document.body) sync(); else document.addEventListener('DOMContentLoaded', sync, { once:true });
})();
