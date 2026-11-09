// Funciones modernas que faltan en navegadores antiguos (p. ej. Chrome 101 de la Galaxy Tab A 2016).
// Se carga antes de pdf.js, tanto en la página como en el worker. Solo se define lo que no existe.
if (typeof Promise.withResolvers !== 'function') {
  Promise.withResolvers = function () { let resolve, reject; const promise = new this((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; };
}
