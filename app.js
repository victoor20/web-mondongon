'use strict';
/* =====================================================================
   Mi Academia · lógica compartida (portada, test y alta de tests)
   ===================================================================== */

// ---- CONFIGURACIÓN (cambia solo si renombras el repo) ----------------
const CFG = { user: 'victoor20', repo: 'web-mondongon', dir: 'tests' };
// ----------------------------------------------------------------------

const LS = { hist: 'ma2_historial', err: 'ma2_errores', list: 'ma2_lista' };
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
function temaLabel(id) {
  const t = _temario.byId[id];
  return t ? `${id} · ${t.corto}` : (id || 'General');
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
      return { id, kind: 'json', titulo: d.titulo, tema, temas, fecha: d.fecha || dateFromName(id), n: d.preguntas.length, url: `test.html?t=${encodeURIComponent(id)}` };
    } catch (e) { invalid.push(n); return null; }
  }));
  const old = legacy.map(n => ({ id: baseName(n), kind: 'html', titulo: prettyFromName(baseName(n)), tema: 'Sin clasificar', temas: {}, fecha: dateFromName(baseName(n)), n: null, url: `${CFG.dir}/${encodeURIComponent(n)}` }));
  const items = [...loaded.filter(Boolean), ...old]
    .sort((a, b) => (b.fecha || '').localeCompare(a.fecha || '') || b.id.localeCompare(a.id));
  return { items, invalid };
}

async function loadTestData(id) {
  const r = await fetch(`${CFG.dir}/${encodeURIComponent(id)}.json`, { cache: 'no-cache' });
  if (!r.ok) throw new Error(`No se encuentra el test "${id}".`);
  const d = await r.json();
  const v = validateTest(d);
  if (v.errors.length) throw new Error(`El test "${id}" tiene errores: ${v.errors[0]}`);
  return { data: d, preguntas: normalizeTest(id, d) };
}

/* ---------- progreso guardado en este navegador ---------- */
const getHist = () => jget(localStorage, LS.hist, []);
function addHist(entry) { const h = getHist(); h.unshift(entry); jset(localStorage, LS.hist, h.slice(0, 500)); }
const getErr = () => jget(localStorage, LS.err, {});
const setErr = o => jset(localStorage, LS.err, o);

function statsFor(id) {
  const h = getHist().filter(x => x.id === id);
  if (!h.length) return null;
  return { intentos: h.length, ultimo: h[0], mejor: Math.max(...h.map(x => x.right / x.total)) };
}

function exportProgress() {
  const blob = new Blob([JSON.stringify({ version: 2, historial: getHist(), errores: getErr() }, null, 1)], { type: 'application/json' });
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
  return num ? `Test ${num} · ${t}` : t;
}

function parseMarkdownTest(md) {
  const errors = [], warnings = [];
  const lines = md.replace(/^﻿/, '').replace(/\r\n?/g, '\n').split('\n').map(l => l.replace(/\s+$/, ''));
  let titulo = '', fecha = '', bloque = '', tn = '', declared = null;
  const qs = [], sol = {}, exp = {};
  let section = 'meta', cur = null, lastExp = null, m;

  for (const line of lines) {
    if ((m = /^#{1,3}\s+(.+)$/.exec(line))) {
      const name = m[1].trim().toUpperCase();
      if (/^PREGUNTAS/.test(name)) section = 'q';
      else if (/^(SOLUCIONARIO|EXPLICACI)/.test(name)) section = 'sol';
      else if (/^(RESULTADO|REGISTRO|REFERENCIA)/.test(name)) section = 'skip';
      else if (!titulo) titulo = m[1].trim();
      else section = 'skip';
      cur = null; lastExp = null;
      continue;
    }
    if (section === 'meta') {
      if ((m = /^\*\*([^*]+?):\*\*\s*(.*)$/.exec(line))) {
        const k = m[1].trim(), v = m[2].trim();
        let mm;
        if ((mm = /^bloque\s+([IVX]+)$/i.exec(k))) bloque = mm[1].toUpperCase();
        else if ((mm = /^tema\s+(\d+)$/i.exec(k))) tn = mm[1];
        else if (/^fecha$/i.test(k)) fecha = parseFechaES(v);
        else if (/^preguntas$/i.test(k)) declared = parseInt(v, 10) || null;
      }
    } else if (section === 'q') {
      if ((m = /^\*\*(\d+)\.\s+(.+?)\*\*$/.exec(line))) { cur = { n: +m[1], q: m[2].trim(), opciones: [], letters: [] }; qs.push(cur); }
      else if ((m = /^([A-F])\)\s+(.+)$/.exec(line)) && cur) { cur.letters.push(m[1]); cur.opciones.push(m[2].trim()); }
      else if (line.trim() && cur) {                       // línea de continuación
        if (cur.opciones.length) cur.opciones[cur.opciones.length - 1] += ' ' + line.trim();
        else cur.q += ' ' + line.trim();
      }
    } else if (section === 'sol') {
      if ((m = /^\|\s*(\d+)\s*\|\s*([A-F])\s*\|\s*(.*?)\s*\|$/.exec(line))) sol[+m[1]] = { l: m[2], art: m[3] };
      else if ((m = /^\*\*(\d+)\.\s+Respuesta\s+([A-F])\s*[—–-]\s*(.+?)\.?\*\*\s*(.*)$/.exec(line))) {
        exp[+m[1]] = { l: m[2], ref: m[3].trim(), text: m[4].trim() }; lastExp = exp[+m[1]];
      } else if (line.trim() && lastExp && !/^[|*#]/.test(line)) lastExp.text += ' ' + line.trim();
    }
  }

  if (!titulo) errors.push('No encuentro el título (una línea «# TEST 04 — …»).');
  if (!qs.length) errors.push('No encuentro preguntas. Cada una debe empezar por «**1. Texto**» y sus opciones por «A) …».');
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
    const out = { q: q.q, opciones: q.opciones, correcta: idx };
    const ref = e && e.ref ? e.ref : (s && s.art ? 'Artículo ' + s.art : '');
    if (ref) out.ref = ref;
    if (e && e.text) out.explicacion = e.text; else if (e !== undefined || Object.keys(exp).length) warnings.push(`Pregunta ${q.n}: sin explicación.`);
    return out;
  });
  // claves en orden legible
  const ordered = preguntas.map(p => ({ ref: p.ref, q: p.q, opciones: p.opciones, correcta: p.correcta, explicacion: p.explicacion }));
  ordered.forEach(o => { Object.keys(o).forEach(k => o[k] === undefined && delete o[k]); });
  return { data: { titulo: titulo ? niceTitle(titulo) : '', tema: bloque && tn ? `${bloque}-${tn}` : '', fecha, preguntas: ordered }, errors, warnings };
}
