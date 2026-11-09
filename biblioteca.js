'use strict';
/* =====================================================================
   Mi Academia · Biblioteca de material (PDF y otros archivos)
   Los archivos viven en el repositorio PRIVADO (biblioteca/…) y la lista en biblioteca.json.
   ===================================================================== */
const BIB = { indice: 'biblioteca.json', dir: 'biblioteca/', limite: 60 * 1024 * 1024, clave: 'ma2_bib', cache: 'ma-bib' };
const TIPOS = ['Ley', 'Apuntes', 'Esquema', 'Resumen', 'Otro'];
const MIME = { pdf: 'application/pdf', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', txt: 'text/plain', mp3: 'audio/mpeg', m4a: 'audio/mp4',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', doc: 'application/msword', odt: 'application/vnd.oasis.opendocument.text',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' };

let bibDocs = jget(localStorage, BIB.clave, {});
const bibLista = () => Object.values(bibDocs).filter(d => d && !d.del);
const bibCuenta = tema => bibLista().filter(d => d.tema === tema).length;
const extDe = n => { const m = /\.([A-Za-z0-9]{1,5})$/.exec(n || ''); return m ? m[1].toLowerCase() : 'bin'; };
const tamTexto = b => b >= 1048576 ? (b / 1048576).toFixed(b >= 10485760 ? 0 : 1).replace('.', ',') + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB';
const bibRuta = d => `${BIB.dir}${d.id}.${d.ext}`;

async function bibLeer() {
  const r = await fetch(ghFileUrl(CFG.datos.repo, BIB.indice), { headers: ghHeaders(), cache: 'no-store' });
  if (r.status === 404) return { docs: {}, sha: null };
  if (!r.ok) throw new Error(String(r.status));
  const j = await r.json(); let docs = {};
  try { docs = JSON.parse(fromB64utf8(j.content)).docs || {}; } catch (e) { docs = {}; }
  return { docs, sha: j.sha };
}
async function bibEscribir(mutar, msg) {                         // lee, cambia y guarda la lista; reintenta si otro dispositivo escribe a la vez
  for (let i = 0; i < 3; i++) {
    const { docs, sha } = await bibLeer(); mutar(docs);
    const body = { message: msg, content: b64utf8(JSON.stringify({ v: 1, docs })) }; if (sha) body.sha = sha;
    const p = await fetch(ghFileUrl(CFG.datos.repo, BIB.indice), { method: 'PUT', headers: { ...ghHeaders(), 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (p.ok) { bibDocs = docs; jset(localStorage, BIB.clave, docs); return; }
    if (p.status !== 409 && p.status !== 422) throw new Error(String(p.status));
  }
  throw new Error('409');
}
async function bibRefrescar() {
  if (!getToken()) return 'sin-token';
  try { const { docs } = await bibLeer(); bibDocs = docs; jset(localStorage, BIB.clave, docs); return 'ok'; }
  catch (e) { return e.message === '401' ? 'token' : 'error'; }
}

/* copias guardadas en el dispositivo (para leer sin conexión) */
const copiaReq = id => new Request(location.origin + '/__bib/' + id);
async function bibCopia(id) { try { const c = await caches.open(BIB.cache), r = await c.match(copiaReq(id)); return r ? await r.blob() : null; } catch (e) { return null; } }
async function bibGuardaCopia(id, blob) { try { const c = await caches.open(BIB.cache); await c.put(copiaReq(id), new Response(blob, { headers: { 'Content-Type': blob.type || 'application/octet-stream' } })); return true; } catch (e) { return false; } }
async function bibQuitaCopia(id) { try { const c = await caches.open(BIB.cache); await c.delete(copiaReq(id)); } catch (e) { /* nada */ } }
async function bibCopiasIds() { try { const c = await caches.open(BIB.cache); return new Set((await c.keys()).map(r => r.url.split('/__bib/')[1])); } catch (e) { return new Set(); } }

async function bibDescargar(d) {
  const r = await fetch(ghFileUrl(CFG.datos.repo, bibRuta(d)), { headers: { ...ghHeaders(), 'Accept': 'application/vnd.github.raw' } });
  if (!r.ok) throw new Error(String(r.status));
  const buf = await r.arrayBuffer(), blob = new Blob([buf], { type: MIME[d.ext] || 'application/octet-stream' });
  await bibGuardaCopia(d.id, blob);
  return blob;
}
function leerB64(file) {
  return new Promise((ok, ko) => { const fr = new FileReader(); fr.onload = () => ok(String(fr.result).split(',')[1] || ''); fr.onerror = () => ko(fr.error); fr.readAsDataURL(file); });
}
async function bibSubir(file, meta) {
  const id = 'd' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), ext = extDe(file.name);
  const d = { id, ext, titulo: meta.titulo, tema: meta.tema, tipo: meta.tipo, archivo: file.name, bytes: file.size, t: nowT() };
  const content = await leerB64(file);
  const p = await fetch(ghFileUrl(CFG.datos.repo, bibRuta(d)), { method: 'PUT', headers: { ...ghHeaders(), 'Content-Type': 'application/json' }, body: JSON.stringify({ message: 'Añadir documento', content }) });
  if (!p.ok) throw new Error(String(p.status));
  await bibEscribir(docs => { docs[id] = d; }, 'Añadir documento a la lista');
  await bibGuardaCopia(id, new Blob([file], { type: MIME[ext] || file.type || 'application/octet-stream' }));
  return d;
}
async function bibBorrar(d) {
  await bibEscribir(docs => { delete docs[d.id]; }, 'Quitar documento de la lista');
  try {
    const u = ghFileUrl(CFG.datos.repo, bibRuta(d)), g = await fetch(u, { headers: ghHeaders(), cache: 'no-store' });
    if (g.ok) { const j = await g.json(); await fetch(u, { method: 'DELETE', headers: { ...ghHeaders(), 'Content-Type': 'application/json' }, body: JSON.stringify({ message: 'Borrar documento', sha: j.sha }) }); }
  } catch (e) { /* la lista ya está limpia; el archivo suelto no molesta */ }
  await bibQuitaCopia(d.id);
}
async function bibAbrir(d, aviso) {
  const w = window.open('', '_blank');
  if (w) { try { w.document.write('<meta charset="utf-8"><title>Abriendo…</title><p style="font:18px system-ui;padding:2rem">Abriendo…</p>'); } catch (e) { /* nada */ } }
  let blob = await bibCopia(d.id);
  if (!blob) {
    if (!navigator.onLine) { if (w) w.close(); aviso('Sin conexión y sin copia guardada. Ábrelo una vez con internet o pulsa «Guardar sin conexión».'); return; }
    try { blob = await bibDescargar(d); } catch (e) { if (w) w.close(); aviso(e.message === '401' ? ghError(401) : 'No he podido descargar el archivo. Inténtalo de nuevo.'); return; }
  }
  const url = URL.createObjectURL(blob);
  if (w && !w.closed) w.location.href = url; else location.href = url;
}
