'use strict';
/* =====================================================================
   Mi Academia · lógica compartida (portada, test y alta de tests)
   ===================================================================== */

// ---- CONFIGURACIÓN (cambia solo si renombras el repo) ----------------
const CFG = {
  user: 'victoor20', repo: 'web-mondongon', dir: 'tests',
  datos: { repo: 'mondongon-datos', path: 'progreso.json' },   // repositorio PRIVADO donde se sincroniza tu progreso
  fuenteAntigua: 'ChatGPT'                                       // origen que se asume en los tests que no lo indican
};
const FUENTES = ['ChatGPT', 'Claude', 'Gemini', 'Propio', 'Academia'];
// ----------------------------------------------------------------------

const LS = { hist: 'ma2_historial', err: 'ma2_errores', list: 'ma2_lista', dud: 'ma2_dudosas', notas: 'ma2_notas', prefs: 'ma2_prefs', bloc: 'ma2_bloc', curso: 'ma2_curso:', cursoT: 'ma2_cursos_t', bloc2: 'ma2_bloc2', sync: 'ma2_sync' };
const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

const $ = id => document.getElementById(id);
function el(tag, cls, txt) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (txt !== undefined) e.textContent = txt;
  return e;
}
function jget(store, key, def) {
  try { const v = JSON.parse(store.getItem(key)); return v === null ? def : v; } catch (e) { return def; }
}
function jset(store, key, val) { try { store.setItem(key, JSON.stringify(val)); } catch (e) { /* sin espacio o bloqueado */ } }

function fmtTime(s) {
  const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), r = s % 60;
  return (h ? String(h).padStart(2, '0') + ':' : '') + String(m).padStart(2, '0') + ':' + String(r).padStart(2, '0');
}
const MES3 = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
function fmtDay(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || '');
  return m ? { d: String(+m[3]), m: MES3[+m[2] - 1] } : null;
}
function fmtDate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || '');
  return m ? `${m[3]}/${m[2]}/${m[1]}` : '';
}
function hash(str) {
  let h = 5381;
  for (const c of str) h = ((h << 5) + h + c.codePointAt(0)) >>> 0;
  return h.toString(36);
}
// identifica una pregunta por test + texto (sobrevive a reordenar el JSON)
const qkey = (testId, text) => testId + '#' + hash(text);

function randInt(max) {
  if (window.crypto && crypto.getRandomValues) {
    const a = new Uint32Array(1), lim = Math.floor(4294967296 / max) * max;
    do { crypto.getRandomValues(a); } while (a[0] >= lim);
    return a[0] % max;
  }
  return Math.floor(Math.random() * max);
}
function shuffle(items) {
  const v = [...items];
  for (let i = v.length - 1; i > 0; i--) { const j = randInt(i + 1); [v[i], v[j]] = [v[j], v[i]]; }
  return v;
}

/* ---------- validación del formato de test ---------- */
function validateTest(d, temaIds) {
  const errors = [], warnings = [];
  if (!d || typeof d !== 'object' || Array.isArray(d)) return { errors: ['El contenido debe ser un objeto JSON { ... }.'], warnings };
  const known = temaIds && temaIds.size ? temaIds : null;
  if (!d.titulo || typeof d.titulo !== 'string') errors.push('Falta "titulo".');
  if (!d.tema) warnings.push('Falta "tema" (código del temario, p. ej. I-1).');
  else if (known && !known.has(d.tema)) warnings.push(`"tema" «${d.tema}» no es un código del temario (p. ej. I-1, III-3, VI-5).`);
  if (d.fuente !== undefined && typeof d.fuente !== 'string') errors.push('"fuente" debe ser un texto (p. ej. "ChatGPT").');
  if (!d.fecha) warnings.push('Falta "fecha" (AAAA-MM-DD).');
  else if (!/^\d{4}-\d{2}-\d{2}$/.test(d.fecha)) errors.push('"fecha" debe tener formato AAAA-MM-DD.');
  if (!Array.isArray(d.preguntas) || !d.preguntas.length) {
    errors.push('"preguntas" debe ser una lista con al menos 1 pregunta.');
    return { errors, warnings };
  }
  d.preguntas.forEach((p, i) => {
    const n = i + 1;
    if (!p || typeof p.q !== 'string' || !p.q.trim()) { errors.push(`Pregunta ${n}: falta "q" (el enunciado).`); return; }
    if (!Array.isArray(p.opciones) || p.opciones.length < 2 || p.opciones.some(o => typeof o !== 'string' || !o.trim())) {
      errors.push(`Pregunta ${n}: "opciones" debe tener al menos 2 textos no vacíos.`); return;
    }
    if (p.opciones.length !== 4) warnings.push(`Pregunta ${n}: tiene ${p.opciones.length} opciones (lo habitual son 4).`);
    if (p.tema && known && !known.has(p.tema)) warnings.push(`Pregunta ${n}: "tema" «${p.tema}» no es un código del temario.`);
    if (!Number.isInteger(p.correcta) || p.correcta < 0 || p.correcta >= p.opciones.length)
      errors.push(`Pregunta ${n}: "correcta" debe ser un número entre 0 y ${p.opciones.length - 1} (0 = primera opción).`);
    if (p.opciones.some(o => /^\s*[A-Da-d][\)\.]\s/.test(o)))
      warnings.push(`Pregunta ${n}: alguna opción empieza por "A)", "B)"… Quita las letras, la web las pone sola.`);
    if (new Set(p.opciones.map(o => o.trim().toLowerCase())).size !== p.opciones.length)
      warnings.push(`Pregunta ${n}: hay opciones repetidas.`);
  });
  return { errors, warnings };
}

function normalizeTest(id, d) {
  return d.preguntas.map(p => ({
    key: qkey(id, p.q), testId: id, testTitulo: d.titulo, tema: p.tema || d.tema || 'General',
    ref: p.ref || '', q: p.q, opciones: p.opciones, correcta: p.correcta, explicacion: p.explicacion || ''
  }));
}

/* ---------- temario oficial (temario.json) ---------- */
let _temario = { bloques: [], byId: {} }, _temarioLoaded = false;
const BLOQUE_RE = /^(I|II|III|IV|V|VI)-\d+$/;
const bloqueOf = temaId => (BLOQUE_RE.test(temaId || '') ? temaId.split('-')[0] : null);
async function loadTemario() {
  if (_temarioLoaded) return _temario;
  try {
    const r = await fetch('temario.json', { cache: 'no-cache' });
    if (!r.ok) throw new Error(r.status);
    const d = await r.json();
    _temario = { bloques: d.bloques || [], byId: {} };
    _temario.bloques.forEach(b => b.temas.forEach(t => { _temario.byId[t.id] = t; }));
  } catch (e) { _temario = { bloques: [], byId: {} }; }
  _temarioLoaded = true;
  return _temario;
}
const temaIdSet = () => new Set(Object.keys(_temario.byId));
// Código visible: «I-1» (así se guarda) se muestra como «BI-T1» = Bloque I, Tema 1
const codigoTema = id => String(id || '').replace(/^([IVX]+)-(\d+)$/, 'B$1-T$2');
function temaLabel(id) {
  const t = _temario.byId[id];
  return t ? `${codigoTema(id)}: ${t.corto}` : (id || 'General');
}
const bloqueInfo = id => _temario.bloques.find(b => b.id === id) || null;

/* ---------- listado de tests (API de GitHub) y carga ---------- */
async function listFiles() {
  const cached = jget(sessionStorage, LS.list, null);
  if (cached && Date.now() - cached.t < 120000) return cached.files;
  try {
    const r = await fetch(`https://api.github.com/repos/${CFG.user}/${CFG.repo}/contents/${CFG.dir}`);
    if (!r.ok) throw new Error('API ' + r.status);
    const files = (await r.json()).filter(f => f.type === 'file').map(f => f.name);
    jset(sessionStorage, LS.list, { t: Date.now(), files });
    jset(localStorage, LS.list, files);
    return files;
  } catch (e) {
    const last = jget(localStorage, LS.list, null);   // límite de la API o sin red: usa la última lista conocida
    if (last) return last;
    throw e;
  }
}
const baseName = n => n.replace(/\.(json|html)$/i, '');
function dateFromName(base) {
  const m = /^(\d{4}-\d{2}-\d{2})[_-]/.exec(base);
  return m ? m[1] : '';
}
function prettyFromName(base) {
  const t = base.replace(/^\d{4}-\d{2}-\d{2}[_-]/, '').replace(/^test[_-]/i, '').replace(/[_-]+/g, ' ').trim();
  return t.charAt(0).toUpperCase() + t.slice(1);
}

// Devuelve { items, invalid }. items: {id, kind:'json'|'html', titulo, tema, fecha, n, url}
async function loadCatalog() {
  await loadTemario();
  const files = await listFiles();
  const jsons = files.filter(n => /\.json$/i.test(n));
  const jsonBases = new Set(jsons.map(baseName));
  const legacy = files.filter(n => /\.html$/i.test(n) && !jsonBases.has(baseName(n)));
  const invalid = [];
  const loaded = await Promise.all(jsons.map(async n => {
    const id = baseName(n);
    try {
      const r = await fetch(`${CFG.dir}/${encodeURIComponent(n)}`, { cache: 'no-cache' });
      if (!r.ok) return null;                       // subido pero aún no publicado por Pages
      const d = await r.json();
      const v = validateTest(d);
      if (v.errors.length) { invalid.push(n); return null; }
      const temas = {};                                   // tema -> nº de preguntas (admite temas por pregunta)
      d.preguntas.forEach(p => { const t = p.tema || d.tema || 'General'; temas[t] = (temas[t] || 0) + 1; });
      const tema = d.tema || Object.keys(temas).sort((a, b) => temas[b] - temas[a])[0];
      return { id, kind: 'json', titulo: d.titulo, tema, temas, fuente: (d.fuente || '').trim() || CFG.fuenteAntigua, fecha: d.fecha || dateFromName(id), n: d.preguntas.length, url: `test.html?t=${encodeURIComponent(id)}` };
    } catch (e) { invalid.push(n); return null; }
  }));
  const old = legacy.map(n => ({ id: baseName(n), kind: 'html', titulo: prettyFromName(baseName(n)), tema: 'Sin clasificar', temas: {}, fuente: 'Sin origen', fecha: dateFromName(baseName(n)), n: null, url: `${CFG.dir}/${encodeURIComponent(n)}` }));
  const items = [...loaded.filter(Boolean), ...old]
    .sort((a, b) => (b.fecha || '').localeCompare(a.fecha || '') || b.id.localeCompare(a.id));
  return { items, invalid };
}

async function loadRawTest(id) {
  const r = await fetch(`${CFG.dir}/${encodeURIComponent(id)}.json`, { cache: 'no-cache' });
  if (!r.ok) throw new Error(`No se encuentra el test "${id}".`);
  return r.json();
}
async function loadTestData(id) {
  const d = await loadRawTest(id);
  const v = validateTest(d);
  if (v.errors.length) throw new Error(`El test "${id}" tiene errores: ${v.errors[0]}`);
  return { data: d, preguntas: normalizeTest(id, d) };
}

/* ---------- GitHub: token y acceso a archivos ---------- */
const GH_KEY = 'ma2_gh_token';
const getToken = () => { try { return localStorage.getItem(GH_KEY) || ''; } catch (e) { return ''; } };
const ghHeaders = () => ({ 'Accept': 'application/vnd.github+json', 'Authorization': 'Bearer ' + getToken(), 'X-GitHub-Api-Version': '2022-11-28' });
const ghFileUrl = (repo, path) => `https://api.github.com/repos/${CFG.user}/${repo}/contents/${path.split('/').map(encodeURIComponent).join('/')}`;
function b64utf8(s) { let bin = ''; new TextEncoder().encode(s).forEach(b => { bin += String.fromCharCode(b); }); return btoa(bin); }
function fromB64utf8(b) { const bin = atob(b.replace(/\s/g, '')); return new TextDecoder().decode(Uint8Array.from(bin, c => c.charCodeAt(0))); }
function ghError(status) {
  if (status === 401) return 'GitHub rechaza el token. Puede haber caducado o estar mal copiado. Créalo de nuevo y guárdalo en «Añadir test».';
  if (status === 403) return 'El token no tiene permiso de escritura. Revisa que tenga «Contents: Read and write» y que incluya el repositorio.';
  if (status === 404) return 'No encuentro el repositorio o el token no tiene acceso a él.';
  if (status === 409 || status === 422) return 'GitHub no ha aceptado el cambio por un conflicto. Inténtalo de nuevo en unos segundos.';
  return `GitHub ha devuelto un error (${status}).`;
}

/* ---------- aspecto: claro, oscuro o el del sistema ---------- */
const META_TEMA = { claro: '#F2F4F8', oscuro: '#0E131E' };
function applyTema(t) {
  if (typeof document === 'undefined') return;
  const r = document.documentElement;
  if (t === 'claro' || t === 'oscuro') r.dataset.tema = t; else delete r.dataset.tema;
  document.querySelectorAll('meta[name=theme-color]').forEach(m => {
    if (!m.dataset.orig) m.dataset.orig = m.content;
    m.content = META_TEMA[t] || m.dataset.orig;
  });
}
const ICONOS_TEMA = {
  sistema: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>',
  claro: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  oscuro: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>'
};
function mountThemeControl(box) {
  if (!box) return;
  const actual = getPrefs().tema || 'sistema';
  box.className = 'ctl'; box.setAttribute('role', 'group'); box.setAttribute('aria-label', 'Aspecto de la web');
  box.replaceChildren();
  [['sistema', 'Como el sistema'], ['claro', 'Claro'], ['oscuro', 'Oscuro']].forEach(([v, txt]) => {
    const b = el('button'); b.type = 'button'; b.title = txt; b.setAttribute('aria-label', txt); b.setAttribute('aria-pressed', String(v === actual));
    b.insertAdjacentHTML('beforeend', `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONOS_TEMA[v]}</svg>`);   // iconos fijos, no vienen de datos
    b.addEventListener('click', () => { setPref('tema', v); applyTema(v); [...box.children].forEach(c => c.setAttribute('aria-pressed', String(c === b))); });
    box.append(b);
  });
}

/* Botón de refresco: sincroniza, renueva la copia sin conexión (si ya la guardaste) y recarga. No se pone en pantalla de test. */
let _refrescando = false;
async function refrescarTodo(btn) {
  if (_refrescando) return; _refrescando = true;
  btn.classList.add('gira'); btn.disabled = true;
  try {
    if (navigator.onLine !== false) {
      if (getToken()) await conTiempo(syncNow(), 5000);
      if (offInfo().t) { const { items } = await loadCatalog(); await guardarOffline(items); }
    }
  } catch (e) { /* si algo falla, igualmente se recarga */ }
  location.reload();
}

/* ---------- progreso guardado en este navegador ----------
   Cada dato lleva una marca de tiempo (t) para poder fusionarlo con otros dispositivos.
   Lo borrado queda como «tumba» ({del:true,t}) para que el borrado también se sincronice. */
const nowT = () => Date.now();
const getHist = () => jget(localStorage, LS.hist, []);
function addHist(entry) { const h = getHist(); h.unshift(entry); jset(localStorage, LS.hist, h.slice(0, 1000)); }
const vivos = raw => { const o = {}; Object.entries(raw || {}).forEach(([k, v]) => { if (v && !v.del) o[k] = v; }); return o; };
const getErr = () => vivos(jget(localStorage, LS.err, {}));      // errores: preguntas falladas
const getDud = () => vivos(jget(localStorage, LS.dud, {}));      // dudas: preguntas con estrella
function bankSet(store, key, entry) { const raw = jget(localStorage, store, {}); raw[key] = { ...entry, t: nowT() }; jset(localStorage, store, raw); scheduleSync(); }
function bankDel(store, key) {
  const raw = jget(localStorage, store, {});
  if (raw[key] && !raw[key].del) { raw[key] = { del: true, t: nowT() }; jset(localStorage, store, raw); scheduleSync(); }
}
function notasRaw() {                                              // admite el formato antiguo (texto suelto)
  const raw = jget(localStorage, LS.notas, {}), o = {};
  Object.entries(raw).forEach(([k, v]) => { o[k] = typeof v === 'string' ? { x: v, t: 0 } : v; });
  return o;
}
const getNotas = () => { const o = {}; Object.entries(notasRaw()).forEach(([k, v]) => { if (v && v.x && v.x.trim()) o[k] = v.x; }); return o; };
function setNota(key, text) { const raw = notasRaw(); raw[key] = { x: text || '', t: nowT() }; jset(localStorage, LS.notas, raw); scheduleSync(); }
const getPrefs = () => jget(localStorage, LS.prefs, {});             // preferencias de ESTE dispositivo (no se sincronizan)
function setPref(k, v) { const p = getPrefs(); p[k] = v; jset(localStorage, LS.prefs, p); }
function blocRaw() {
  const v = jget(localStorage, LS.bloc2, null);
  if (v) return v;
  let old = ''; try { old = localStorage.getItem(LS.bloc) || ''; } catch (e) { /* nada */ }
  return { x: old, t: 0 };
}
const getBloc = () => blocRaw().x;
function setBloc(t) { jset(localStorage, LS.bloc2, { x: t, t: nowT() }); scheduleSync(); }

function statsFor(id) {                                              // resultados de un test concreto
  const h = getHist().filter(x => x.id === id);
  if (!h.length) return null;
  const ult = h.slice().sort((a, b) => b.date.localeCompare(a.date))[0];
  return { intentos: h.length, ultimo: ult, ultimoPct: Math.round(ult.right / ult.total * 100), mejor: Math.max(...h.map(x => x.right / x.total)) };
}
// Por tema: acierto RECIENTE (últimos 3 intentos, refleja lo que sabes ahora) y datos de uso
function temaStats() {
  const h = getHist().slice().sort((a, b) => a.date.localeCompare(b.date)), por = {}, out = {};
  h.forEach(e => Object.entries(e.byTema || {}).forEach(([t, v]) => { (por[t] = por[t] || []).push({ date: e.date, r: v.r, t: v.t }); }));
  Object.entries(por).forEach(([t, arr]) => {
    const rec = arr.slice(-3);
    out[t] = { intentos: arr.length, ultima: arr[arr.length - 1].date,
      reciente: { r: rec.reduce((a, x) => a + x.r, 0), t: rec.reduce((a, x) => a + x.t, 0) },
      total: { r: arr.reduce((a, x) => a + x.r, 0), t: arr.reduce((a, x) => a + x.t, 0) } };
  });
  return out;
}
function haceTexto(iso) {
  if (!iso) return '';
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 864e5);
  if (d <= 0) return 'hoy';
  if (d === 1) return 'ayer';
  if (d < 14) return `hace ${d} días`;
  if (d < 60) return `hace ${Math.round(d / 7)} semanas`;
  return `hace ${Math.round(d / 30)} meses`;
}

/* ---------- sincronización entre dispositivos ----------
   Guarda tu progreso, errores, dudas y notas en un repositorio PRIVADO (CFG.datos) usando tu token.
   Fusiona sin perder nada: gana siempre el cambio más reciente de cada elemento. */
const SYNC_VER = 1;
const canon = v => JSON.stringify(v, (k, x) => (x && typeof x === 'object' && !Array.isArray(x)) ? Object.fromEntries(Object.keys(x).sort().map(key => [key, x[key]])) : x);
/* tests sin terminar: se sincronizan como el resto (clave = parte «?t=…» de la dirección) */
const cursoKeys = () => Object.keys(localStorage).filter(k => k.startsWith(LS.curso));
function cursosRaw() {
  const o = { ...jget(localStorage, LS.cursoT, {}) };
  cursoKeys().forEach(k => {
    const s = jget(localStorage, k, null); if (!s || !Array.isArray(s.exam)) return;
    const t = s.t || s.savedAt || 0, q = k.slice(LS.curso.length);
    if (!o[q] || (o[q].t || 0) < t) o[q] = { ...s, t };
  });
  return o;
}
function cursoSet(key, state) { jset(localStorage, key, { ...state, t: nowT() }); }
function cursoDel(key) {
  try { localStorage.removeItem(key); } catch (e) { /* nada */ }
  const m = jget(localStorage, LS.cursoT, {}); m[key.slice(LS.curso.length)] = { del: true, t: nowT() }; jset(localStorage, LS.cursoT, m);
  scheduleSync();
}
let _thr = null;
function scheduleSyncSoon(ms) { if (!getToken() || _thr) return; _thr = setTimeout(() => { _thr = null; syncNow(); }, ms || 30000); }
function snapshot() { return { v: SYNC_VER, hist: getHist(), err: jget(localStorage, LS.err, {}), dud: jget(localStorage, LS.dud, {}), notas: notasRaw(), bloc: blocRaw(), cursos: cursosRaw() }; }
function mergeMap(a, b) {
  const out = {}, limite = Date.now() - 90 * 864e5;
  new Set([...Object.keys(a || {}), ...Object.keys(b || {})]).forEach(k => {
    const x = a && a[k], y = b && b[k];
    const w = x && y ? ((y.t || 0) > (x.t || 0) ? y : x) : (x || y);
    if (w.del && (w.t || 0) < limite) return;                  // las tumbas de más de 90 días se limpian
    out[k] = w;
  });
  return out;
}
function mergeSnap(a, b) {
  b = b || {};
  const vistos = new Set(), hist = [];
  [...(a.hist || []), ...(b.hist || [])].forEach(e => { const k = e.date + '|' + e.id; if (!vistos.has(k)) { vistos.add(k); hist.push(e); } });
  hist.sort((x, y) => (y.date || '').localeCompare(x.date || ''));
  const ba = a.bloc || { x: '', t: 0 }, bb = b.bloc || { x: '', t: 0 };
  return { v: SYNC_VER, hist: hist.slice(0, 1000), err: mergeMap(a.err, b.err), dud: mergeMap(a.dud, b.dud), notas: mergeMap(a.notas, b.notas), cursos: mergeMap(a.cursos, b.cursos), bloc: (bb.t || 0) > (ba.t || 0) ? bb : ba };
}
function applySnap(s) {
  jset(localStorage, LS.hist, s.hist); jset(localStorage, LS.err, s.err); jset(localStorage, LS.dud, s.dud);
  jset(localStorage, LS.notas, s.notas); jset(localStorage, LS.bloc2, s.bloc);
  const tumbas = {};
  Object.entries(s.cursos || {}).forEach(([q, v]) => {
    const k = LS.curso + q;
    if (v.del) { tumbas[q] = v; try { localStorage.removeItem(k); } catch (e) { /* nada */ } }
    else jset(localStorage, k, v);
  });
  jset(localStorage, LS.cursoT, tumbas);
}
// estado: off (sin token) | ok | sin-repo (falta el repositorio de datos o el token no llega a él) | token | permiso | error
const syncInfo = { estado: 'off', t: jget(localStorage, LS.sync, {}).t || 0 };
let _syncing = null, _syncTimer = null;
function setSync(estado) { syncInfo.estado = estado; if (estado === 'ok') { syncInfo.t = nowT(); jset(localStorage, LS.sync, { t: syncInfo.t }); } return { ok: estado === 'ok', estado }; }
function syncNow() {
  if (_syncing) return _syncing;
  _syncing = (async () => {
    if (!getToken()) return setSync('off');
    const url = ghFileUrl(CFG.datos.repo, CFG.datos.path);
    try {
      for (let i = 0; i < 3; i++) {
        const g = await fetch(url, { headers: ghHeaders(), cache: 'no-store' });
        let remote = null, sha;
        if (g.status === 200) { const j = await g.json(); sha = j.sha; try { remote = JSON.parse(fromB64utf8(j.content)); } catch (e) { remote = null; } }
        else if (g.status === 404) {                               // ¿no existe el archivo o no existe/no se ve el repositorio?
          const rr = await fetch(`https://api.github.com/repos/${CFG.user}/${CFG.datos.repo}`, { headers: ghHeaders() });
          if (rr.status === 401) return setSync('token');
          if (rr.status !== 200) return setSync('sin-repo');
        } else if (g.status === 401) return setSync('token');
        else if (g.status === 403) return setSync('permiso');
        else return setSync('error');
        const local = snapshot(), merged = mergeSnap(local, remote);
        const cambioLocal = canon(merged) !== canon(local);
        if (cambioLocal) applySnap(merged);
        if (remote && canon(merged) === canon(remote)) { const r = setSync('ok'); r.cambioLocal = cambioLocal; return r; }
        const body = { message: 'Sincronizar progreso', content: b64utf8(JSON.stringify(merged)) };
        if (sha) body.sha = sha;
        const p = await fetch(url, { method: 'PUT', headers: { ...ghHeaders(), 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        if (p.ok) { const r = setSync('ok'); r.cambioLocal = cambioLocal; return r; }
        if (p.status === 409 || p.status === 422) continue;        // otro dispositivo escribió a la vez: se reintenta
        return setSync(p.status === 403 ? 'permiso' : p.status === 404 ? 'sin-repo' : 'error');
      }
      return setSync('error');
    } catch (e) { return setSync('error'); }
  })().finally(() => { _syncing = null; });
  return _syncing;
}
function scheduleSync() {                                          // tras editar notas, errores o dudas: sube los cambios en unos segundos
  if (!getToken()) return;
  clearTimeout(_syncTimer); _syncTimer = setTimeout(() => { syncNow(); }, 8000);
}
const conTiempo = (p, ms) => Promise.race([p, new Promise(r => setTimeout(() => r({ ok: false, estado: 'tiempo' }), ms))]);

// Tras editar un test: conserva en ESTE dispositivo las notas, errores y dudas de las preguntas que siguen existiendo.
// oldQs: [{key}] del test antes de editar. newQs: [{orig (índice en oldQs o -1), key, tema}] después.
function migrarTrasEditar(oldQs, newQs) {
  const mapa = new Map(); newQs.forEach(n => { if (n.orig >= 0) mapa.set(oldQs[n.orig].key, n); });
  [LS.err, LS.dud].forEach(store => {
    const raw = jget(localStorage, store, {});
    oldQs.forEach(o => {
      const e = raw[o.key]; if (!e || e.del) return;
      const n = mapa.get(o.key);
      if (!n) { raw[o.key] = { del: true, t: nowT() }; return; }
      if (n.key !== o.key) { raw[n.key] = { ...e, tema: n.tema, t: nowT() }; raw[o.key] = { del: true, t: nowT() }; }
      else if (e.tema !== n.tema) raw[o.key] = { ...e, tema: n.tema, t: nowT() };
    });
    jset(localStorage, store, raw);
  });
  const notas = notasRaw();
  oldQs.forEach(o => {
    const e = notas[o.key]; if (!e || !e.x) return;
    const n = mapa.get(o.key);
    if (n && n.key === o.key) return;
    notas[o.key] = { x: '', t: nowT() };
    if (n) notas[n.key] = { x: e.x, t: nowT() };
  });
  jset(localStorage, LS.notas, notas);
  scheduleSync();
}

function exportProgress() {
  const data = { version: 4, historial: getHist(), errores: jget(localStorage, LS.err, {}), dudosas: jget(localStorage, LS.dud, {}), notas: notasRaw(), bloc: blocRaw() };
  const blob = new Blob([JSON.stringify(data, null, 1)], { type: 'application/json' });
  const a = el('a'); a.href = URL.createObjectURL(blob);
  a.download = `mi-academia-progreso-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
function importProgress(file, done) {
  const fr = new FileReader();
  fr.onload = () => {
    try {
      const d = JSON.parse(fr.result);
      if (!Array.isArray(d.historial) || typeof d.errores !== 'object') throw new Error('formato');
      jset(localStorage, LS.hist, d.historial);
      jset(localStorage, LS.err, d.errores);
      if (d.dudosas && typeof d.dudosas === 'object') jset(localStorage, LS.dud, d.dudosas);
      if (d.notas && typeof d.notas === 'object') jset(localStorage, LS.notas, d.notas);
      if (typeof d.bloc === 'string') jset(localStorage, LS.bloc2, { x: d.bloc, t: nowT() });
      else if (d.bloc && typeof d.bloc === 'object') jset(localStorage, LS.bloc2, d.bloc);
      done(true);
    } catch (e) { done(false); }
  };
  fr.readAsText(file);
}

/* ---------- importar el documento Markdown que genera ChatGPT ----------
   Entiende: «# TEST NN — TÍTULO», «**Bloque I:**», «**Tema N:**», «**Fecha:**»,
   preguntas «**N. texto**» + «A) … D)», tabla «| N | LETRA | art |» y
   explicaciones «**N. Respuesta X — Artículo Y.** texto». */
const MESES = { enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6, julio: 7, agosto: 8, septiembre: 9, setiembre: 9, octubre: 10, noviembre: 11, diciembre: 12 };
function parseFechaES(s) {
  s = (s || '').trim().toLowerCase();
  let m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (m) return s;
  m = /^(\d{1,2})\s+de\s+([a-záéíóú]+)\s+de(?:l)?\s+(\d{4})$/.exec(s);
  if (m && MESES[m[2]]) return `${m[3]}-${String(MESES[m[2]]).padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  m = /^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/.exec(s);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  return '';
}
const MINI = new Set(['de', 'del', 'la', 'las', 'el', 'los', 'y', 'e', 'en', 'a', 'al', 'o', 'u']);
function niceTitle(raw) {
  // «TEST 04 — CONSTITUCIÓN ESPAÑOLA (ARTÍCULOS 1–30)» -> «Test 04 · Constitución Española (artículos 1–30)»
  const m = /^TEST\s*(\d+)\s*[—–-]\s*(.+)$/i.exec(raw.trim());
  const num = m ? m[1] : '', rest = m ? m[2] : raw.trim();
  let t = rest;
  if (rest === rest.toLocaleUpperCase('es')) {            // todo en mayúsculas: pasar a formato título
    let inParen = false, first = true;
    t = rest.toLocaleLowerCase('es').split(' ').map(w => {
      if (w.startsWith('(')) inParen = true;
      let out = w;
      if (!inParen && (first || !MINI.has(w))) out = w.charAt(0).toLocaleUpperCase('es') + w.slice(1);
      if (w.endsWith(')')) inParen = false;
      first = false;
      return out;
    }).join(' ');
  }
  return num ? `Test ${num}: ${t}` : t;
}

function parseMarkdownTest(md) {
  // Acepta el Markdown original (# y **) y también el texto copiado desde el chat, que pierde esas marcas.
  const errors = [], warnings = [];
  const lines = md.replace(/^﻿/, '').replace(/\r\n?/g, '\n').split('\n');
  const HEAD = /^(PREGUNTAS|SOLUCIONARIO(?: Y EXPLICACIONES)?|EXPLICACI[ÓO]N(?:ES)?(?: DE CADA RESPUESTA)?|RESULTADO|REGISTRO DE ERRORES|REFERENCIA NORMATIVA)\s*:?$/i;
  const ART = /^(Art[íi]culos?\s+\d+(?:\.\d+)*(?:\.[a-z])?(?:\s*[–-]\s*\d+)?(?:\s*(?:y|e|,)\s*\d+(?:\.\d+)*(?:\.[a-z])?)*)\.?\s*(.*)$/i;
  let titulo = '', fecha = '', bloque = '', tn = '', declared = null;
  const qs = [], sol = {}, exp = {};
  let section = 'meta', cur = null, lastExp = null, m;

  for (const rawLine of lines) {
    const raw = rawLine.trim();
    const plain = raw.replace(/\*\*/g, '').replace(/^#{1,6}\s*/, '').trim();
    if (!plain) continue;

    if ((m = HEAD.exec(plain))) {                                   // cambio de sección
      const name = m[1].toUpperCase();
      if (name.startsWith('PREGUNTAS')) section = 'q';
      else if (/^(SOLUCIONARIO|EXPLICACI)/.test(name)) section = 'sol';
      else section = 'skip';
      cur = null; lastExp = null; continue;
    }
    if (!titulo && /^TEST\s*\d+\s*[—–-]/i.test(plain)) { titulo = plain; continue; }
    if (/^#/.test(raw)) {                                           // otro encabezado Markdown
      if (!titulo) titulo = plain; else section = 'skip';
      cur = null; lastExp = null; continue;
    }

    if (section === 'meta') {
      if ((m = /^(Bloque\s+[IVX]+|Tema\s+\d+|Fecha|Preguntas)\s*:\s*(.*)$/i.exec(plain))) {
        const k = m[1].trim(), v = m[2].trim();
        let mm;
        if ((mm = /^bloque\s+([IVX]+)$/i.exec(k))) bloque = mm[1].toUpperCase();
        else if ((mm = /^tema\s+(\d+)$/i.exec(k))) tn = mm[1];
        else if (/^fecha$/i.test(k)) fecha = parseFechaES(v);
        else if (/^preguntas$/i.test(k)) declared = parseInt(v, 10) || null;
      }
    } else if (section === 'q') {
      if ((m = /^([A-F])[).]\s+(.+)$/.exec(plain)) && cur) { cur.letters.push(m[1]); cur.opciones.push(m[2].trim()); }
      else if ((m = /^(\d+)[.)]\s+(.+)$/.exec(plain))) { cur = { n: +m[1], q: m[2].trim(), opciones: [], letters: [] }; qs.push(cur); }
      else if (cur) {                                               // línea de continuación
        if (cur.opciones.length) cur.opciones[cur.opciones.length - 1] += ' ' + plain;
        else cur.q += ' ' + plain;
      }
    } else if (section === 'sol') {
      if ((m = /^\|?\s*(\d{1,3})\s*[|\t ]+\s*([A-F])\s*(?:[|\t ]+\s*(.*?))?\s*\|?$/.exec(plain)) && !/^\d+[.)]/.test(plain)) {
        sol[+m[1]] = { l: m[2], art: (m[3] || '').trim() };         // fila de la tabla (con | o con tabuladores)
      } else if ((m = /^\*\*(\d+)[.)]\s+Respuesta\s+([A-F])\s*[—–-]\s*(.+?)\.?\*\*\s*(.*)$/.exec(raw))) {
        exp[+m[1]] = { l: m[2], ref: m[3].trim(), text: m[4].trim() }; lastExp = exp[+m[1]];
      } else if ((m = /^(\d+)[.)]\s+Respuesta\s+([A-F])\s*[—–-]\s*(.*)$/.exec(plain))) {
        const a = ART.exec(m[3]);                                   // sin ** hay que separar «Artículo X.» del texto
        exp[+m[1]] = a ? { l: m[2], ref: a[1].trim(), text: a[2].trim() } : { l: m[2], ref: '', text: m[3].trim() };
        lastExp = exp[+m[1]];
      } else if (lastExp && !/^[|]/.test(plain)) lastExp.text += ' ' + plain;
    }
  }

  if (!titulo) errors.push('No encuentro el título (una línea «TEST 04 — …»).');
  if (!qs.length) errors.push('No encuentro preguntas. Cada una debe empezar por «1. Texto» y sus opciones por «A) …».');
  if (declared && qs.length && declared !== qs.length) warnings.push(`El documento dice ${declared} preguntas pero he encontrado ${qs.length}.`);
  if (!fecha) warnings.push('No he podido leer la fecha; ponla abajo.');
  if (!(bloque && tn)) warnings.push('No he encontrado «Bloque» y «Tema»; elige el tema abajo.');
  if (new Set(qs.map(q => q.n)).size !== qs.length) warnings.push('Hay números de pregunta repetidos.');

  const preguntas = qs.map(q => {
    const s = sol[q.n], e = exp[q.n], letter = s ? s.l : (e ? e.l : null);
    let idx = -1;
    if (!letter) errors.push(`Pregunta ${q.n}: no encuentro su respuesta en el solucionario.`);
    else {
      idx = q.letters.indexOf(letter);
      if (idx < 0) errors.push(`Pregunta ${q.n}: la respuesta ${letter} no corresponde a ninguna de sus opciones.`);
    }
    if (s && e && s.l !== e.l) warnings.push(`Pregunta ${q.n}: la tabla dice ${s.l} y la explicación ${e.l}. Se usa la tabla; revísala.`);
    if (q.opciones.length !== 4) warnings.push(`Pregunta ${q.n}: tiene ${q.opciones.length} opciones.`);
    const out = { ref: undefined, q: q.q, opciones: q.opciones, correcta: idx, explicacion: undefined };
    const ref = e && e.ref ? e.ref : (s && s.art ? 'Artículo ' + s.art : '');
    if (ref) out.ref = ref;
    if (e && e.text) out.explicacion = e.text; else if (Object.keys(exp).length) warnings.push(`Pregunta ${q.n}: sin explicación.`);
    Object.keys(out).forEach(k => out[k] === undefined && delete out[k]);
    return { ref: out.ref, q: out.q, opciones: out.opciones, correcta: out.correcta, explicacion: out.explicacion };
  }).map(o => { Object.keys(o).forEach(k => o[k] === undefined && delete o[k]); return o; });

  return { data: { titulo: titulo ? niceTitle(titulo) : '', tema: bloque && tn ? `${bloque}-${tn}` : '', fecha, preguntas }, errors, warnings };
}

/* ---------- uso sin conexión ---------- */
const OFF = { cache: 'ma-dinamico', clave: 'ma2_offline', maxEdad: 6 * 3600 * 1000 };
function registrarSW() {
  if (!('serviceWorker' in navigator)) return Promise.resolve(null);
  return navigator.serviceWorker.register('sw.js').then(() => navigator.serviceWorker.ready).catch(() => null);
}
const offInfo = () => jget(localStorage, OFF.clave, {});
// Guarda en este dispositivo todos los tests (y deja guardada la lista) para poder usar la web sin conexión.
async function guardarOffline(items, onProgreso) {
  const reg = await registrarSW();
  if (!reg || !window.caches) throw new Error('sin-soporte');
  const cache = await caches.open(OFF.cache);
  try { await listFiles(); } catch (e) { /* sin lista nueva: se conserva la anterior */ }
  const rutas = ['temario.json', ...items.filter(i => i.kind === 'json').map(i => `${CFG.dir}/${encodeURIComponent(i.id)}.json`)];
  let hechos = 0, tests = 0;
  for (const ruta of rutas) {
    try {
      const u = new URL(ruta, location.href), r = await fetch(u.href, { cache: 'no-cache' });
      if (r.ok) { await cache.put(new Request(u.origin + u.pathname), r); if (ruta !== 'temario.json') tests++; }
    } catch (e) { /* ese archivo no se pudo bajar */ }
    if (onProgreso) onProgreso(++hechos, rutas.length);
  }
  const meta = { t: Date.now(), n: tests };
  jset(localStorage, OFF.clave, meta);
  try { if (navigator.storage && navigator.storage.persist) await navigator.storage.persist(); } catch (e) { /* nada */ }
  return meta;
}

// Aviso cuando no hay conexión, y sincronización al volver
let _pideInstalar = null;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); _pideInstalar = e; document.dispatchEvent(new Event('ma-puede-instalar')); });
function montarAvisoRed() {
  const wrap = document.querySelector('.wrap');
  if (!wrap) return;
  const av = el('p', 'sin-red hide', 'Sin conexión. Puedes practicar con los tests que tengas guardados; tu progreso se sincronizará al volver.');
  av.setAttribute('role', 'status'); wrap.prepend(av);
  const pinta = () => av.classList.toggle('hide', navigator.onLine !== false);
  window.addEventListener('offline', pinta);
  window.addEventListener('online', () => { pinta(); if (getToken()) syncNow(); });
  pinta();
}

/* ---------- estructura común: menú lateral (escritorio) y barra inferior (móvil) ---------- */
const ICO = {
  inicio: '<path d="M4 11.2 12 4l8 7.2V19a1.5 1.5 0 0 1-1.5 1.5H15V15H9v5.5H5.5A1.5 1.5 0 0 1 4 19z"/>',
  temario: '<path d="M9 6.5h11M9 12h11M9 17.5h11"/><path d="M4.6 6.5h.01M4.6 12h.01M4.6 17.5h.01"/>',
  tests: '<rect x="4" y="4" width="16" height="16" rx="3.5"/><path d="m8.4 12.2 2.5 2.5 4.7-5.2"/>',
  biblioteca: '<path d="M4 5.8A1.8 1.8 0 0 1 5.8 4H11v16H5.8A1.8 1.8 0 0 1 4 18.2z"/><path d="M20 5.8A1.8 1.8 0 0 0 18.2 4H13v16h5.2a1.8 1.8 0 0 0 1.8-1.8z"/>',
  ajustes: '<path d="M4 7h9M19 7h1M4 17h1M11 17h9"/><circle cx="16" cy="7" r="2.2"/><circle cx="8" cy="17" r="2.2"/>',
  refrescar: '<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/>'
};
const NAV = [['inicio', 'Inicio', 'index.html'], ['temario', 'Temario', 'temario.html'], ['tests', 'Tests', 'tests.html'], ['biblioteca', 'Biblioteca', 'biblioteca.html']];
const svg = k => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICO[k]}</svg>`;   // iconos fijos, no vienen de datos
function crearRefresco() {
  const b = el('button', 'refresco'); b.type = 'button'; b.title = 'Actualizar'; b.setAttribute('aria-label', 'Actualizar la web, los tests y el progreso');
  b.insertAdjacentHTML('beforeend', svg('refrescar'));
  b.addEventListener('click', () => refrescarTodo(b));
  return b;
}
function montarShell() {
  const wrap = document.querySelector('.wrap');
  if (!wrap || document.querySelector('.rail')) return;
  const pag = document.body.dataset.pagina || '', enfoque = document.body.hasAttribute('data-enfoque');
  const marca = '<img src="apple-touch-icon.png" alt="" width="32" height="32"><span>Mi Academia</span>';
  const enlace = (id, txt, href, cls) => {
    const a = el('a', cls); a.href = href; a.insertAdjacentHTML('beforeend', svg(id)); a.append(el('span', '', txt));
    if (id === pag) a.setAttribute('aria-current', 'page'); return a;
  };
  // escritorio: menú lateral
  const rail = el('aside', 'rail'), brand = el('a', 'brand'); brand.href = 'index.html'; brand.insertAdjacentHTML('beforeend', marca);
  const nav = el('nav', 'nav'); nav.setAttribute('aria-label', 'Secciones');
  NAV.forEach(([id, txt, href]) => nav.append(enlace(id, txt, href, 'nav-i')));
  const pie = el('div', 'rail-pie');
  const tc = el('div'); tc.dataset.temaCtl = '';
  const fila = el('div', 'rail-fila'); if (!enfoque) fila.append(crearRefresco()); fila.append(tc);
  pie.append(fila, enlace('ajustes', 'Ajustes', 'ajustes.html', 'nav-i'));
  rail.append(brand, nav, pie);
  // móvil: barra superior y barra de pestañas
  const main = el('div', 'main'), top = el('header', 'topbar'), tb = el('a', 'brand'); tb.href = 'index.html'; tb.insertAdjacentHTML('beforeend', marca);
  const acc = el('div', 'topbar-acc'); if (!enfoque) acc.append(crearRefresco());
  const aj = el('a', 'refresco'); aj.href = 'ajustes.html'; aj.title = 'Ajustes'; aj.setAttribute('aria-label', 'Ajustes'); aj.insertAdjacentHTML('beforeend', svg('ajustes'));
  if (pag === 'ajustes') aj.setAttribute('aria-current', 'page');
  acc.append(aj); top.append(tb, acc);
  const tab = el('nav', 'tabbar'); tab.setAttribute('aria-label', 'Secciones');
  NAV.forEach(([id, txt, href]) => tab.append(enlace(id, txt, href, 'tab-i')));
  wrap.before(main); main.append(top, wrap); document.body.prepend(rail); document.body.append(tab);
  document.querySelectorAll('[data-tema-ctl]').forEach(mountThemeControl);
}
// aviso arriba de cada página cuando este dispositivo no tiene el token (o GitHub lo rechaza)
function pintaAvisoToken() {
  const wrap = document.querySelector('.wrap'); if (!wrap) return;
  let a = document.getElementById('aviso-token');
  if (!a) { a = el('p', 'sin-red hide', ''); a.id = 'aviso-token'; a.setAttribute('role', 'status'); wrap.prepend(a); }
  const tiene = !!getToken(), e = syncInfo.estado;
  a.replaceChildren();
  const txt = !tiene ? 'Este dispositivo no tiene el token de GitHub: tu progreso no se sincroniza y no podrás publicar tests. '
    : (e === 'token' ? 'GitHub rechaza el token de este dispositivo (puede haber caducado): no se sincroniza ni se pueden publicar tests. ' : '');
  if (txt) { const l = el('a', '', !tiene ? 'Configurarlo' : 'Guardar uno nuevo'); l.href = 'nuevo.html#token'; a.append(txt, l); }
  a.classList.toggle('hide', !txt);
}
registrarSW();
montarShell();
montarAvisoRed();
pintaAvisoToken();

applyTema(getPrefs().tema);

// «← Atrás»: vuelve a la página anterior de esta web; si se abrió directamente, va al inicio
document.addEventListener('click', e => {
  const b = e.target.closest && e.target.closest('[data-atras]'); if (!b) return;
  let mismo = false; try { mismo = document.referrer && new URL(document.referrer).origin === location.origin; } catch (err) { /* nada */ }
  if (mismo && history.length > 1) { e.preventDefault(); history.back(); }
});
