'use strict';
/* =====================================================================
   Mi Academia · temporizador de estudio (flotante, en todas las páginas)
   - Estado en localStorage: sigue corriendo al cambiar de página y se comparte entre pestañas.
   - Se calcula con la hora de fin (no cuenta segundos), así no se desfasa.
   - La alarma se genera con Web Audio (sin archivos), por eso funciona sin conexión.
   ===================================================================== */
(() => {
  const K = { st: 'ma2_temp', cfg: 'ma2_temp_cfg', log: 'ma2_temp_log', ui: 'ma2_temp_ui' };
  const PRE = { estudio: [5, 10, 15, 20, 25, 30, 45, 60], descanso: [5, 10, 15] };
  const CFG0 = { estudio: 20, descanso: 5, sonido: 'arpa', vol: 0.7, vibrar: true, notif: false, pantalla: true, auto: false, bucle: true };
  const ST0 = { m: 'estudio', dur: 1200, est: 'parado', fin: 0, rest: 1200, reg: 0, sonado: false, al: 0 };
  const UI0 = { pos: null, oc: false };                         // posición (fracciones de la pantalla) y si está oculto
  const OTRO = { estudio: 'descanso', descanso: 'estudio' };
  const ETQ = { estudio: 'Estudio', descanso: 'Descanso' };

  const leer = (k, def) => { try { const v = JSON.parse(localStorage.getItem(k)); return v && typeof v === 'object' ? Object.assign({}, def, v) : Object.assign({}, def); } catch (e) { return Object.assign({}, def); } };
  const escribe = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* sin espacio o modo privado: sigue funcionando en memoria */ } };
  let st = leer(K.st, ST0), cfg = leer(K.cfg, CFG0), ui = leer(K.ui, UI0);

  const h = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
  const pad = n => String(n).padStart(2, '0');
  const fmt = s => { const hh = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), ss = s % 60; return (hh ? hh + ':' + pad(m) : pad(m)) + ':' + pad(ss); };
  const hoyKey = () => { const d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  const restante = () => st.est === 'corre' ? Math.max(0, Math.ceil((st.fin - Date.now()) / 1000)) : (st.est === 'fin' ? 0 : st.rest);
  const lim = (x, a, b) => Math.min(b, Math.max(a, x));
  const sonando = () => st.al > Date.now();                     // alarma activa (compartida entre pestañas)
  const minTxt = s => { const m = Math.round(s / 60); return m >= 60 ? Math.floor(m / 60) + ' h' + (m % 60 ? ' ' + (m % 60) + ' min' : '') : m + ' min'; };

  /* ---------- registro de tiempo de estudio efectivo (por día, en este dispositivo) ---------- */
  function sumaLog(seg) {
    if (seg <= 0) return;
    const log = leer(K.log, {}), k = hoyKey(); log[k] = (log[k] || 0) + seg;
    Object.keys(log).sort().slice(0, -60).forEach(x => { delete log[x]; });
    escribe(K.log, log);
  }
  const hoySeg = () => leer(K.log, {})[hoyKey()] || 0;
  function cierraRegistro() {                                   // suma lo estudiado en la sesión actual que aún no se haya contado y devuelve esos segundos
    let s = 0;
    if (st.m === 'estudio' && (st.est === 'corre' || st.est === 'pausa')) { s = Math.max(0, st.dur - restante() - st.reg); sumaLog(s); }
    st.reg = 0; return s;
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
  function nota(c, f, t0, dur, vol, d, tipo, ata) {
    const o = c.createOscillator(), g = c.createGain(), a = ata || 0.02;
    o.type = tipo || 'sine'; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(Math.max(vol, 0.0002), t0 + a); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(d || c.destination); o.start(t0); o.stop(t0 + dur + 0.05);
  }
  // nombre, función que programa las notas (contexto, instante, volumen, destino) y duración en segundos de una pasada
  const SONIDOS = {
    arpa: ['Arpa suave', (c, t, v, d) => { [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5].forEach((f, i) => nota(c, f, t + i * 0.3, 1.8, v * 0.5, d)); }, 3.4],
    campana: ['Campana', (c, t, v, d) => { [0, 1.7, 3.4].forEach(x => { nota(c, 880, t + x, 2.4, v * 0.45, d); nota(c, 1760, t + x, 1.5, v * 0.18, d); nota(c, 2217, t + x, 0.9, v * 0.1, d); }); }, 5.9],
    gotas: ['Gotas', (c, t, v, d) => { [0, 1.1, 2.2].forEach(x => { nota(c, 784, t + x, 1.2, v * 0.45, d); nota(c, 988, t + x + 0.28, 1.4, v * 0.45, d); }); }, 3.9],
    campanilla: ['Campanilla', (c, t, v, d) => { [0, 1.7].forEach(x => { nota(c, 659.25, t + x, 1.5, v * 0.5, d); nota(c, 1318.5, t + x, 0.8, v * 0.12, d); nota(c, 523.25, t + x + 0.6, 1.9, v * 0.5, d); nota(c, 1046.5, t + x + 0.6, 1, v * 0.12, d); }); }, 4.2],
    carillon: ['Caja de música', (c, t, v, d) => { [1046.5, 1318.5, 1568, 2093, 1568, 1318.5, 1046.5].forEach((f, i) => nota(c, f, t + i * 0.22, 1, v * 0.4, d, 'triangle')); }, 2.6],
    marimba: ['Marimba', (c, t, v, d) => { [0, 1.4].forEach(x => [659.25, 783.99, 987.77, 1318.5, 987.77, 783.99].forEach((f, i) => { nota(c, f, t + x + i * 0.18, 0.5, v * 0.5, d, 'triangle'); nota(c, f * 4, t + x + i * 0.18, 0.12, v * 0.12, d); })); }, 3.1],
    cuenco: ['Cuenco tibetano', (c, t, v, d) => { [[220, 0.5], [443, 0.28], [662, 0.16], [221.5, 0.4]].forEach(([f, k]) => nota(c, f, t, 5.5, v * k, d, 'sine', 0.35)); }, 5.6],
    acorde: ['Acorde suave', (c, t, v, d) => { [261.63, 329.63, 392, 523.25].forEach((f, i) => nota(c, f, t + i * 0.15, 3.2, v * 0.32, d, 'sine', 0.5)); }, 3.8],
    bips: ['Aviso insistente', (c, t, v, d) => { [0, 0.4, 0.8].forEach(x => { nota(c, 880, t + x, 0.3, v * 0.5, d); nota(c, 1320, t + x, 0.2, v * 0.12, d); }); }, 1.3]
  };
  let alarmaNodo = null;
  function paraSonido() {                                         // silencia al instante lo que esté programado
    if (alarmaNodo) { try { alarmaNodo.gain.cancelScheduledValues(0); alarmaNodo.gain.value = 0; alarmaNodo.disconnect(); } catch (e) { /* nada */ } alarmaNodo = null; }
    if (navigator.vibrate) { try { navigator.vibrate(0); } catch (e) { /* nada */ } }
  }
  function suena(repite) {                                        // repite = programa pasadas durante 3 min, aunque la página vaya en segundo plano
    const c = audio(); if (!c) return false;
    const def = SONIDOS[cfg.sonido] || SONIDOS.arpa;
    paraSonido();
    try {
      const m = c.createGain(); m.connect(c.destination); alarmaNodo = m;
      const v = Math.min(1, Math.max(0.05, +cfg.vol || 0.7)), t0 = c.currentTime + 0.05, paso = def[2] + 1.2, veces = repite ? Math.ceil(180 / paso) : 1;
      for (let i = 0; i < veces; i++) def[1](c, t0 + i * paso, v, m);
      return c.state === 'running';
    } catch (e) { return false; }
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
  let tAl = 0;
  function silencia() { paraSonido(); clearTimeout(tAl); st.al = 0; }   // el que llama guarda el estado
  function pararAlarma() { silencia(); guarda(); sync(); }
  function inicia() {
    silencia(); audio();                                                     // se activa el audio con este toque, para que luego pueda sonar
    if (st.est === 'parado' || st.est === 'fin') { st.rest = st.dur; st.reg = 0; }
    st.est = 'corre'; st.fin = Date.now() + st.rest * 1000; st.sonado = false;
    guarda(); pidePantalla(); sync();
  }
  function pausa() { st.rest = restante(); st.est = 'pausa'; guarda(); sueltaPantalla(); sync(); }
  function reinicia() { silencia(); const s = cierraRegistro(); st.rest = st.dur; st.est = 'parado'; st.sonado = false; guarda(); sueltaPantalla(); sync(); return s; }
  function finaliza() {                                          // «Terminar»: corta la cuenta atrás y deja contado lo estudiado hasta ahora
    const descanso = st.m === 'descanso', s = reinicia();
    msg.textContent = descanso ? 'Descanso terminado.' : s > 0 ? 'Sumados ' + fmt(s) + ' al estudio de hoy.' : 'No había tiempo que contar.';
  }
  function fija(min) { silencia(); cierraRegistro(); cfg[st.m] = min; escribe(K.cfg, cfg); st.dur = min * 60; st.rest = st.dur; st.est = 'parado'; st.sonado = false; guarda(); sueltaPantalla(); sync(); }
  function modo(m) { silencia(); cierraRegistro(); st.m = m; st.dur = (+cfg[m] || CFG0[m]) * 60; st.rest = st.dur; st.est = 'parado'; st.sonado = false; guarda(); sueltaPantalla(); sync(); }
  function mas(min) {
    silencia();
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
    if (ui.oc) setOc(false);                                               // si estaba oculto, se muestra para poder parar la alarma
    if (cfg.auto && st.m === 'estudio' && !tarde) { avisa(false); const m = 'descanso'; st.m = m; st.dur = (+cfg.descanso || 5) * 60; st.rest = st.dur; st.est = 'parado'; guarda(); inicia(); abre(false, '¡Tiempo de estudio cumplido! Empieza el descanso.'); return; }
    if (!tarde) avisa(true);
    sync();
    abre(false, tarde ? 'Terminó hace ' + minTxt((Date.now() - st.fin) / 1000 + 0) + '.' : (st.m === 'estudio' ? '¡Tiempo de estudio cumplido! Toca descansar.' : 'Descanso terminado. ¿Seguimos?'));
  }
  function avisa(repite) {
    const bucle = !!repite && cfg.bucle, ok = suena(bucle);
    if (ok && bucle) { st.al = Date.now() + 180000; guarda(); clearTimeout(tAl); tAl = setTimeout(pararAlarma, 180000); }
    if (cfg.vibrar && navigator.vibrate) { try { navigator.vibrate(bucle ? [300, 150, 300, 150, 500, 1500, 300, 150, 300, 150, 500, 1500, 300, 150, 300, 150, 500, 1500, 300, 150, 300, 150, 500] : [300, 150, 300, 150, 500]); } catch (e) { /* nada */ } }
    if (cfg.notif && 'Notification' in window && Notification.permission === 'granted' && (document.hidden || !ok)) {
      try { new Notification(st.m === 'estudio' ? 'Tiempo de estudio cumplido' : 'Descanso terminado', { body: st.m === 'estudio' ? 'Toca descansar un rato.' : 'Vuelve cuando quieras.', tag: 'ma2-temp' }); } catch (e) { /* nada */ }
    }
  }

  /* ---------- interfaz ---------- */
  const raiz = h('div', 'tmp'), mov = h('div', 'tmp-mov');
  const bOc = h('button', 'tmp-oc'); bOc.type = 'button';
  bOc.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>';
  const pill = h('button', 'tmp-pill'); pill.type = 'button'; pill.setAttribute('aria-expanded', 'false'); pill.setAttribute('aria-controls', 'tmp-panel');
  pill.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M9.5 2.5h5"/></svg>';
  const pillT = h('span', 'tmp-pt'); pill.append(pillT);
  const panel = h('div', 'tmp-panel'); panel.id = 'tmp-panel'; panel.hidden = true; panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', 'Temporizador de estudio');
  mov.append(bOc, pill); raiz.append(panel, mov);

  const cab = h('div', 'tmp-cab'), modos = h('div', 'tmp-modos'), cierra = h('button', 'tmp-x', '×'); cierra.type = 'button'; cierra.setAttribute('aria-label', 'Cerrar temporizador');
  const bm = {}; ['estudio', 'descanso'].forEach(m => { const b = h('button', 'tmp-modo', ETQ[m]); b.type = 'button'; b.addEventListener('click', () => { if (st.m !== m) modo(m); }); bm[m] = b; modos.append(b); });
  cab.append(modos, cierra);

  const reloj = h('div', 'tmp-reloj'), tiempo = h('b', 'tmp-t'), barra = h('div', 'tmp-barra'), barI = h('i'), msg = h('p', 'tmp-msg'); msg.setAttribute('role', 'status'); msg.setAttribute('aria-live', 'polite');
  barra.append(barI); reloj.append(tiempo, barra, msg);
  const bAl = h('button', 'tmp-alarma', 'Parar alarma'); bAl.type = 'button'; bAl.hidden = true; bAl.addEventListener('click', pararAlarma);

  const acc = h('div', 'tmp-acc'), go = h('button', 'tmp-go'), bFin = h('button', 'tmp-sec', 'Terminar'), bRe = h('button', 'tmp-sec', 'Reiniciar'), bMas = h('button', 'tmp-sec', '+5 min');
  [go, bFin, bRe, bMas].forEach(b => { b.type = 'button'; }); bFin.hidden = true; bFin.title = 'Terminar ya y contar el tiempo estudiado'; acc.append(go, bFin, bRe, bMas);
  go.addEventListener('click', () => { if (st.est === 'corre') pausa(); else if (st.est === 'fin') siguiente(); else inicia(); if (st.est === 'corre') msg.textContent = ''; });
  bFin.addEventListener('click', finaliza);
  bRe.addEventListener('click', () => { const s = reinicia(); msg.textContent = s > 0 ? 'Contados ' + fmt(s) + '. Temporizador a cero.' : ''; });
  bMas.addEventListener('click', () => mas(5));

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
  sel.addEventListener('change', () => { cfg.sonido = sel.value; escribe(K.cfg, cfg); audio(); suena(false); });
  const prueba = h('button', 'tmp-sec', 'Probar'); prueba.type = 'button'; prueba.addEventListener('click', () => { if (!suena(false)) msg.textContent = 'Este navegador no deja sonar ahora. Toca Iniciar una vez y vuelve a probar.'; });
  const vol = h('input'); vol.type = 'range'; vol.min = '0.1'; vol.max = '1'; vol.step = '0.1'; vol.setAttribute('aria-label', 'Volumen');
  vol.addEventListener('input', () => { cfg.vol = +vol.value; escribe(K.cfg, cfg); });
  vol.addEventListener('change', () => { audio(); suena(false); });
  const chk = (clave, txt, extra) => { const c = h('input'); c.type = 'checkbox'; c.addEventListener('change', () => { cfg[clave] = c.checked; escribe(K.cfg, cfg); if (extra) extra(c); }); const l = h('label', 'tmp-chk'); l.append(c, h('span', '', txt)); return [l, c]; };
  const [lVib, cVib] = chk('vibrar', 'Vibrar al terminar'); const [lNot, cNot] = chk('notif', 'Avisar con notificación', c => {
    if (c.checked && 'Notification' in window && Notification.permission === 'default') Notification.requestPermission().then(p => { if (p !== 'granted') { cfg.notif = false; c.checked = false; escribe(K.cfg, cfg); } });
    else if (c.checked && Notification.permission === 'denied') { cfg.notif = false; c.checked = false; escribe(K.cfg, cfg); msg.textContent = 'Las notificaciones están bloqueadas en este navegador.'; }
  });
  const [lPan, cPan] = chk('pantalla', 'Mantener la pantalla encendida mientras corre', c => { if (c.checked) { if (st.est === 'corre') pidePantalla(); } else sueltaPantalla(); });
  const [lAut, cAut] = chk('auto', 'Empezar el descanso solo al terminar el estudio');
  const [lBuc, cBuc] = chk('bucle', 'Repetir la alarma hasta que la pare');
  const bEsq = h('button', 'tmp-sec', 'Volver a la esquina'); bEsq.type = 'button'; bEsq.addEventListener('click', () => { ui.pos = null; escribe(K.ui, ui); aplicaPos(); });
  const esqFila = h('div', 'tmp-fila'); esqFila.append(h('span', '', 'Posición'), bEsq);
  const dDe = h('input'); dDe.type = 'number'; dDe.min = '1'; dDe.max = '180'; dDe.inputMode = 'numeric';
  dDe.addEventListener('change', () => { const v = Math.round(+dDe.value); if (v >= 1 && v <= 180) { cfg.descanso = v; escribe(K.cfg, cfg); if (st.m === 'descanso' && st.est === 'parado') { st.dur = v * 60; st.rest = st.dur; guarda(); } sync(); } else dDe.value = cfg.descanso; });
  const sonFila = h('div', 'tmp-fila'); sonFila.append(h('span', '', 'Sonido'), sel, prueba);
  aj.append(ajs, sonFila, lBuc, fila('Volumen', vol), fila('Duración del descanso (min)', dDe), lAut, lVib, lNot, lPan, esqFila);
  if (!navigator.vibrate) lVib.hidden = true;
  if (!('Notification' in window)) lNot.hidden = true;
  if (!('wakeLock' in navigator)) lPan.hidden = true;

  panel.append(cab, reloj, bAl, acc, pre, hoy, aj);

  function pintaChips() {
    chips.replaceChildren();
    const quieto = st.est === 'parado' || st.est === 'fin';
    const lista = PRE[st.m].includes(st.dur / 60) ? PRE[st.m] : PRE[st.m].concat([st.dur / 60]).sort((a, b) => a - b);
    lista.forEach(min => { const b = h('button', 'tmp-chip' + (st.dur === min * 60 ? ' on' : ''), min + ' min'); b.type = 'button'; b.disabled = !quieto; b.setAttribute('aria-pressed', String(st.dur === min * 60)); b.addEventListener('click', () => fija(min)); chips.append(b); });
  }
  let ultimo = '';
  function pinta() {
    const r = restante(), al = sonando(), clave = [st.m, st.est, st.dur, r, cfg.descanso, abierto(), al].join('|');
    pillT.textContent = al ? '¡Tiempo!' : fmt(r);
    raiz.dataset.m = st.m; raiz.dataset.e = st.est; raiz.dataset.al = al ? '1' : '0';
    pill.setAttribute('aria-label', 'Temporizador de ' + ETQ[st.m].toLowerCase() + ': ' + (st.est === 'fin' ? 'terminado' : 'quedan ' + fmt(r)) + (al ? '. Toca para parar la alarma' : '. Abrir'));
    if (al) { document.title = '🔔 ¡Tiempo! · ' + titulo0; tituloPuesto = true; } else if (st.est === 'corre') { document.title = '⏱ ' + fmt(r) + ' · ' + titulo0; tituloPuesto = true; } else if (tituloPuesto) { document.title = titulo0; tituloPuesto = false; }
    if (clave === ultimo) return; ultimo = clave;
    if (!abierto()) return;
    Object.keys(bm).forEach(m => { bm[m].classList.toggle('on', st.m === m); bm[m].setAttribute('aria-pressed', String(st.m === m)); });
    tiempo.textContent = fmt(r); bAl.hidden = !al;
    barI.style.width = (st.dur ? Math.min(100, Math.max(0, (1 - r / st.dur) * 100)) : 0) + '%';
    go.textContent = st.est === 'corre' ? 'Pausar' : st.est === 'pausa' ? 'Reanudar' : st.est === 'fin' ? (st.m === 'estudio' ? 'Descansar ' + (+cfg.descanso || 5) + ' min' : 'Estudiar ' + (+cfg.estudio || 20) + ' min') : 'Iniciar';
    go.classList.toggle('pausa', st.est === 'corre');
    bRe.disabled = st.est === 'parado'; bMas.disabled = false;
    bFin.hidden = !(st.est === 'corre' || st.est === 'pausa');    // solo cuando hay una cuenta en marcha que cortar
    hoy.textContent = 'Hoy: ' + (hoySeg() >= 60 ? minTxt(hoySeg()) : '0 min') + ' de estudio efectivo';
    if (document.activeElement !== dDe) dDe.value = cfg.descanso;
    pintaChips();
  }
  const abierto = () => !panel.hidden;
  function abre(enfoca, texto) {
    panel.hidden = false; pill.setAttribute('aria-expanded', 'true'); ultimo = '';
    if (texto != null) msg.textContent = texto; else if (enfoca) msg.textContent = '';
    cfgUI(); orienta(); pinta(); if (enfoca) (sonando() ? bAl : go).focus();
  }
  function cierraPanel(devuelve) { panel.hidden = true; pill.setAttribute('aria-expanded', 'false'); if (devuelve) pill.focus(); }
  function cfgUI() { sel.value = SONIDOS[cfg.sonido] ? cfg.sonido : 'arpa'; vol.value = cfg.vol; cVib.checked = !!cfg.vibrar; cNot.checked = !!cfg.notif; cPan.checked = !!cfg.pantalla; cAut.checked = !!cfg.auto; cBuc.checked = cfg.bucle !== false; dDe.value = cfg.descanso; }
  pill.addEventListener('click', () => { const sonaba = sonando(); if (sonaba) pararAlarma(); if (abierto() && !sonaba) cierraPanel(false); else abre(true); });
  bOc.addEventListener('click', () => { setOc(!ui.oc); if (ui.oc) cierraPanel(false); });
  cierra.addEventListener('click', () => cierraPanel(true));
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && abierto()) cierraPanel(true); });
  document.addEventListener('pointerdown', e => { if (abierto() && !raiz.contains(e.target)) cierraPanel(false); });

  /* ---------- posición (arrastrable) y ocultar ---------- */
  function orienta() {                                           // el panel se abre hacia el lado con más sitio
    const r = raiz.getBoundingClientRect(), vw = innerWidth, vh = innerHeight;
    const w = Math.min(336, vw - 16), arriba = r.top + r.height / 2 > vh / 2, der = r.left + r.width / 2 > vw / 2;
    panel.style.width = w + 'px'; panel.style.left = lim(der ? r.right - w : r.left, 8, vw - w - 8) + 'px';
    if (arriba) { panel.style.top = 'auto'; panel.style.bottom = (vh - r.top + 8) + 'px'; panel.style.maxHeight = Math.max(160, r.top - 16) + 'px'; }
    else { panel.style.bottom = 'auto'; panel.style.top = (r.bottom + 8) + 'px'; panel.style.maxHeight = Math.max(160, vh - r.bottom - 16) + 'px'; }
  }
  function colocaPx(l, t) {                                      // pone el botón en esa posición (dentro de la pantalla) y devuelve la posición real
    const w = raiz.offsetWidth, hh = raiz.offsetHeight;
    l = lim(l, 0, Math.max(0, innerWidth - w)); t = lim(t, 0, Math.max(0, innerHeight - hh));
    raiz.classList.add('libre'); raiz.style.right = 'auto'; raiz.style.bottom = 'auto'; raiz.style.left = Math.round(l) + 'px'; raiz.style.top = Math.round(t) + 'px';
    return { l, t, w, hh };
  }
  function guardaPos(p) {
    ui.pos = { fx: +(p.l / Math.max(1, innerWidth - p.w)).toFixed(4), fy: +(p.t / Math.max(1, innerHeight - p.hh)).toFixed(4) };
    escribe(K.ui, ui);
  }
  function aplicaPos() {
    if (!ui.pos) { raiz.classList.remove('libre'); ['left', 'top', 'right', 'bottom'].forEach(k => { raiz.style[k] = ''; }); orienta(); return; }
    const w = raiz.offsetWidth, hh = raiz.offsetHeight;
    colocaPx(lim(+ui.pos.fx || 0, 0, 1) * Math.max(0, innerWidth - w), lim(+ui.pos.fy || 0, 0, 1) * Math.max(0, innerHeight - hh));
    orienta();
  }
  function aplicaUi() {
    raiz.dataset.oc = ui.oc ? '1' : '0';
    bOc.setAttribute('aria-label', ui.oc ? 'Mostrar temporizador' : 'Ocultar temporizador'); bOc.title = ui.oc ? 'Mostrar temporizador' : 'Ocultar temporizador';
    aplicaPos();
  }
  function setOc(v) {
    const r = raiz.getBoundingClientRect(), libre = !!ui.pos;
    ui.oc = !!v; escribe(K.ui, ui); aplicaUi();
    if (libre) { const p = colocaPx(r.left, r.top); guardaPos(p); orienta(); }  // la flecha se queda donde estaba
  }
  let arr = null, movido = false;
  mov.addEventListener('pointerdown', e => {
    if (e.button > 0) return;
    const r = raiz.getBoundingClientRect(); arr = { id: e.pointerId, x: e.clientX, y: e.clientY, l: r.left, t: r.top, m: false };
    document.addEventListener('pointermove', mueve); document.addEventListener('pointerup', suelta); document.addEventListener('pointercancel', suelta);
  });
  function mueve(e) {
    if (!arr || e.pointerId !== arr.id) return;
    const dx = e.clientX - arr.x, dy = e.clientY - arr.y;
    if (!arr.m && Math.hypot(dx, dy) < 6) return;
    arr.m = true; raiz.classList.add('arrastrando');
    colocaPx(arr.l + dx, arr.t + dy); orienta();
  }
  function suelta(e) {
    if (!arr || e.pointerId !== arr.id) return;
    document.removeEventListener('pointermove', mueve); document.removeEventListener('pointerup', suelta); document.removeEventListener('pointercancel', suelta);
    const m = arr.m; arr = null; raiz.classList.remove('arrastrando');
    if (m) { const r = raiz.getBoundingClientRect(); guardaPos({ l: r.left, t: r.top, w: r.width, hh: r.height }); movido = true; setTimeout(() => { movido = false; }, 0); }
  }
  mov.addEventListener('click', e => { if (movido) { e.stopPropagation(); e.preventDefault(); } }, true);   // arrastrar no cuenta como pulsar
  mov.addEventListener('keydown', e => {                          // Mayús + flechas también lo mueven (teclado)
    const d = { ArrowLeft: [-24, 0], ArrowRight: [24, 0], ArrowUp: [0, -24], ArrowDown: [0, 24] }[e.key];
    if (!d || !e.shiftKey) return;
    e.preventDefault(); const r = raiz.getBoundingClientRect(), p = colocaPx(r.left + d[0], r.top + d[1]); guardaPos(p); orienta();
  });

  /* ---------- bucle y sincronización ---------- */
  let timer = 0, tituloPuesto = false; const titulo0 = document.title;
  function tick() { if (st.est === 'corre' && restante() === 0) { termina(); return; } if (alarmaNodo && !sonando()) paraSonido(); if (timer && st.est !== 'corre' && !sonando()) { sync(); return; } pinta(); }
  function sync() {                                              // reajusta el bucle al estado actual
    const vivo = st.est === 'corre' || sonando();
    if (vivo && !timer) timer = setInterval(tick, 250);
    if (!vivo && timer) { clearInterval(timer); timer = 0; }
    ultimo = ''; pinta();
  }
  window.addEventListener('storage', e => {
    if (e.key === K.st) { st = leer(K.st, ST0); if (!sonando()) { paraSonido(); clearTimeout(tAl); } if (st.est === 'corre') pidePantalla(); sync(); }
    else if (e.key === K.ui) { ui = leer(K.ui, UI0); aplicaUi(); }
    else if (e.key === K.cfg) { cfg = leer(K.cfg, CFG0); cfgUI(); ultimo = ''; pinta(); }
  });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { if (st.est === 'corre') pidePantalla(); tick(); } });
  function situa() {                                             // por encima de la barra inferior en móvil
    const tb = document.querySelector('.tabbar'), alto = tb && tb.offsetHeight ? tb.offsetHeight : 0;
    raiz.style.setProperty('--tmp-b', alto + 'px');
  }
  window.addEventListener('resize', () => { situa(); aplicaPos(); });

  function arranca() {
    document.body.append(raiz); situa(); cfgUI();
    if (st.est === 'corre') { if (restante() === 0) termina(); else { pidePantalla(); sync(); } } else sync();
    aplicaUi();                                                  // después de pintar el tiempo, para que el ancho sea el definitivo
    setTimeout(situa, 600);                                      // la barra inferior se crea justo después de cargar
  }
  if (document.body) arranca(); else document.addEventListener('DOMContentLoaded', arranca);
  window.MaTemporizador = { abre: () => abre(true) };
})();
