/* Generated after each production build. The installed app caches its shell for offline use. */
const CACHE_NAME = "studyguide-offline-v7.33.0-r6";
const APP_SHELL = [
  "./",
  "./index.html",
  "./assets/fonts/font-0.woff2",
  "./assets/fonts/font-1.woff2",
  "./assets/fonts/font-2.woff2",
  "./assets/fonts/font-3.woff2",
  "./assets/fonts/font-4.woff2",
  "./assets/fonts/font-5.woff2",
  "./assets/fonts/font-6.woff2",
  "./assets/fonts/font-7.woff2",
  "./assets/fonts/font-8.woff2",
  "./assets/fonts/fonts.css",
  "./assets/index-Hk2Vn6Tz.js",
  "./assets/index-Pw4Rm8Ve.css",
  "./assets/flow-17.css",
  "./assets/flow-17.js",
  "./assets/flow-notifications.js",
  "./assets/flow-interactions.js",
  "./assets/flow-stack.js",
  "./assets/flow-battery.js",
  "./assets/media/flow-mountains-day.svg",
  "./assets/media/flow-mountains-night.svg",
  "./assets/media/certificate.mp4",
  "./assets/media/eschool-palestine-logo_b284864e.jpg",
  "./assets/media/microsoft-teams-user-logo_717daa58.png",
  "./assets/media/studyguide-hero_5ee5b91d.png",
  "./assets/media/studyguide-mobile-illustration_11483182.png",
  "./assets/media/studyguide-official-logo_fc6acc46.png",
  "./assets/media/studyguide-study-illustration_e23fb0fc.png",
  "./assets/fonts/Amiri-Regular.ttf",
  "./assets/fonts/Amiri-Bold.ttf",
  "./manifest.json",
  "./admin.js"
];
const OPTIONAL_SHELL = ["./assets/fonts/Amiri-Regular.ttf", "./assets/fonts/Amiri-Bold.ttf"];
const APP_SHELL_URL = new URL("./", self.location).href;

/* Auto-update setting: the page tells the worker, and the worker keeps it in its own cache (default: on). */
const SETTINGS_CACHE = "studyguide-settings";
const SETTINGS_URL = new URL("./__sg-auto-update", self.location).href;
const isAutoUpdate = async () => {
  try {
    const hit = await (await caches.open(SETTINGS_CACHE)).match(SETTINGS_URL);
    return hit ? (await hit.text()) !== "off" : true;
  } catch { return true; }
};
const saveAutoUpdate = async (on) => {
  try { await (await caches.open(SETTINGS_CACHE)).put(SETTINGS_URL, new Response(on ? "on" : "off")); } catch { /* ignore */ }
};

const cacheResponse = async (request, response) => {
  if (!response || (!response.ok && response.type !== "opaque")) return response;
  const cache = await caches.open(CACHE_NAME);
  cache.put(request, response.clone());
  return response;
};

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const auto = await isAutoUpdate();
    /* Auto-update off and an older version already runs: refuse to install; retried once the user turns it on. */
    if (!auto && self.registration.active) throw new Error("auto-update disabled");
    const cache = await caches.open(CACHE_NAME);
    /* cache:"reload" يتجاوز كاش المتصفح حتى يُحمَّل الإصدار الجديد فعلاً */
    await cache.addAll(APP_SHELL.map((u) => new Request(u, { cache: "reload" })));
    /* ملفات اختيارية (خط Amiri): تُخزَّن إن وُجدت، ولا يفشل التثبيت إن لم توجد */
    await Promise.all(OPTIONAL_SHELL.map((u) => cache.add(new Request(u, { cache: "reload" })).catch(() => {})));
    if (auto) self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith("studyguide-offline-") && key !== CACHE_NAME).map((key) => caches.delete(key)))));
  self.clients.claim();
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
  if (event.data?.type === "SET_AUTO_UPDATE") event.waitUntil(saveAutoUpdate(event.data.value !== false));
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  if (request.mode === "navigate") {
    event.respondWith((async () => {
      const cachedShell = () => caches.match(APP_SHELL_URL).then((cached) => cached || caches.match("./index.html"));
      if (!(await isAutoUpdate())) { const c = await cachedShell(); if (c) return c; }
      try { return await cacheResponse(APP_SHELL_URL, await fetch(request)); } catch { return cachedShell(); }
    })());
    return;
  }

  if (url.origin !== self.location.origin) return;

  if (url.pathname.endsWith("/admin.js")) {
    event.respondWith((async () => {
      if (!(await isAutoUpdate())) { const c = await caches.match(request); if (c) return c; }
      try { return await cacheResponse(request, await fetch(request)); } catch { return caches.match(request); }
    })());
    return;
  }

  /* ملفات الموقع (JS/CSS/HTML/JSON): الشبكة أولاً، فيصل أي تحديث تلقائياً بدون رفع رقم الكاش أو تحديث قوي. الكاش للعمل بدون إنترنت. */
  const isCode = /\.(js|css|html|json)$/i.test(url.pathname) || url.pathname.endsWith("/");
  if (isCode) {
    event.respondWith((async () => {
      if (!(await isAutoUpdate())) { const c = await caches.match(request); if (c) return c; }
      try { return await cacheResponse(request, await fetch(request, { cache: "no-cache" })); }
      catch { return (await caches.match(request)) || Response.error(); }
    })());
    return;
  }

  /* الخطوط والصور والفيديو: الكاش أولاً (لا تتغير غالباً) */
  event.respondWith(caches.match(request).then((cached) => cached || fetch(request).then((response) => cacheResponse(request, response)).catch(() => cached)));
});
