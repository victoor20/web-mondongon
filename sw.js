/* Mi Academia · uso sin conexión
   La web y los tests se piden SIEMPRE primero a la red (así ves la última versión) y, si no hay
   conexión o va muy lenta, se sirve la copia guardada en el dispositivo.
   Sube el número de VERSION cuando cambie la lista de archivos de PRECACHE. */
const VERSION = 'v7';
const NUCLEO = 'ma-nucleo-' + VERSION;
const DINAMICO = 'ma-dinamico';
const PRECACHE = ['./', 'index.html', 'temario.html', 'tests.html', 'biblioteca.html', 'ajustes.html', 'test.html', 'nuevo.html', 'editar.html', 'visor.html',
  'app.js', 'vistas.js', 'biblioteca.js', 'temporizador.js', 'style.css', 'temario.json',
  'manifest.webmanifest', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png',
  'fonts/literata.woff2', 'fonts/literata-italic.woff2', 'fonts/bricolage.woff2',
  'vendor/pdfjs3/pdf.min.js', 'vendor/pdfjs3/pdf.worker.min.js'];

// la copia se guarda por ruta, sin parámetros (?t=…, ?v=…), para que test.html?t=x use la misma copia
const clave = u => new Request(u.origin + u.pathname);

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
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || url.pathname.endsWith('/sw.js')) return;   // GitHub y demás: directo a la red
  e.respondWith(responder(req, url));
});

async function responder(req, url) {
  const k = clave(url);
  const fijo = /\.(woff2|png)$/.test(url.pathname);
  const guardada = await caches.match(k);
  if (fijo && guardada) return guardada;                         // fuentes e iconos: primero la copia

  const red = fetch(url.href, { cache: 'no-cache' }).then(async r => {
    if (r.ok) { const c = await caches.open(DINAMICO); await c.put(k, r.clone()); }
    return (r.ok || r.status === 404 || !guardada) ? r : guardada;
  });
  if (!guardada) {
    try { return await red; }
    catch (err) {
      if (req.mode === 'navigate') { const inicio = await caches.match(new Request(url.origin + '/index.html')); if (inicio) return inicio; }
      return new Response('Sin conexión y sin copia guardada de este archivo.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    }
  }
  // hay copia: se espera a la red como mucho 3 segundos; si no llega, se usa la copia
  return Promise.race([red.catch(() => guardada), new Promise(res => setTimeout(() => res(guardada), 3000))]);
}
