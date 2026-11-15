/* Puerta de entrada de Mi Academia.
   En un dispositivo que no se ha desbloqueado, cualquier página de la web muestra un «404 Not Found» y no
   carga nada más (ni la lógica ni la sincronización). Para entrar: toca tres veces seguidas el «0» del 404.
   Eso se recuerda en este dispositivo (localStorage ma2_ok); en Ajustes → «Ocultar la web» se vuelve a cerrar.
   Es una pantalla de despiste para que nadie entre por casualidad: no es una protección real. Lo que sí es
   privado (material, tests de la academia, progreso) está en el repositorio privado y exige tu token. */
(function () {
  var K = 'ma2_ok', abierto = false, es404 = document.documentElement.getAttribute('data-puerta') === '404';
  try { abierto = localStorage.getItem(K) === '1'; } catch (e) { abierto = false; }
  if (abierto && !es404) return;
  window.__PUERTA = true;
  try { window.stop(); } catch (e) { /* nada */ }
  var css = 'html,body{margin:0;height:100%}body{display:flex;align-items:center;justify-content:center;background:#fff;color:#2b2b2b;' +
    'font:16px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;touch-action:manipulation;-webkit-tap-highlight-color:transparent}' +
    'main{text-align:center;padding:1rem}h1{margin:0;font-size:4.5rem;font-weight:500;letter-spacing:.04em;user-select:none;-webkit-user-select:none}' +
    'h1 span{display:inline-block;padding:0 .06em}p{margin:.2rem 0 0;font-size:1.15rem}small{display:block;margin-top:.9rem;color:#777;font-size:.9rem}';
  var h = document.documentElement;
  h.innerHTML = '<head><meta charset="utf-8"><title>404 Not Found</title><meta name="robots" content="noindex">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1"><style>' + css + '</style></head>' +
    '<body><main><h1><span>4</span><span id="x">0</span><span>4</span></h1><p>Not Found</p>' +
    '<small>The requested URL was not found on this server.</small></main></body>';
  var n = 0, t = 0;
  document.addEventListener('click', function (e) {
    if (!(e.target && e.target.id === 'x')) { n = 0; return; }
    var ahora = Date.now(); if (ahora - t > 1500) n = 0;
    n++; t = ahora;
    if (n >= 3) {
      try { localStorage.setItem(K, '1'); } catch (er) { return; }
      location.replace(es404 ? '/' : location.href);
    }
  });
})();
