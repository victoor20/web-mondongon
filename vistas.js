'use strict';
/* =====================================================================
   Mi Academia · datos y piezas compartidas por Inicio, Temario, Tests y Biblioteca
   ===================================================================== */
let items = [], TS = {}, cnt = {}, errC = {}, dudC = {};
const pct = a => Math.round(a.r / a.t * 100);
const plural = (n, s, p) => `${n} ${n === 1 ? s : p}`;
const reciente = id => (TS[id] && TS[id].reciente.t ? TS[id].reciente : null);

/* Origen de las preguntas en Temario y Estructura (ChatGPT, Academia…): se recuerda en este dispositivo.
   Solo actúa donde la página pone usaFuente = true; Inicio y Tests siguen viendo todo. */
let usaFuente = false;
const slugFuente = f => String(f || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-');
const fuentesItems = () => [...new Set(items.filter(i => i.kind === 'json').map(i => i.fuente))].sort((a, b) => a.localeCompare(b, 'es'));
function fuenteSel() { const f = usaFuente ? getPrefs().fuenteVista : ''; return f && f !== 'Todos' && fuentesItems().includes(f) ? f : 'Todos'; }
const qFuente = () => fuenteSel() === 'Todos' ? '' : '&fuente=' + encodeURIComponent(fuenteSel());
const itemsSel = () => items.filter(i => i.kind === 'json' && (fuenteSel() === 'Todos' || i.fuente === fuenteSel()));
function enFuente(testId, titulo) {                                // ¿un intento, error o duda es del origen elegido?
  const f = fuenteSel(); if (f === 'Todos') return true;
  const it = items.find(i => i.id === testId);
  if (it) return it.fuente === f;
  return /Origen: /.test(titulo || '') && String(titulo).split('Origen: ').pop().trim() === f;      // mixtos de un solo origen
}
const histOk = e => enFuente(e.id, e.titulo);
function chipsFuente(box, alCambiar) {
  box.replaceChildren(); const fs = fuentesItems(); if (fs.length < 2) return;
  const sel = fuenteSel(); box.append(el('span', 'rot', 'Origen de las preguntas'));
  ['Todos', ...fs].forEach(f => {
    const c = el('button', 'chip' + (sel === f ? ' on' : '') + (f === 'Todos' ? '' : ' o-' + slugFuente(f)), f); c.type = 'button';
    c.setAttribute('aria-pressed', String(sel === f));
    c.addEventListener('click', () => { setPref('fuenteVista', f); alCambiar(); });
    box.append(c);
  });
}
function computeData() {
  TS = temaStats(histOk); cnt = {}; errC = {}; dudC = {};
  itemsSel().forEach(i => Object.entries(i.temas).forEach(([t, n]) => {
    cnt[t] = cnt[t] || { tests: 0, preguntas: 0 }; cnt[t].tests++; cnt[t].preguntas += n;
  }));
  Object.values(getErr()).forEach(e => { if (e.tema && enFuente(e.testId)) errC[e.tema] = (errC[e.tema] || 0) + 1; });
  Object.values(getDud()).forEach(e => { if (e.tema && enFuente(e.testId)) dudC[e.tema] = (dudC[e.tema] || 0) + 1; });
}
async function cargarCatalogo() {
  try { const r = await loadCatalog(); items = r.items; computeData(); return { ok: true, invalid: r.invalid }; }
  catch (e) { return { ok: false, invalid: [] }; }
}
function resumenTema(t) {
  const c = cnt[t.id], a = TS[t.id];
  let s = c ? `${plural(c.tests, 'test', 'tests')} y ${plural(c.preguntas, 'pregunta', 'preguntas')}` : 'sin tests todavía';
  if (a && a.reciente.t) s += `; acierto ${pct(a.reciente)} % en los últimos intentos, ${plural(a.intentos, 'intento', 'intentos')}, última vez ${haceTexto(a.ultima)}`;
  return s;
}
const urlMixto = id => `test.html?t=mixto&tema=${encodeURIComponent(id)}&n=20${qFuente()}`;
const totalPreguntas = () => items.filter(i => i.kind === 'json').reduce((s, i) => s + (i.n || 0), 0);
async function todasLasPreguntas() {
  const { items: its } = await loadCatalog(); if (!items.length) items = its;
  const sel = fuenteSel();
  const res = await Promise.allSettled(its.filter(i => i.kind === 'json' && (sel === 'Todos' || i.fuente === sel)).map(i => loadTestData(i.id)));
  return res.filter(r => r.status === 'fulfilled').flatMap(r => r.value.preguntas);
}
/* documentos de la Biblioteca por tema (lista guardada en este dispositivo) */
const matCuenta = tema => Object.values(jget(localStorage, 'ma2_bib', {})).filter(d => d && !d.del && d.tema === tema).length;
