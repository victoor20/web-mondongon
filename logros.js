'use strict';
/* Logros: una sala de piezas. Cada logro es una escultura que cambia de forma y de material al subir de escalón.
   Los datos salen de logrosCalcula() (app.js); aquí solo se dibuja. */
const MAT = [null,
  { n: 'Bronce', a: '#f2b88f', b: '#c47e4e', c: '#6e4326', g: '#e48f58' },
  { n: 'Plata', a: '#f8fafe', b: '#b9c3d8', c: '#6a7590', g: '#cfd8ee' },
  { n: 'Oro', a: '#fff3b4', b: '#f2be40', c: '#946311', g: '#ffd36a' },
  { n: 'Platino', a: '#ecfdff', b: '#8fd6f0', c: '#3b7f9f', g: '#8fe3ff' },
  { n: 'Zafiro', a: '#d9e6ff', b: '#6f97ff', c: '#2a3fa8', g: '#7fa8ff' },
  { n: 'Amatista', a: '#f9dcff', b: '#c47df2', c: '#6a2a9c', g: '#d68fff' },
  { n: 'Prisma', a: '#ffe6f7', b: '#a9c4ff', c: '#6b5bd6', g: '#ffffff', prisma: true }];
const BLOQ = { n: 'Por conseguir', a: '#46527a', b: '#2a3358', c: '#161c36', g: '#5b6aa0' };
const ROM = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
const rad = g => g * Math.PI / 180;

/* ---------- esculturas: cada una recibe el escalón n (1 a 7) y los colores del material ---------- */
const star4 = (x, y, s) => `M${x} ${y - s}L${x + s * .26} ${y - s * .26}L${x + s} ${y}L${x + s * .26} ${y + s * .26}L${x} ${y + s}L${x - s * .26} ${y + s * .26}L${x - s} ${y}L${x - s * .26} ${y - s * .26}Z`;
const star5 = (x, y, R, r) => { let d = ''; for (let i = 0; i < 10; i++) { const a = rad(-90 + i * 36), q = i % 2 ? r : R; d += (i ? 'L' : 'M') + (x + Math.cos(a) * q).toFixed(1) + ' ' + (y + Math.sin(a) * q).toFixed(1); } return d + 'Z'; };
const flama = (cx, b, h, w) => `M${cx} ${b - h}C${cx + w * .3} ${b - h * .72} ${cx + w} ${b - h * .5} ${cx + w} ${b - h * .24}C${cx + w} ${b - h * .06} ${cx + w * .55} ${b} ${cx} ${b}C${cx - w * .55} ${b} ${cx - w} ${b - h * .06} ${cx - w} ${b - h * .24}C${cx - w} ${b - h * .5} ${cx - w * .3} ${b - h * .66} ${cx} ${b - h}Z`;
const E = {};
E.llama = (n, C) => {                                              // Constancia: una llama que crece y se rodea de fuego
  const b = 146, h = 40 + n * 11, w = 14 + n * 3, S = `stroke="${C.c}" stroke-width="1.6" stroke-linejoin="round"`; let s = '';
  if (n >= 7) { s += '<g class="a-orbe">'; for (let i = 0; i < 6; i++) { const a = rad(i * 60); s += `<circle cx="${(100 + Math.cos(a) * 66).toFixed(1)}" cy="${(88 + Math.sin(a) * 52).toFixed(1)}" r="3" fill="${C.a}"/>`; } s += '</g>'; }
  if (n >= 5) s += `<circle cx="100" cy="${b - h * .45}" r="${h * .6}" fill="none" stroke="${C.m}" stroke-width="3" opacity=".85"/>`;
  if (n >= 6) s += `<path class="a-llama" d="${flama(100 - w * 1.5, b, h * .55, w * .6)}" fill="${C.m}" ${S}/><path class="a-llama" style="animation-delay:-.6s" d="${flama(100 + w * 1.5, b, h * .55, w * .6)}" fill="${C.m}" ${S}/>`;
  s += `<path class="a-llama" d="${flama(100, b, h, w)}" fill="${C.m}" ${S}/><path class="a-llama" style="animation-delay:-.3s" d="${flama(100, b, h * .6, w * .55)}" fill="${C.a}" opacity=".9"/>`;
  s += `<path d="M64 ${b - 2}H136L122 ${b + 24}H78Z" fill="${C.m}" ${S}/><rect x="84" y="${b + 24}" width="32" height="7" rx="2" fill="${C.m}" ${S}/>`;
  if (n >= 4) s += `<path d="M70 ${b + 4}L60 ${b + 30}M130 ${b + 4}L140 ${b + 30}" stroke="${C.b}" stroke-width="4" stroke-linecap="round"/>`;
  if (n >= 3) s += '<circle class="a-asc" cx="92" cy="60" r="2.2" fill="' + C.a + '"/><circle class="a-asc" style="animation-delay:-1.4s" cx="110" cy="70" r="1.8" fill="' + C.a + '"/>';
  return s;
};
E.reloj = (n, C) => {                                              // Horas: de una esfera sencilla a un astrolabio
  const R = 54, S = `stroke="${C.c}" stroke-width="1.6"`; let s = '';
  if (n >= 5) for (let i = 0; i < 24; i++) s += `<rect x="97" y="${100 - R - 17}" width="6" height="9" rx="1.5" fill="${C.m}" ${S} transform="rotate(${i * 15} 100 100)"/>`;
  if (n >= 6) s += `<g class="a-anillo"><ellipse cx="100" cy="100" rx="${R + 30}" ry="${(R + 30) * .3}" fill="none" stroke="${C.m}" stroke-width="3" transform="rotate(-28 100 100)"/><ellipse cx="100" cy="100" rx="${R + 30}" ry="${(R + 30) * .3}" fill="none" stroke="${C.b}" stroke-width="2" transform="rotate(28 100 100)"/></g>`;
  if (n >= 4) s += `<rect x="93" y="${100 - R - 22}" width="14" height="13" rx="3" fill="${C.m}" ${S}/>`;
  s += `<circle cx="100" cy="100" r="${R + 7}" fill="${C.m}" ${S}/><circle cx="100" cy="100" r="${R}" fill="#0e1430" stroke="${C.c}" stroke-width="2"/>`;
  if (n >= 2) s += `<circle cx="100" cy="100" r="${R - 9}" fill="none" stroke="${C.b}" stroke-width="1" opacity=".7"/>`;
  for (let i = 0; i < 12; i++) s += `<line x1="100" y1="${100 - R + 4}" x2="100" y2="${100 - R + 12}" stroke="${C.a}" stroke-width="${i % 3 ? 2 : 3.4}" stroke-linecap="round" transform="rotate(${i * 30} 100 100)"/>`;
  if (n >= 3) for (let i = 0; i < 60; i++) if (i % 5) s += `<line x1="100" y1="${100 - R + 4}" x2="100" y2="${100 - R + 7}" stroke="${C.b}" stroke-width="1" transform="rotate(${i * 6} 100 100)"/>`;
  if (n >= 7) s += `<path d="${star4(100, 74, 9)}" fill="${C.a}"/><circle cx="100" cy="100" r="22" fill="none" stroke="${C.a}" stroke-width="1" opacity=".6"/>`;
  s += `<g class="a-hora"><line x1="100" y1="100" x2="100" y2="${100 - R * .5}" stroke="${C.a}" stroke-width="4.5" stroke-linecap="round"/></g><g class="a-min"><line x1="100" y1="100" x2="100" y2="${100 - R * .76}" stroke="${C.a}" stroke-width="3" stroke-linecap="round"/></g>`;
  s += `<g class="a-seg"><line x1="100" y1="108" x2="100" y2="${100 - R * .8}" stroke="${C.b}" stroke-width="1.4" stroke-linecap="round"/></g><circle cx="100" cy="100" r="4.5" fill="${C.m}" ${S}/>`;
  return s;
};
E.laurel = (n, C) => {                                             // Días cumplidos: una corona de laurel que se llena de hojas
  const k = 4 + n * 2, S = `stroke="${C.c}" stroke-width="1.2"`; let s = '';
  [1, -1].forEach((lado, li) => {
    s += `<g class="a-bal${li}">`;
    let ramas = '';
    for (let i = 0; i < k; i++) {
      const t = i / (k - 1), f = 84 - t * 150, a = lado > 0 ? f : 180 - f, x = 100 + Math.cos(rad(a)) * 58, y = 96 + Math.sin(rad(a)) * 58, ry = 3.4 + t * 1.2, rx = 8.5 + t * 3;
      const base = lado > 0 ? f + 90 : 180 - f + 90;
      [-1, 1].forEach(q => { ramas += `<ellipse cx="${(x + Math.cos(rad(a)) * q * 4).toFixed(1)}" cy="${(y + Math.sin(rad(a)) * q * 4).toFixed(1)}" rx="${rx.toFixed(1)}" ry="${ry.toFixed(1)}" fill="${C.m}" ${S} transform="rotate(${(base + q * 32).toFixed(1)} ${(x + Math.cos(rad(a)) * q * 4).toFixed(1)} ${(y + Math.sin(rad(a)) * q * 4).toFixed(1)})"/>`; });
    }
    const a0 = lado > 0 ? 84 : 96, a1 = lado > 0 ? -66 : 246;
    s += `<path d="M${(100 + Math.cos(rad(a0)) * 58).toFixed(1)} ${(96 + Math.sin(rad(a0)) * 58).toFixed(1)}A58 58 0 0 ${lado > 0 ? 0 : 1} ${(100 + Math.cos(rad(a1)) * 58).toFixed(1)} ${(96 + Math.sin(rad(a1)) * 58).toFixed(1)}" fill="none" stroke="${C.c}" stroke-width="2.4"/>${ramas}</g>`;
  });
  if (n >= 3) s += `<path d="M100 156L78 176L88 178L100 166L112 178L122 176Z" fill="${C.b}" stroke="${C.c}" stroke-width="1.4"/>`;
  s += `<circle cx="100" cy="96" r="27" fill="${C.m}" stroke="${C.c}" stroke-width="2"/><circle cx="100" cy="96" r="20" fill="#0e1430" opacity=".85"/><path d="M89 97l8 8 15-17" fill="none" stroke="${C.a}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>`;
  if (n >= 5) s += `<path class="a-brilla" d="${star5(100, 30, 8, 3.6)}" fill="${C.a}" stroke="${C.c}" stroke-width="1"/>`;
  if (n >= 6) s += `<path class="a-brilla" style="animation-delay:-.7s" d="${star5(74, 40, 5.5, 2.4)}" fill="${C.a}"/><path class="a-brilla" style="animation-delay:-1.4s" d="${star5(126, 40, 5.5, 2.4)}" fill="${C.a}"/>`;
  if (n >= 7) s += `<path d="M82 126L86 112L94 120L100 108L106 120L114 112L118 126Z" fill="${C.a}" opacity=".0"/>`;
  return s;
};
E.hojas = (n, C) => {                                              // Tests: una pila de documentos que crece hasta un archivo sellado
  const c = 2 + n, S = `stroke="${C.c}" stroke-width="1.4"`; let s = '', top = 168;
  for (let i = 0; i < c; i++) { const y = 164 - i * 12, x = 48 + (i % 2 ? 6 : -2) + (i % 3 ? 0 : 4); s += `<rect x="${x}" y="${y}" width="104" height="14" rx="3" fill="${i % 2 ? '#e3e8f6' : '#f4f6fd'}" ${S}/><rect x="${x}" y="${y + 11}" width="104" height="3" rx="1" fill="${C.m}"/>`; top = y; }
  const x0 = 48 + ((c - 1) % 2 ? 6 : -2) + ((c - 1) % 3 ? 0 : 4);
  s += `<g class="a-hoja"><rect x="${x0 + 12}" y="${top + 3}" width="50" height="2.6" rx="1" fill="${C.b}"/><rect x="${x0 + 12}" y="${top + 7.5}" width="32" height="2.2" rx="1" fill="${C.b}" opacity=".6"/></g>`;
  if (n >= 5) s += `<rect x="90" y="${top - 3}" width="14" height="${180 - top}" rx="2" fill="${C.m}" ${S}/>`;
  if (n >= 4) s += `<path d="M126 ${top + 6}L118 ${top + 34}L127 ${top + 28}L136 ${top + 34}L140 ${top + 6}Z" fill="${C.b}" ${S}/>`;
  s += `<g class="a-sello"><circle cx="134" cy="${top - 2}" r="${n >= 2 ? 17 : 11}" fill="${C.m}" stroke="${C.c}" stroke-width="2"/><path d="${star5(134, top - 2, n >= 2 ? 10 : 6.5, n >= 2 ? 4.4 : 2.8)}" fill="${C.a}"/></g>`;
  if (n >= 6) s += `<path class="a-brilla" d="${star4(70, top - 12, 8)}" fill="${C.a}"/>`;
  if (n >= 7) s += `<path class="a-brilla" style="animation-delay:-.9s" d="${star4(150, top - 28, 6)}" fill="${C.a}"/><path class="a-brilla" style="animation-delay:-1.7s" d="${star4(56, top - 34, 5)}" fill="${C.a}"/>`;
  return s;
};
E.diana = (n, C) => {                                              // Aciertos: una diana con más anillos y una flecha clavada
  const r = 2 + n, R = 62; let s = '';
  if (n >= 6) for (let i = 0; i < 16; i++) s += `<line x1="100" y1="${100 - R - 8}" x2="100" y2="${100 - R - 18}" stroke="${C.b}" stroke-width="2" opacity=".7" stroke-linecap="round" transform="rotate(${i * 22.5} 100 100)"/>`;
  if (n >= 5) s += `<g stroke="${C.a}" stroke-width="2.4" stroke-linecap="round"><path d="M100 ${100 - R - 12}V${100 - R + 2}M100 ${100 + R - 2}V${100 + R + 12}M${100 - R - 12} 100H${100 - R + 2}M${100 + R - 2} 100H${100 + R + 12}"/></g>`;
  s += '<g class="a-resp">';
  for (let i = r; i >= 1; i--) s += `<circle cx="100" cy="100" r="${(R * i / r).toFixed(1)}" fill="${i % 2 ? C.m : '#0e1430'}" stroke="${C.c}" stroke-width="1.4"/>`;
  s += `<circle cx="100" cy="100" r="${n >= 3 ? 5 : 4}" fill="${C.a}"/></g>`;
  s += `<g class="a-flecha"><line x1="103" y1="97" x2="152" y2="48" stroke="${C.a}" stroke-width="3.6" stroke-linecap="round"/><path d="M152 48L158 36L164 42ZM144 56L152 54L150 62Z" fill="${C.b}" stroke="${C.c}" stroke-width="1"/><path d="M150 50L162 38M146 54L158 42" stroke="${C.a}" stroke-width="1.4" opacity=".0"/></g>`;
  if (n >= 7) s += `<circle class="a-anillo2" cx="100" cy="100" r="${R + 24}" fill="none" stroke="${C.a}" stroke-width="1.4" stroke-dasharray="3 7"/>`;
  return s;
};
const PTS = [[100, 100], [64, 72], [140, 64], [46, 118], [150, 126], [84, 150], [118, 30], [30, 66], [170, 90], [64, 36], [138, 164], [100, 178], [24, 150], [176, 150]];
const EDG = [[0, 1], [0, 2], [1, 3], [0, 4], [2, 4], [3, 5], [5, 0], [2, 6], [1, 7], [2, 8], [4, 10], [5, 11], [3, 12], [4, 13], [6, 9], [1, 9]];
E.constelacion = (n, C) => {                                       // Temas dominados: una constelación que se va completando
  const cnt = [1, 3, 4, 6, 8, 11, 14][n - 1]; let s = '';
  if (n >= 3) s += `<circle cx="100" cy="102" r="74" fill="none" stroke="${C.b}" stroke-width="1" stroke-dasharray="2 6" opacity=".6"/>`;
  if (n >= 5) s += `<circle cx="100" cy="102" r="92" fill="none" stroke="${C.b}" stroke-width="1" stroke-dasharray="1 8" opacity=".45"/>`;
  EDG.forEach(([a, b]) => { if (a < cnt && b < cnt) s += `<line x1="${PTS[a][0]}" y1="${PTS[a][1]}" x2="${PTS[b][0]}" y2="${PTS[b][1]}" stroke="${C.b}" stroke-width="1.8" opacity=".75"/>`; });
  for (let i = 0; i < cnt; i++) { const q = PTS[i], sz = i === 0 ? (n === 1 ? 36 : 18) : 9 + (i % 3) * 2; s += `<path class="a-brilla" style="animation-delay:${(-i * .45).toFixed(2)}s" d="${star4(q[0], q[1], sz)}" fill="${C.m}" stroke="${C.c}" stroke-width="1"/><circle cx="${q[0]}" cy="${q[1]}" r="${i === 0 ? 3.2 : 1.8}" fill="${C.a}"/>`; }
  return s;
};
E.escudo = (n, C) => {                                             // Errores superados: un escudo cada vez más labrado
  const P = 'M100 28L154 44V96C154 132 130 156 100 170C70 156 46 132 46 96V44Z'; let s = '';
  if (n >= 7) for (let i = 0; i < 18; i++) s += `<line x1="100" y1="${100 - 82}" x2="100" y2="${100 - 96}" stroke="${C.b}" stroke-width="3" stroke-linecap="round" opacity=".75" transform="rotate(${i * 20} 100 100)"/>`;
  s += `<defs><clipPath id="${C.u}c"><path d="${P}"/></clipPath></defs><path d="${P}" fill="${C.m}" stroke="${C.c}" stroke-width="2.6" stroke-linejoin="round"/>`;
  if (n >= 2) s += `<path d="${P}" fill="#0e1430" stroke="${C.a}" stroke-width="1.6" transform="translate(100 100) scale(.82) translate(-100 -100)"/>`;
  if (n >= 3) s += `<g clip-path="url(#${C.u}c)"><rect x="93" y="30" width="14" height="150" fill="${C.m}" opacity=".95"/><rect x="40" y="86" width="120" height="12" fill="${C.m}" opacity=".95"/></g>`;
  if (n >= 4) s += `<path d="${star5(100, 94, 17, 7.5)}" fill="${C.a}" stroke="${C.c}" stroke-width="1.4"/>`;
  if (n >= 5) [[62, 46], [138, 46], [52, 96], [148, 96]].forEach(q => { s += `<circle cx="${q[0]}" cy="${q[1]}" r="3.2" fill="${C.a}" stroke="${C.c}"/>`; });
  if (n >= 6) s += `<path d="M76 38L80 22L90 30L100 16L110 30L120 22L124 38Z" fill="${C.m}" stroke="${C.c}" stroke-width="1.6" stroke-linejoin="round"/>`;
  s += `<g clip-path="url(#${C.u}c)"><g class="a-brillo"><rect x="-30" y="20" width="22" height="160" fill="#fff" opacity=".35" transform="skewX(-18)"/></g></g>`;
  return s;
};
E.cartas = (n, C) => {                                             // Tarjetas: un abanico de cartas que crece hasta una baraja completa
  const c = 1 + n, sp = 12 + n * 8; let s = '<g class="a-abanico">';
  for (let i = 0; i < c; i++) {
    const t = i / (c - 1) - .5, ult = i === c - 1;
    s += `<g transform="rotate(${(t * sp).toFixed(1)} 100 176)"><rect x="72" y="62" width="56" height="94" rx="8" fill="${ult ? '#f1f4fc' : '#161d3f'}" stroke="${C.m}" stroke-width="3.4"/>`;
    if (!ult) s += `<rect x="78" y="68" width="44" height="82" rx="5" fill="none" stroke="${C.b}" stroke-width="1" opacity=".5"/>`;
    if (ult) s += `<path d="${star5(100, 108, 19, 8)}" fill="${C.m}" stroke="${C.c}" stroke-width="1.4"/><rect x="80" y="72" width="22" height="3" rx="1.5" fill="${C.b}"/><rect x="80" y="79" width="14" height="2.4" rx="1" fill="${C.b}" opacity=".6"/>`;
    s += '</g>';
  }
  s += '</g>';
  if (n >= 4) s += `<path class="a-brilla" d="${star4(148, 70, 9)}" fill="${C.a}"/>`;
  if (n >= 6) s += `<path class="a-brilla" style="animation-delay:-.8s" d="${star4(52, 86, 7)}" fill="${C.a}"/><path class="a-brilla" style="animation-delay:-1.6s" d="${star4(162, 118, 5)}" fill="${C.a}"/>`;
  return s;
};

const FORMA = { racha: 'llama', horas: 'reloj', dias: 'laurel', tests: 'hojas', aciertos: 'diana', temas: 'constelacion', errores: 'escudo', tarjetas: 'cartas' };
let UID = 0;
function emblema(id, n, mat, bloq) {                               // devuelve el SVG de la escultura
  const u = 'e' + (++UID) + '_', C = { u: u, a: mat.a, b: mat.b, c: mat.c, m: `url(#${u}m)` };
  const stops = mat.prisma ? `<stop offset="0" stop-color="#ffd6f0"/><stop offset=".25" stop-color="#b8ccff"/><stop offset=".5" stop-color="#b6ffe9"/><stop offset=".75" stop-color="#fff0ac"/><stop offset="1" stop-color="#ffb9d4"/>`
    : `<stop offset="0" stop-color="${mat.a}"/><stop offset=".5" stop-color="${mat.b}"/><stop offset="1" stop-color="${mat.c}"/>`;
  return `<svg class="emb${bloq ? ' bloq' : ''}${mat.prisma ? ' prisma' : ''}" viewBox="0 0 200 200" aria-hidden="true" focusable="false"><defs><linearGradient id="${u}m" x1=".1" y1="0" x2=".9" y2="1">${stops}</linearGradient></defs>${E[FORMA[id] || id](n, C)}</svg>`;
}

/* ---------- página ---------- */
if (document.getElementById('lg-grid')) {
  const L = logrosCalcula(), vis = logrosVistos(), tot = L.reduce((a, x) => a + x.pasos.length, 0), con = L.reduce((a, x) => a + x.nivel, 0), grid = $('lg-grid'), nuevos = [];
  $('lg-con').textContent = con; $('lg-tot').textContent = 'de ' + tot + ' piezas'; $('lg-total-i').style.width = Math.round(con / tot * 100) + '%';
  L.forEach((x, idx) => {
    const n = x.pasos.length, visto = vis ? (vis[x.id] || 0) : x.nivel, c = el('article', 'lg-v' + (x.nivel >= n ? ' completa' : ''));
    c.style.setProperty('--i', idx);
    const esc = el('div', 'lg-escena'), halo = el('div', 'lg-halo'), emb = el('div', 'lg-emb'), plinto = el('div', 'lg-plinto'); esc.append(halo, emb, plinto);
    for (let i = 0; i < Math.max(0, x.nivel - 3); i++) { const q = el('i', 'lg-chispa'); q.style.cssText = `left:${14 + (i * 37) % 72}%;top:${12 + (i * 29) % 50}%;animation-delay:${(-i * .7).toFixed(1)}s`; esc.append(q); }
    if (x.nivel > visto) esc.append(el('span', 'lg-nuevo-b', 'Nuevo'));
    const placa = el('div', 'lg-placa'), cab = el('div', 'lg-cab'), nom = el('p', 'lg-nom'), sub = el('p', 'lg-sub'), info = el('p', 'lg-d', x.d), meds = el('div', 'lg-meds'), barra = el('div', 'lg-barra'), fill = el('i'), sig = el('p', 'lg-sig');
    cab.append(el('h2', 'lg-t', x.t), el('span', 'lg-val', x.f(x.id === 'horas' ? Math.floor(x.v) : x.v)));
    barra.append(fill); placa.append(cab, nom, sub, info, meds, barra, sig); c.append(esc, placa);
    const botones = x.pasos.map((p, i) => {
      const m = MAT[i + 1], b = el('button', 'lg-med' + (i < x.nivel ? '' : ' no') + (i >= visto && i < x.nivel ? ' nuevo' : '')); b.type = 'button';
      b.style.cssText = `--a:${m.a};--b:${m.b};--c:${m.c}`; b.append(el('i'), el('span', '', x.id === 'horas' ? p + ' h' : String(p))); b.setAttribute('aria-label', x.nom[i] + ', ' + x.f(p) + (i < x.nivel ? ', conseguido' : ', por conseguir'));
      if (i >= visto && i < x.nivel) nuevos.push(x.t + ': ' + x.nom[i]);
      b.addEventListener('click', () => pinta(i + 1)); meds.append(b); return b;
    });
    function pinta(k) {
      const ok = k <= x.nivel, m = ok ? MAT[k] : BLOQ, prev = k > 1 ? x.pasos[k - 2] : 0, meta = x.pasos[k - 1];
      emb.innerHTML = emblema(x.id, k, m, !ok); esc.style.setProperty('--glow', m.g); esc.classList.toggle('bloq', !ok);
      nom.textContent = x.nom[k - 1]; sub.textContent = (ok ? MAT[k].n : 'Por conseguir') + '. Pieza ' + ROM[k - 1] + ' de ' + ROM[n - 1] + '.';
      botones.forEach((b, i) => b.setAttribute('aria-pressed', String(i + 1 === k)));
      const frac = ok ? 1 : Math.max(0, Math.min(1, (x.v - prev) / (meta - prev)));
      fill.style.width = Math.max(ok ? 100 : 2, Math.round(frac * 100)) + '%'; fill.style.cssText += `;--a:${(ok ? MAT[k] : MAT[Math.min(n, x.nivel + 1)]).a};--b:${(ok ? MAT[k] : MAT[Math.min(n, x.nivel + 1)]).b}`;
      sig.textContent = ok ? 'Conseguido con ' + x.f(meta) + '.' : (k === x.nivel + 1 ? 'Siguiente: ' + x.f(meta) + '. Te faltan ' + x.f(Math.ceil(meta - x.v)) + '.' : 'Se consigue con ' + x.f(meta) + '.');
    }
    pinta(Math.max(1, x.nivel)); grid.append(c);
  });
  if (nuevos.length) $('lg-nuevo').append(el('p', 'lg-aviso', 'Piezas nuevas: ' + nuevos.join('; ') + '.'));
  logrosMarca(L);
}
