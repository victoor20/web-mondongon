/* Mi Academia · uso sin conexión y velocidad
   Estilos, guiones, fuentes e iconos se sirven desde la copia guardada en el dispositivo, sin
   pedirlos a la red: por eso cambiar de apartado es casi instantáneo. Esa copia se guarda junto
   con el ?v=… de su URL, así que al subir ese número en los HTML llega sola la versión nueva y
   nunca se mezcla una página nueva con estilos viejos.
   Las PÁGINAS sí se piden a la red, con un límite de 1,2 s, para que al publicar algo nuevo se vea
   a la primera; si la red tarda más o no hay, se usa la copia.
   Los tests y lo que no esté en la lista siguen pidiéndose primero a la red.
   Sube VERSION cuando cambie la lista PRECACHE: así se borran las copias antiguas. */
const VERSION = 'v10';
const NUCLEO = 'ma-nucleo-' + VERSION;
const DINAMICO = 'ma-dinamico';
const ESPERA_PAGINA = 1200;
const PRECACHE = ['./', 'index.html', 'temario.html', 'tests.html', 'biblioteca.html', 'ajustes.html', 'test.html', 'nuevo.html', 'editar.html', 'visor.html',
  'app.js', 'vistas.js', 'biblioteca.js', 'temporizador.js', 'style.css', 'temario.json',
  'manifest.webmanifest', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png',
  'fonts/literata.woff2', 'fonts/literata-italic.woff2', 'fonts/bricolage.woff2',
  'vendor/pdfjs3/pdf.min.js', 'vendor/pdfjs3/pdf.worker.min.js'];

// la copia se guarda por ruta, sin parámetros (?t=…, ?v=…), para que test.html?t=x use la misma copia
const clave = u => new Request(u.origin + u.pathname);
let RUTAS = null;
const rutas = () => RUTAS || (RUTAS = new Set(PRECACHE.map(r => new URL(r, self.registration.scope).pathname)));
const esNucleo = url => rutas().has(url.pathname);

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(NUCLEO);
    await Promise.all(PRECACHE.map(async ruta => {
      try {
        const u = new URL(ruta, self.registration.scope);
        const r = await fetch(u.href, { cache: 'reload' });
        if (r.ok) await c.put(clave(u), r);
      } catch (err) { /* sin red durante la instalación: se completará al visitar */ }
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k.startsWith('ma-nucleo-') && k !== NUCLEO) await caches.delete(k);
    try {                                                        // quita del caché dinámico lo que ahora sirve el núcleo
      const d = await caches.open(DINAMICO);
      for (const req of await d.keys()) { try { if (esNucleo(new URL(req.url))) await d.delete(req); } catch (err) { /* nada */ } }
    } catch (err) { /* nada */ }
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || url.pathname.endsWith('/sw.js')) return;   // GitHub y demás: directo a la red
  e.respondWith(esNucleo(url) ? nucleo(e, req, url) : dinamico(req, url));
});

const sinCopia = () => new Response('Sin conexión y sin copia guardada de este archivo.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });

// NÚCLEO. Páginas: la red con un límite corto. Lo demás (estilos, guiones, fuentes, iconos): la copia, al instante.
async function nucleo(e, req, url) {
  const c = await caches.open(NUCLEO), k = clave(url);
  if (req.mode !== 'navigate') {
    // se guarda con su ?v=…: si la página pide una versión distinta a la copiada, se va a la red y no se mezclan versiones
    const kv = new Request(url.href), guardada = await c.match(kv);
    if (guardada) return guardada;
    try { const r = await fetch(url.href, { cache: 'no-cache' }); if (r.ok) await c.put(kv, r.clone()); return r; }
    catch (err) { return (await c.match(k)) || sinCopia(); }      // sin red: lo que haya de la instalación
  }
  const guardada = await c.match(k);
  const red = fetch(url.href, { cache: 'no-cache' }).then(r => { if (r.ok) c.put(k, r.clone()); return r.ok || !guardada ? r : guardada; });
  if (!guardada) { try { return await red; } catch (err) { return sinCopia(); } }
  e.waitUntil(red.catch(() => { /* sin red: nos quedamos con la copia */ }));
  return Promise.race([red.catch(() => guardada), new Promise(res => setTimeout(() => res(guardada), ESPERA_PAGINA))]);
}

// RESTO (tests y demás): primero la red; si tarda más de 3 s o no hay, se usa la copia
async function dinamico(req, url) {
  const k = clave(url), guardada = await caches.match(k);
  const red = fetch(url.href, { cache: 'no-cache' }).then(async r => {
    if (r.ok) { const c = await caches.open(DINAMICO); await c.put(k, r.clone()); }
    return (r.ok || r.status === 404 || !guardada) ? r : guardada;
  });
  if (!guardada) {
    try { return await red; }
    catch (err) {
      if (req.mode === 'navigate') { const inicio = await caches.match(new Request(url.origin + '/index.html')); if (inicio) return inicio; }
      return sinCopia();
    }
  }
  return Promise.race([red.catch(() => guardada), new Promise(res => setTimeout(() => res(guardada), 3000))]);
}
