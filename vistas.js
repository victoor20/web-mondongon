'use strict';
/* =====================================================================
   Mi Academia · datos y piezas compartidas por Inicio, Temario, Tests y Biblioteca
   ===================================================================== */
let items = [], TS = {}, cnt = {}, errC = {}, dudC = {};
const pct = a => Math.round(a.r / a.t * 100);
const plural = (n, s, p) => `${n} ${n === 1 ? s : p}`;
const reciente = id => (TS[id] && TS[id].reciente.t ? TS[id].reciente : null);

function computeData() {
  TS = temaStats(); cnt = {}; errC = {}; dudC = {};
  items.filter(i => i.kind === 'json').forEach(i => Object.entries(i.temas).forEach(([t, n]) => {
    cnt[t] = cnt[t] || { tests: 0, preguntas: 0 }; cnt[t].tests++; cnt[t].preguntas += n;
  }));
  Object.values(getErr()).forEach(e => { if (e.tema) errC[e.tema] = (errC[e.tema] || 0) + 1; });
  Object.values(getDud()).forEach(e => { if (e.tema) dudC[e.tema] = (dudC[e.tema] || 0) + 1; });
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
const urlMixto = id => `test.html?t=mixto&tema=${encodeURIComponent(id)}&n=20`;
const totalPreguntas = () => items.filter(i => i.kind === 'json').reduce((s, i) => s + (i.n || 0), 0);
async function todasLasPreguntas() {
  const { items: its } = await loadCatalog();
  const res = await Promise.allSettled(its.filter(i => i.kind === 'json').map(i => loadTestData(i.id)));
  return res.filter(r => r.status === 'fulfilled').flatMap(r => r.value.preguntas);
}
// frase de estado general: temas con tests y acierto reciente
function fraseEstado() {
  const temas = Object.keys(_temario.byId).length, con = Object.keys(cnt).filter(t => _temario.byId[t]).length;
  let r = 0, t = 0; Object.entries(TS).forEach(([id, a]) => { if (_temario.byId[id] && a.reciente.t) { r += a.reciente.r; t += a.reciente.t; } });
  return `Administrativo del Estado (C1). ${plural(con, 'tema con tests', 'temas con tests')} de ${temas}` + (t ? `; acierto reciente del ${Math.round(r / t * 100)} %.` : '.');
}
