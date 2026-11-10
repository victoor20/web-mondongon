'use strict';
/* =====================================================================
   Mi Academia · temporizador de estudio (flotante, en todas las páginas)
   - Estado en localStorage: sigue corriendo al cambiar de página y se comparte entre pestañas.
   - Se calcula con la hora de fin (no cuenta segundos), así no se desfasa.
   - La alarma se genera con Web Audio (sin archivos), por eso funciona sin conexión.
   ===================================================================== */
(() => {
  const K = { st: 'ma2_temp', cfg: 'ma2_temp_cfg', log: 'ma2_temp_log' };
  const PRE = { estudio: [5, 10, 15, 20, 25, 30, 45, 60], descanso: [5, 10, 15] };
  const CFG0 = { estudio: 20, descanso: 5, sonido: 'arpa', vol: 0.7, vibrar: true, notif: false, pantalla: true, auto: false };
  const ST0 = { m: 'estudio', dur: 1200, est: 'parado', fin: 0, rest: 1200, reg: 0, sonado: false };
  const OTRO = { estudio: 'descanso', descanso: 'estudio' };
  const ETQ = { estudio: 'Estudio', descanso: 'Descanso' };

  const leer = (k, def) => { try { const v = JSON.parse(localStorage.getItem(k)); return v && typeof v === 'object' ? Object.assign({}, def, v) : Object.assign({}, def); } catch (e) { return Object.assign({}, def); } };
  const escribe = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* sin espacio o modo privado: sigue funcionando en memoria */ } };
  let st = leer(K.st, ST0), cfg = leer(K.cfg, CFG0);

  const h = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
  const pad = n => String(n).padStart(2, '0');
  const fmt = s => { const hh = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), ss = s % 60; return (hh ? hh + ':' + pad(m) : pad(m)) + ':' + pad(ss); };
  const hoyKey = () => { const d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  const restante = () => st.est === 'corre' ? Math.max(0, Math.ceil((st.fin - Date.now()) / 1000)) : (st.est === 'fin' ? 0 : st.rest);
  const minTxt = s => { const m = Math.round(s / 60); return m >= 60 ? Math.floor(m / 60) + ' h' + (m % 60 ? ' ' + (m % 60) + ' min' : '') : m + ' min'; };

  /* ---------- registro de tiempo de estudio efectivo (por día, en este dispositivo) ---------- */
  function sumaLog(seg) {
    if (seg <= 0) return;
    const log = leer(K.log, {}), k = hoyKey(); log[k] = (log[k] || 0) + seg;
    Object.keys(log).sort().slice(0, -60).forEach(x => { delete log[x]; });
    escribe(K.log, log);
  }
  const hoySeg = () => leer(K.log, {})[hoyKey()] || 0;
  function cierraRegistro() {                                   // suma lo estudiado en la sesión actual que aún no se haya contado
    if (st.m === 'estudio' && (st.est === 'corre' || st.est === 'pausa')) sumaLog(Math.max(0, st.dur - restante() - st.reg));
    st.reg = 0;
  }

  /* ---------- sonido ---------- */
  let ctx = null;
  function audio() {
    try {
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
      if (!ctx) ctx = new AC();
      if (ctx.state === 'suspended') ctx.resume();
      return ctx;
    } catch (e) { return null; }
  }
  function nota(c, f, t0, dur, vol) {
    const o = c.createOscillator(), g = c.createGain();
    o.type = 'sine'; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(Math.max(vol, 0.0002), t0 + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(c.destination); o.start(t0); o.stop(t0 + dur + 0.05);
  }
  const SONIDOS = {
    arpa: ['Arpa suave', (c, t, v) => { [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5].forEach((f, i) => nota(c, f, t + i * 0.3, 1.8, v * 0.5)); }],
    campana: ['Campana', (c, t, v) => { [0, 1.7, 3.4].forEach(d => { nota(c, 880, t + d, 2.4, v * 0.45); nota(c, 1760, t + d, 1.5, v * 0.18); nota(c, 2217, t + d, 0.9, v * 0.1); }); }],
    gotas: ['Gotas', (c, t, v) => { [0, 1.1, 2.2].forEach(d => { nota(c, 784, t + d, 1.2, v * 0.45); nota(c, 988, t + d + 0.28, 1.4, v * 0.45); }); }]
  };
  function suena() {
    const c = audio(); if (!c) return false;
    const def = SONIDOS[cfg.sonido] || SONIDOS.arpa;
    try { def[1](c, c.currentTime + 0.05, Math.min(1, Math.max(0.05, +cfg.vol || 0.7))); return c.state === 'running'; } catch (e) { return false; }
  }

  /* ---------- pantalla encendida mientras corre ---------- */
  let wl = null;
  async function pidePantalla() {
    if (!cfg.pantalla || !('wakeLock' in navigator) || wl || document.hidden) return;
    try { wl = await navigator.wakeLock.request('screen'); wl.addEventListener('release', () => { wl = null; }); } catch (e) { wl = null; }
  }
  function sueltaPantalla() { if (wl) { try { wl.release(); } catch (e) { /* nada */ } wl = null; } }

  /* ---------- acciones ---------- */
  function guarda() { escribe(K.st, st); }
  function inicia() {
    audio();                                                     // se activa el audio con este toque, para que luego pueda sonar
    if (st.est === 'parado' || st.est === 'fin') { st.rest = st.dur; st.reg = 0; }
    st.est = 'corre'; st.fin = Date.now() + st.rest * 1000; st.sonado = false;
    guarda(); pidePantalla(); sync();
  }
  function pausa() { st.rest = restante(); st.est = 'pausa'; guarda(); sueltaPantalla(); sync(); }
  function reinicia() { cierraRegistro(); st.rest = st.dur; st.est = 'parado'; st.sonado = false; guarda(); sueltaPantalla(); sync(); }
  function fija(min) { cierraRegistro(); cfg[st.m] = min; escribe(K.cfg, cfg); st.dur = min * 60; st.rest = st.dur; st.est = 'parado'; st.sonado = false; guarda(); sueltaPantalla(); sync(); }
  function modo(m) { cierraRegistro(); st.m = m; st.dur = (+cfg[m] || CFG0[m]) * 60; st.rest = st.dur; st.est = 'parado'; st.sonado = false; guarda(); sueltaPantalla(); sync(); }
  function mas(min) {
    if (st.est === 'fin') { st.dur = min * 60; st.rest = st.dur; st.est = 'parado'; guarda(); inicia(); return; }   // «+5 min» tras terminar: cinco minutos más
    st.dur += min * 60;
    if (st.est === 'corre') st.fin += min * 60000; else st.rest += min * 60;
    guarda(); sync();
  }
  function siguiente() { modo(OTRO[st.m]); inicia(); }

  function termina() {
    const s = leer(K.st, ST0);
    if (s.est === 'fin' || s.est !== 'corre') { st = s; sync(); return; }   // otra pestaña ya lo ha cerrado
    st = s; const tarde = Date.now() - st.fin > 10000;                      // si la página estaba cerrada, se muestra pero no suena
    if (st.m === 'estudio') sumaLog(Math.max(0, st.dur - st.reg));
    st.reg = 0; st.est = 'fin'; st.rest = 0; st.sonado = true; guarda(); sueltaPantalla();
    if (cfg.auto && st.m === 'estudio' && !tarde) { avisa(); const m = 'descanso'; st.m = m; st.dur = (+cfg.descanso || 5) * 60; st.rest = st.dur; st.est = 'parado'; guarda(); inicia(); abre(false, '¡Tiempo de estudio cumplido! Empieza el descanso.'); return; }
    sync();
    if (!tarde) avisa();
    abre(false, tarde ? 'Terminó hace ' + minTxt((Date.now() - st.fin) / 1000 + 0) + '.' : (st.m === 'estudio' ? '¡Tiempo de estudio cumplido! Toca descansar.' : 'Descanso terminado. ¿Seguimos?'));
  }
  function avisa() {
    const ok = suena();
    if (cfg.vibrar && navigator.vibrate) { try { navigator.vibrate([300, 150, 300, 150, 500]); } catch (e) { /* nada */ } }
    if (cfg.notif && 'Notification' in window && Notification.permission === 'granted' && (document.hidden || !ok)) {
      try { new Notification(st.m === 'estudio' ? 'Tiempo de estudio cumplido' : 'Descanso terminado', { body: st.m === 'estudio' ? 'Toca descansar un rato.' : 'Vuelve cuando quieras.', tag: 'ma2-temp' }); } catch (e) { /* nada */ }
    }
  }

  /* ---------- interfaz ---------- */
  const raiz = h('div', 'tmp');
  const pill = h('button', 'tmp-pill'); pill.type = 'button'; pill.setAttribute('aria-expanded', 'false'); pill.setAttribute('aria-controls', 'tmp-panel');
  pill.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M9.5 2.5h5"/></svg>';
  const pillT = h('span', 'tmp-pt'); pill.append(pillT);
  const panel = h('div', 'tmp-panel'); panel.id = 'tmp-panel'; panel.hidden = true; panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', 'Temporizador de estudio');
  raiz.append(panel, pill);

  const cab = h('div', 'tmp-cab'), modos = h('div', 'tmp-modos'), cierra = h('button', 'tmp-x', '×'); cierra.type = 'button'; cierra.setAttribute('aria-label', 'Cerrar temporizador');
  const bm = {}; ['estudio', 'descanso'].forEach(m => { const b = h('button', 'tmp-modo', ETQ[m]); b.type = 'button'; b.addEventListener('click', () => { if (st.m !== m) modo(m); }); bm[m] = b; modos.append(b); });
  cab.append(modos, cierra);

  const reloj = h('div', 'tmp-reloj'), tiempo = h('b', 'tmp-t'), barra = h('div', 'tmp-barra'), barI = h('i'), msg = h('p', 'tmp-msg'); msg.setAttribute('role', 'status'); msg.setAttribute('aria-live', 'polite');
  barra.append(barI); reloj.append(tiempo, barra, msg);

  const acc = h('div', 'tmp-acc'), go = h('button', 'tmp-go'), bRe = h('button', 'tmp-sec', 'Reiniciar'), bMas = h('button', 'tmp-sec', '+5 min');
  [go, bRe, bMas].forEach(b => { b.type = 'button'; }); acc.append(go, bRe, bMas);
  go.addEventListener('click', () => { if (st.est === 'corre') pausa(); else if (st.est === 'fin') siguiente(); else inicia(); if (st.est === 'corre') msg.textContent = ''; });
  bRe.addEventListener('click', reinicia); bMas.addEventListener('click', () => mas(5));

  const pre = h('div', 'tmp-pre'), chips = h('div', 'tmp-chips'), otro = h('form', 'tmp-otro');
  const inp = h('input'); inp.type = 'number'; inp.min = '1'; inp.max = '180'; inp.inputMode = 'numeric'; inp.placeholder = 'Otro'; inp.setAttribute('aria-label', 'Otro tiempo en minutos');
  const bPon = h('button', 'tmp-sec', 'Poner'); bPon.type = 'submit';
  otro.append(inp, h('span', '', 'min'), bPon);
  otro.addEventListener('submit', e => { e.preventDefault(); const v = Math.round(+inp.value); if (v >= 1 && v <= 180) { fija(v); inp.value = ''; } else msg.textContent = 'Escribe entre 1 y 180 minutos.'; });
  pre.append(chips, otro);

  const hoy = h('p', 'tmp-hoy');

  const aj = h('details', 'tmp-aj'), ajs = h('summary', '', 'Ajustes');
  const fila = (txt, ctl) => { const l = h('label', 'tmp-fila'); l.append(h('span', '', txt), ctl); return l; };
  const sel = h('select'); Object.keys(SONIDOS).forEach(k => { const o = h('option', '', SONIDOS[k][0]); o.value = k; sel.append(o); });
  sel.addEventListener('change', () => { cfg.sonido = sel.value; escribe(K.cfg, cfg); audio(); suena(); });
  const prueba = h('button', 'tmp-sec', 'Probar'); prueba.type = 'button'; prueba.addEventListener('click', () => { if (!suena()) msg.textContent = 'Este navegador no deja sonar ahora. Toca Iniciar una vez y vuelve a probar.'; });
  const vol = h('input'); vol.type = 'range'; vol.min = '0.1'; vol.max = '1'; vol.step = '0.1'; vol.setAttribute('aria-label', 'Volumen');
  vol.addEventListener('input', () => { cfg.vol = +vol.value; escribe(K.cfg, cfg); });
  vol.addEventListener('change', () => { audio(); suena(); });
  const chk = (clave, txt, extra) => { const c = h('input'); c.type = 'checkbox'; c.addEventListener('change', () => { cfg[clave] = c.checked; escribe(K.cfg, cfg); if (extra) extra(c); }); const l = h('label', 'tmp-chk'); l.append(c, h('span', '', txt)); return [l, c]; };
  const [lVib, cVib] = chk('vibrar', 'Vibrar al terminar'); const [lNot, cNot] = chk('notif', 'Avisar con notificación', c => {
    if (c.checked && 'Notification' in window && Notification.permission === 'default') Notification.requestPermission().then(p => { if (p !== 'granted') { cfg.notif = false; c.checked = false; escribe(K.cfg, cfg); } });
    else if (c.checked && Notification.permission === 'denied') { cfg.notif = false; c.checked = false; escribe(K.cfg, cfg); msg.textContent = 'Las notificaciones están bloqueadas en este navegador.'; }
  });
  const [lPan, cPan] = chk('pantalla', 'Mantener la pantalla encendida mientras corre', c => { if (c.checked) { if (st.est === 'corre') pidePantalla(); } else sueltaPantalla(); });
  const [lAut, cAut] = chk('auto', 'Empezar el descanso solo al terminar el estudio');
  const dDe = h('input'); dDe.type = 'number'; dDe.min = '1'; dDe.max = '180'; dDe.inputMode = 'numeric';
  dDe.addEventListener('change', () => { const v = Math.round(+dDe.value); if (v >= 1 && v <= 180) { cfg.descanso = v; escribe(K.cfg, cfg); if (st.m === 'descanso' && st.est === 'parado') { st.dur = v * 60; st.rest = st.dur; guarda(); } sync(); } else dDe.value = cfg.descanso; });
  const sonFila = h('div', 'tmp-fila'); sonFila.append(h('span', '', 'Sonido'), sel, prueba);
  aj.append(ajs, sonFila, fila('Volumen', vol), fila('Duración del descanso (min)', dDe), lAut, lVib, lNot, lPan);
  if (!navigator.vibrate) lVib.hidden = true;
  if (!('Notification' in window)) lNot.hidden = true;
  if (!('wakeLock' in navigator)) lPan.hidden = true;

  panel.append(cab, reloj, acc, pre, hoy, aj);

  function pintaChips() {
    chips.replaceChildren();
    const quieto = st.est === 'parado' || st.est === 'fin';
    const lista = PRE[st.m].includes(st.dur / 60) ? PRE[st.m] : PRE[st.m].concat([st.dur / 60]).sort((a, b) => a - b);
    lista.forEach(min => { const b = h('button', 'tmp-chip' + (st.dur === min * 60 ? ' on' : ''), min + ' min'); b.type = 'button'; b.disabled = !quieto; b.setAttribute('aria-pressed', String(st.dur === min * 60)); b.addEventListener('click', () => fija(min)); chips.append(b); });
  }
  let ultimo = '';
  function pinta() {
    const r = restante(), clave = [st.m, st.est, st.dur, r, cfg.descanso, abierto()].join('|');
    pillT.textContent = fmt(r);
    raiz.dataset.m = st.m; raiz.dataset.e = st.est;
    pill.setAttribute('aria-label', 'Temporizador de ' + ETQ[st.m].toLowerCase() + ': ' + (st.est === 'fin' ? 'terminado' : 'quedan ' + fmt(r)) + '. Abrir');
    if (st.est === 'corre') { document.title = '⏱ ' + fmt(r) + ' · ' + titulo0; tituloPuesto = true; } else if (tituloPuesto) { document.title = titulo0; tituloPuesto = false; }
    if (clave === ultimo) return; ultimo = clave;
    if (!abierto()) return;
    Object.keys(bm).forEach(m => { bm[m].classList.toggle('on', st.m === m); bm[m].setAttribute('aria-pressed', String(st.m === m)); });
    tiempo.textContent = fmt(r);
    barI.style.width = (st.dur ? Math.min(100, Math.max(0, (1 - r / st.dur) * 100)) : 0) + '%';
    go.textContent = st.est === 'corre' ? 'Pausar' : st.est === 'pausa' ? 'Reanudar' : st.est === 'fin' ? (st.m === 'estudio' ? 'Descansar ' + (+cfg.descanso || 5) + ' min' : 'Estudiar ' + (+cfg.estudio || 20) + ' min') : 'Iniciar';
    go.classList.toggle('pausa', st.est === 'corre');
    bRe.disabled = st.est === 'parado'; bMas.disabled = false;
    hoy.textContent = 'Hoy: ' + (hoySeg() >= 60 ? minTxt(hoySeg()) : '0 min') + ' de estudio efectivo';
    if (document.activeElement !== dDe) dDe.value = cfg.descanso;
    pintaChips();
  }
  const abierto = () => !panel.hidden;
  function abre(enfoca, texto) {
    panel.hidden = false; pill.setAttribute('aria-expanded', 'true'); ultimo = '';
    if (texto != null) msg.textContent = texto; else if (enfoca) msg.textContent = '';
    cfgUI(); pinta(); if (enfoca) go.focus();
  }
  function cierraPanel(devuelve) { panel.hidden = true; pill.setAttribute('aria-expanded', 'false'); if (devuelve) pill.focus(); }
  function cfgUI() { sel.value = SONIDOS[cfg.sonido] ? cfg.sonido : 'arpa'; vol.value = cfg.vol; cVib.checked = !!cfg.vibrar; cNot.checked = !!cfg.notif; cPan.checked = !!cfg.pantalla; cAut.checked = !!cfg.auto; dDe.value = cfg.descanso; }
  pill.addEventListener('click', () => { if (abierto()) cierraPanel(false); else abre(true); });
  cierra.addEventListener('click', () => cierraPanel(true));
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && abierto()) cierraPanel(true); });
  document.addEventListener('pointerdown', e => { if (abierto() && !raiz.contains(e.target)) cierraPanel(false); });

  /* ---------- bucle y sincronización ---------- */
  let timer = 0, tituloPuesto = false; const titulo0 = document.title;
  function tick() { if (st.est === 'corre' && restante() === 0) { termina(); return; } pinta(); }
  function sync() {                                              // reajusta el bucle al estado actual
    if (st.est === 'corre' && !timer) timer = setInterval(tick, 250);
    if (st.est !== 'corre' && timer) { clearInterval(timer); timer = 0; }
    ultimo = ''; pinta();
  }
  window.addEventListener('storage', e => {
    if (e.key === K.st) { st = leer(K.st, ST0); if (st.est === 'corre') pidePantalla(); sync(); }
    else if (e.key === K.cfg) { cfg = leer(K.cfg, CFG0); cfgUI(); ultimo = ''; pinta(); }
  });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { if (st.est === 'corre') pidePantalla(); tick(); } });
  function situa() {                                             // por encima de la barra inferior en móvil
    const tb = document.querySelector('.tabbar'), alto = tb && tb.offsetHeight ? tb.offsetHeight : 0;
    raiz.style.setProperty('--tmp-b', alto + 'px');
  }
  window.addEventListener('resize', situa);

  function arranca() {
    document.body.append(raiz); situa(); cfgUI();
    if (st.est === 'corre') { if (restante() === 0) termina(); else { pidePantalla(); sync(); } } else sync();
    setTimeout(situa, 600);                                      // la barra inferior se crea justo después de cargar
  }
  if (document.body) arranca(); else document.addEventListener('DOMContentLoaded', arranca);
  window.MaTemporizador = { abre: () => abre(true) };
})();
