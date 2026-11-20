/* Mi Academia · descarga de un test en limpio para practicar en papel
   Sin notas, estrellas ni respuestas marcadas. Las preguntas y las opciones salen siempre en el
   mismo orden (el del test), numeradas, para que dos copias impresas sean idénticas.
   Formatos: PDF (con el diálogo de imprimir), Word (.docx) y Markdown (.md). Todo se genera en el
   dispositivo, sin red. */
const Descarga = (() => {
  const L = 'ABCDEFGH';
  const REGLA = 'Marca una sola respuesta por pregunta. Cada error resta un tercio del valor de un acierto; las preguntas en blanco no restan.';
  const slug = s => (String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'test').slice(0, 70);
  const limpia = s => String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
  const nombre = (titulo, ext) => slug(titulo) + '-en-limpio.' + ext;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const soluciones = preg => preg.map((q, i) => (i + 1) + '-' + L[q.correcta]);

  function baja(blob, archivo) {
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = archivo;
    document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }

  /* ---------- Markdown ---------- */
  function markdown(titulo, preg, conSol) {
    const o = ['# ' + limpia(titulo), '', `${preg.length} preguntas. Nombre: ____________________  Fecha: ____________`, '', '_' + REGLA + '_', ''];
    preg.forEach((q, i) => {
      o.push(`**${i + 1}.** ${limpia(q.q)}`, '');
      q.opciones.forEach((t, j) => o.push(`- ${L[j]}) ${limpia(t)}`));
      o.push('');
    });
    if (conSol) {
      o.push('---', '', '## Soluciones', '');
      for (let i = 0; i < preg.length; i += 10) o.push(soluciones(preg).slice(i, i + 10).join('  ·  '), '');
    }
    return o.join('\n');
  }

  /* ---------- PDF: página lista para imprimir ---------- */
  function paginaHtml(titulo, preg, conSol) {
    const q = preg.map((p, i) => `<section class="q"><p class="e"><b>${i + 1}.</b> ${esc(limpia(p.q))}</p>${p.opciones.map((t, j) => `<p class="o"><b>${L[j]})</b> ${esc(limpia(t))}</p>`).join('')}</section>`).join('');
    const sol = conSol ? `<section class="sol"><h2>Soluciones</h2><p>${soluciones(preg).map(esc).join(' &nbsp;·&nbsp; ')}</p></section>` : '';
    return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${esc(limpia(titulo))}</title><style>
@page{size:A4;margin:18mm 16mm 20mm;@bottom-center{content:counter(page) " / " counter(pages);font:9pt Georgia,serif;color:#555}}
html{font:11.5pt/1.45 Georgia,"Times New Roman",serif;color:#000}body{margin:0}
h1{font:700 17pt/1.25 Georgia,serif;margin:0 0 4mm}
.dat{display:flex;justify-content:space-between;gap:8mm;border-top:1.5px solid #000;border-bottom:1.5px solid #000;padding:2.5mm 0;margin:0 0 3mm;font-size:10.5pt}
.reg{font-size:9.5pt;color:#333;margin:0 0 6mm}
.q{break-inside:avoid;page-break-inside:avoid;margin:0 0 5.5mm}
.e{margin:0 0 1.6mm}.o{margin:0 0 1mm;padding-left:7mm;text-indent:-7mm}
.sol{break-before:page;page-break-before:always}.sol h2{font:700 14pt Georgia,serif}
</style></head><body><h1>${esc(limpia(titulo))}</h1>
<div class="dat"><span>Nombre: ______________________________</span><span>Fecha: ______________</span><span>${preg.length} preguntas</span></div>
<p class="reg">${esc(REGLA)}</p>${q}${sol}</body></html>`;
  }
  function pdf(titulo, preg, conSol) {
    const f = document.createElement('iframe');
    f.setAttribute('aria-hidden', 'true'); f.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
    f.srcdoc = paginaHtml(titulo, preg, conSol);
    f.onload = () => {
      try { f.contentWindow.focus(); f.contentWindow.print(); } catch (e) { /* nada */ }
      setTimeout(() => f.remove(), 90000);
    };
    document.body.append(f);
  }

  /* ---------- Word (.docx): paquete mínimo, sin compresión ---------- */
  const crcT = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  const crc32 = b => { let c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++) c = crcT[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
  function zip(archivos) {                                          // [{n, d: Uint8Array}]
    const enc = new TextEncoder(), partes = [], central = []; let pos = 0;
    const u16 = v => [v & 255, (v >>> 8) & 255], u32 = v => [v & 255, (v >>> 8) & 255, (v >>> 16) & 255, (v >>> 24) & 255];
    archivos.forEach(a => {
      const nom = enc.encode(a.n), crc = crc32(a.d), tam = a.d.length;
      const cab = new Uint8Array([0x50, 0x4B, 3, 4, ...u16(20), ...u16(0x0800), ...u16(0), ...u16(0), ...u16(0x21), ...u32(crc), ...u32(tam), ...u32(tam), ...u16(nom.length), ...u16(0)]);
      partes.push(cab, nom, a.d);
      central.push(new Uint8Array([0x50, 0x4B, 1, 2, ...u16(20), ...u16(20), ...u16(0x0800), ...u16(0), ...u16(0), ...u16(0x21), ...u32(crc), ...u32(tam), ...u32(tam), ...u16(nom.length), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(pos)]), nom);
      pos += cab.length + nom.length + tam;
    });
    const tamC = central.reduce((s, x) => s + x.length, 0);
    const fin = new Uint8Array([0x50, 0x4B, 5, 6, ...u16(0), ...u16(0), ...u16(archivos.length), ...u16(archivos.length), ...u32(tamC), ...u32(pos), ...u16(0)]);
    return new Blob([...partes, ...central, fin], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
  }
  function docx(titulo, preg, conSol) {
    const run = (t, o = {}) => `<w:r><w:rPr><w:rFonts w:ascii="Georgia" w:hAnsi="Georgia" w:cs="Georgia"/>${o.b ? '<w:b/>' : ''}<w:sz w:val="${o.sz || 23}"/></w:rPr><w:t xml:space="preserve">${esc(t)}</w:t></w:r>`;
    const par = (runs, o = {}) => `<w:p><w:pPr>${o.keep ? '<w:keepNext/>' : ''}<w:keepLines/>${o.salto ? '<w:pageBreakBefore/>' : ''}<w:spacing w:before="${o.antes || 0}" w:after="${o.despues == null ? 60 : o.despues}"/>${o.ind ? '<w:ind w:left="400" w:hanging="400"/>' : ''}${o.borde ? '<w:pBdr><w:top w:val="single" w:sz="8" w:space="4" w:color="000000"/><w:bottom w:val="single" w:sz="8" w:space="4" w:color="000000"/></w:pBdr>' : ''}</w:pPr>${runs}</w:p>`;
    const cuerpo = [
      par(run(limpia(titulo), { b: 1, sz: 34 }), { despues: 120 }),
      par(run('Nombre: ______________________________     Fecha: ______________     ' + preg.length + ' preguntas', { sz: 21 }), { borde: 1, despues: 120 }),
      par(run(REGLA, { sz: 19 }), { despues: 260 })];
    preg.forEach((q, i) => {
      cuerpo.push(par(run((i + 1) + '. ', { b: 1 }) + run(limpia(q.q)), { keep: 1, despues: 50 }));
      q.opciones.forEach((t, j) => cuerpo.push(par(run(L[j] + ') ', { b: 1 }) + run(limpia(t)), { keep: j < q.opciones.length - 1, ind: 1, despues: j === q.opciones.length - 1 ? 220 : 30 })));
    });
    if (conSol) {
      cuerpo.push(par(run('Soluciones', { b: 1, sz: 28 }), { salto: 1, despues: 120 }));
      cuerpo.push(par(run(soluciones(preg).join('   ·   ')), { despues: 60 }));
    }
    const doc = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>' + cuerpo.join('') +
      '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1021" w:bottom="1134" w:left="1021" w:header="567" w:footer="567" w:gutter="0"/></w:sectPr></w:body></w:document>';
    const enc = new TextEncoder();
    return zip([
      { n: '[Content_Types].xml', d: enc.encode('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>') },
      { n: '_rels/.rels', d: enc.encode('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>') },
      { n: 'word/document.xml', d: enc.encode(doc) }]);
  }

  return {
    pdf,
    docx: (t, p, s) => baja(docx(t, p, s), nombre(t, 'docx')),
    md: (t, p, s) => baja(new Blob([markdown(t, p, s)], { type: 'text/markdown;charset=utf-8' }), nombre(t, 'md')),
    _docxBlob: docx, _md: markdown
  };
})();
