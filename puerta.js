/* Puerta de entrada de Mi Academia.
   Si el dispositivo no está desbloqueado, cualquier página de la web muestra un «404» y no carga nada más
   (ni la lógica ni la sincronización). Para entrar: toca tres veces seguidas el «0» del 404.
   Cuándo se vuelve a tapar (Ajustes → «Ocultar la web», clave localStorage ma2_puerta):
     sesion (por defecto) = al cerrar la app o la pestaña (sessionStorage ma2_ses);
     15 = tras 15 minutos fuera (ma2_ok_t guarda la última vez que se vio la web);
     nunca = solo con el botón «Ocultar ahora».
   Es una pantalla de despiste para que nadie entre por casualidad: no es una protección real. Lo que sí es
   privado (material, tests de la academia, progreso) está en el repositorio privado y exige tu token. */
(function () {
  var K = 'ma2_ok', KT = 'ma2_ok_t', KM = 'ma2_puerta', KS = 'ma2_ses', LIM = 15 * 60000;
  var es404 = document.documentElement.getAttribute('data-puerta') === '404';
  var modo = 'sesion', ok = false, t = 0, ses = false;
  try {
    modo = localStorage.getItem(KM) || 'sesion'; ok = localStorage.getItem(K) === '1';
    t = +localStorage.getItem(KT) || 0; ses = sessionStorage.getItem(KS) === '1';
  } catch (e) { ok = false; }
  function marca() { try { localStorage.setItem(KT, String(Date.now())); sessionStorage.setItem(KS, '1'); } catch (e) { /* nada */ } }
  var abierto = ok && (modo === 'nunca' || (modo === '15' && (!t || Date.now() - t < LIM)) || (modo === 'sesion' && ses));
  if (abierto && !es404) {
    marca();
    var oculto = 0;
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'hidden') { oculto = Date.now(); marca(); }
      else if (modo === '15' && oculto && Date.now() - oculto > LIM) { try { localStorage.removeItem(K); } catch (e) { /* nada */ } location.reload(); }
    });
    window.addEventListener('pagehide', marca);
    setInterval(marca, 60000);
    return;
  }
  window.__PUERTA = true;
  try { window.stop(); } catch (e) { /* nada */ }
  var css = '*{box-sizing:border-box}html,body{margin:0;min-height:100%}' +
    'body{display:flex;min-height:100vh;align-items:center;justify-content:center;background:#f4f5f7;color:#23272f;' +
    'font:16px/1.55 system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;touch-action:manipulation;-webkit-tap-highlight-color:transparent}' +
    'main{width:100%;max-width:30rem;padding:1.5rem;text-align:center}' +
    '.n{margin:0 0 .4rem;font-size:clamp(5.5rem,26vw,9rem);line-height:1;font-weight:700;letter-spacing:.02em;color:#d5d9e0;user-select:none;-webkit-user-select:none}' +
    '.n span{display:inline-block;padding:0 .03em}' +
    'h1{margin:0 0 .6rem;font-size:1.55rem;font-weight:600}p{margin:0 auto 1.6rem;max-width:26rem;color:#5d6572}' +
    'a.b{display:inline-block;padding:.6rem 1.3rem;border:1px solid #c3c9d3;border-radius:8px;background:#fff;color:#23272f;text-decoration:none;font-size:.95rem;cursor:pointer}' +
    'a.b:hover{background:#eceef2}' +
    'footer{margin-top:2.6rem;font-size:.78rem;color:#8b93a1}' +
    '@media (prefers-color-scheme:dark){body{background:#16181d;color:#e6e8ec}.n{color:#2b3039}p{color:#9aa2b0}' +
    'a.b{background:#1f2229;border-color:#363c47;color:#e6e8ec}a.b:hover{background:#272b33}footer{color:#6f7786}}';
  var ref = Math.random().toString(16).slice(2, 8), host = location.hostname || '';
  var h = document.documentElement;
  h.setAttribute('lang', 'es');
  h.innerHTML = '<head><meta charset="utf-8"><title>404 - Página no encontrada</title><meta name="robots" content="noindex">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1"><style>' + css + '</style></head>' +
    '<body><main><div class="n"><span>4</span><span id="x">0</span><span>4</span></div>' +
    '<h1>Página no encontrada</h1>' +
    '<p>La dirección que has escrito no existe o la página ya no está disponible.</p>' +
    '<a class="b" id="v" role="button" tabindex="0">Volver atrás</a>' +
    '<footer>' + host + ' · Error 404 · Ref. ' + ref + '</footer></main></body>';
  var n = 0, tt = 0;
  document.addEventListener('click', function (e) {
    var id = e.target && e.target.id;
    if (id === 'v') { if (history.length > 1) history.back(); else location.reload(); return; }
    if (id !== 'x') { n = 0; return; }
    var ahora = Date.now(); if (ahora - tt > 1500) n = 0;
    n++; tt = ahora;
    if (n >= 3) {
      try { localStorage.setItem(K, '1'); } catch (er) { return; }
      marca();
      location.replace(es404 ? '/' : location.href);
    }
  });
})();
