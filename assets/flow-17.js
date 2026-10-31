/* Subtle pointer-directed light, active only in the optional Flow appearance. */
(() => {
  const surfaces = '.resource-card';
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let frame = 0;
  let point = null;
  function updateLight() {
    frame = 0;
    if (!point || document.documentElement.dataset.glass !== 'on' || document.documentElement.dataset.flowPower === 'save' || reduceMotion.matches) return;
    const { surface, x, y } = point;
    if (!surface.isConnected) return;
    const rect = surface.getBoundingClientRect();
    surface.style.setProperty('--flow-x', `${Math.round(x - rect.left)}px`);
    surface.style.setProperty('--flow-y', `${Math.round(y - rect.top)}px`);
  }
  document.addEventListener('pointermove', (event) => {
    if (event.pointerType === 'touch' || document.documentElement.dataset.glass !== 'on' || document.documentElement.dataset.flowPower === 'save' || reduceMotion.matches) return;
    const surface = event.target instanceof Element && event.target.closest(surfaces);
    if (!surface) return;
    point = { surface, x: event.clientX, y: event.clientY };
    if (!frame) frame = requestAnimationFrame(updateLight);
  }, { passive: true });
})();

/* Reveal key sections as they enter view; classic mode and reduced motion stay untouched. */
(() => {
  const root = document.documentElement;
  const query = '.hero-copy, #sg-sched, #sg-dash .section-heading, #resources .section-heading, .resource-card, .video-guide, .site-footer';
  const media = window.matchMedia('(prefers-reduced-motion: reduce)');
  let observer = null;
  let on = false;
  const tracked = new Set();
  let seen = new WeakSet();
  function clear() {
    if (observer) observer.disconnect();
    observer = null;
    document.querySelectorAll('.sg-flow-reveal').forEach(element => element.classList.remove('sg-flow-reveal', 'sg-flow-visible'));
    tracked.clear();
    seen = new WeakSet();
  }
  function watch(element) {
    if (!on || !observer || seen.has(element)) return;
    seen.add(element);
    tracked.add(element);
    element.classList.add('sg-flow-reveal');
    observer.observe(element);
  }
  function scan(node) {
    if (!on || node.nodeType !== 1) return;
    if (node.matches(query)) watch(node);
    node.querySelectorAll(query).forEach(watch);
  }
  function configure() {
    const shouldRun = root.dataset.glass === 'on' && !media.matches && 'IntersectionObserver' in window;
    if (shouldRun === on && (on ? !!observer : true)) return;
    clear();
    on = shouldRun;
    if (!on) return;
    observer = new IntersectionObserver(entries => {
      for (const entry of entries) if (entry.isIntersecting) {
        entry.target.classList.add('sg-flow-visible');
        if (observer) observer.unobserve(entry.target);
        tracked.delete(entry.target);
      }
    }, { threshold: .06, rootMargin: '0px 0px -12px 0px' });
    scan(document.body);
  }
  function start() {
    configure();
    new MutationObserver(records => {
      if (!on) return;
      for (const record of records) {
        for (const node of record.addedNodes) scan(node);
        for (const node of record.removedNodes) {
          if (node.nodeType !== 1) continue;
          for (const element of [node, ...node.querySelectorAll('.sg-flow-reveal')]) {
            if (tracked.delete(element) && observer) observer.unobserve(element);
          }
        }
      }
    }).observe(document.body, { childList: true, subtree: true });
    new MutationObserver(configure).observe(root, { attributes: true, attributeFilter: ['data-glass'] });
    if (media.addEventListener) media.addEventListener('change', configure);
    else if (media.addListener) media.addListener(configure);
  }
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start, { once: true });
})();
