/* Additional Flow interactions, active only in the optional new appearance. */
(() => {
  const root = document.documentElement;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const mobile = window.matchMedia('(max-width: 760px)');
  const isFlow = () => root.dataset.glass === 'on';
  const saving = () => root.dataset.flowPower === 'save';
  const closing = new WeakSet();

  // Delay the real close just long enough for the exit motion to be visible.
  window.sgFlowClose = (target, finish) => {
    const panel = typeof target === 'string' ? document.querySelector(target) : target;
    const layer = panel && (panel.closest('.drawer-layer,.modal-layer') || panel);
    if (!isFlow() || reduced.matches || !layer) { finish(); return; }
    if (closing.has(layer)) return;
    closing.add(layer);
    layer.classList.add('sg-flow-closing');
    window.setTimeout(() => { closing.delete(layer); finish(); }, saving() ? 130 : 260);
  };

  let turning = false;
  window.sgFlowLanguage = commit => {
    if (!isFlow() || reduced.matches) { commit(); return; }
    if (turning) return;
    turning = true;
    root.classList.remove('sg-flow-header-hidden');
    root.dataset.flowTurn = root.dir === 'rtl' ? 'to-en' : 'to-ar';
    root.classList.add('sg-flow-lang-out');
    window.setTimeout(() => {
      commit();
      root.classList.remove('sg-flow-lang-out');
      root.classList.add('sg-flow-lang-in');
      window.setTimeout(() => {
        root.classList.remove('sg-flow-lang-in');
        delete root.dataset.flowTurn;
        turning = false;
      }, saving() ? 130 : 300);
    }, saving() ? 80 : 150);
  };

  // A separate overlay avoids adding nodes into React-controlled buttons.
  document.addEventListener('pointerdown', event => {
    if (isFlow()) root.classList.remove('sg-flow-keyboard');
    if (!isFlow() || reduced.matches || saving() || event.button !== 0) return;
    const target = event.target instanceof Element && event.target.closest('button,a,[role="button"],[role="tab"],summary');
    if (!target || target.disabled || target.getAttribute('aria-disabled') === 'true') return;
    const rect = target.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const holder = document.createElement('span');
    const wave = document.createElement('span');
    holder.className = 'sg-flow-ripple-layer';
    wave.className = 'sg-flow-ripple-wave';
    holder.setAttribute('aria-hidden', 'true');
    const modal = target.closest('dialog[open]');
    const relative = modal ? modal.getBoundingClientRect() : { left: 0, top: 0 };
    holder.style.position = modal ? 'absolute' : 'fixed';
    holder.style.left = `${rect.left - relative.left}px`;
    holder.style.top = `${rect.top - relative.top}px`;
    holder.style.width = `${rect.width}px`;
    holder.style.height = `${rect.height}px`;
    holder.style.borderRadius = getComputedStyle(target).borderRadius;
    holder.style.color = getComputedStyle(target).color;
    const size = Math.max(rect.width, rect.height) * 1.5;
    wave.style.width = wave.style.height = `${size}px`;
    wave.style.left = `${event.clientX - rect.left - size / 2}px`;
    wave.style.top = `${event.clientY - rect.top - size / 2}px`;
    holder.append(wave);
    (modal || document.body).append(holder);
    window.setTimeout(() => holder.remove(), 560);
  }, { passive: true });

  // Hide only on mobile while scrolling down; show on scroll up or when a menu is open.
  let lastY = window.scrollY, accumulated = 0, direction = 0, frame = 0;
  function updateHeader() {
    frame = 0;
    const y = window.scrollY;
    const header = document.querySelector('.site-header');
    const menuOpen = document.querySelector('.header-actions.is-open,.drawer-layer,.modal-layer,dialog[open]');
    if (!isFlow() || !mobile.matches || reduced.matches || saving() || y < 120 || menuOpen || (root.classList.contains('sg-flow-keyboard') && header && header.contains(document.activeElement))) {
      root.classList.remove('sg-flow-header-hidden');
      lastY = y; accumulated = 0; direction = 0; return;
    }
    const delta = y - lastY;
    const sign = Math.sign(delta);
    if (sign && sign !== direction) { direction = sign; accumulated = 0; }
    accumulated += delta;
    if (accumulated > 16 && y > 150) { root.classList.add('sg-flow-header-hidden'); accumulated = 0; }
    if (accumulated < -12) { root.classList.remove('sg-flow-header-hidden'); accumulated = 0; }
    lastY = y;
  }
  window.addEventListener('scroll', () => { if (!frame) frame = requestAnimationFrame(updateHeader); }, { passive: true });
  window.addEventListener('resize', updateHeader, { passive: true });
  window.addEventListener('sg-flow-power-change', updateHeader);
  new MutationObserver(() => {
    if (!isFlow()) root.classList.remove('sg-flow-header-hidden', 'sg-flow-lang-in', 'sg-flow-lang-out', 'sg-flow-keyboard');
  }).observe(root, { attributes: true, attributeFilter: ['data-glass'] });

  // Native dialogs handle Escape themselves. The React sheets have explicit close buttons.
  document.addEventListener('keydown', event => {
    if (isFlow() && event.key === 'Tab') root.classList.add('sg-flow-keyboard');
    if (!isFlow() || event.defaultPrevented || event.key !== 'Escape' || document.querySelector('dialog[open]')) return;
    const layers = [...document.querySelectorAll('.drawer-layer,.modal-layer')];
    const layer = layers[layers.length - 1];
    if (!layer) return;
    const button = layer.querySelector('.reset-cancel, .legacy-site-confirm-actions button, .close-button');
    if (button) { event.preventDefault(); button.click(); }
  });
})();
