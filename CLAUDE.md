# Mi Academia (web-mondongon)

Web estática (sin build, sin framework, sin `package.json`) para practicar tests tipo test
de la oposición de Administrativo del Estado (C1), centrada en la Constitución Española.
Repo remoto: https://github.com/victoor20/web-mondongon (rama `main`). Publicada en
GitHub Pages con dominio propio `mondongon.com` (ver `CNAME`).

## Estructura

(El mapa completo de carpetas y archivos está en `README.md`; esta lista resume solo lo esencial.)

- `index.html` — portada: mapa del temario, "para hoy", listado/filtro de tests, sincronización.
- `test.html` — motor de test: resuelve preguntas, calcula aciertos, guarda historial.
- `nuevo.html` — formulario para crear un test nuevo (JSON) y publicarlo en `tests/`.
- `editar.html` — edición de un test existente.
- `app.js` — toda la lógica compartida: carga de `temario.json`, listado de tests vía la API
  de GitHub, progreso/errores/dudas en `localStorage`, y sincronización opcional con un
  repositorio privado.
- `style.css` — estilos (tema claro/oscuro vía `data-tema` en `<html>`).
- `temario.json` — temario oficial (bloques y temas) usado para mapear cada test a sus temas.
- `tests/*.json` — cada test es un fichero JSON independiente en esta carpeta.
- `fonts/`, `apple-touch-icon.png`, `icon-192.png`, `icon-512.png`, `manifest.webmanifest` —
  activos estáticos y PWA (la web es instalable).
- `CNAME` — dominio personalizado para GitHub Pages (`mondongon.com`).

## Cómo funciona

- **Configuración del repo**: al principio de `app.js` está `CFG` con `user`, `repo` y `dir`
  (`tests`). Si el repositorio se renombra o se mueve de cuenta, hay que actualizar eso.
- **Listado de tests**: `app.js` pide `GET https://api.github.com/repos/{user}/{repo}/contents/{dir}`
  para listar los JSON de `tests/` (no hay índice local); cachea la última lista conocida en
  `localStorage` para cuando no hay red o se agota el límite de la API.
- **Progreso del usuario** (historial, errores, dudas, notas, bloque activo) se guarda en
  `localStorage` del navegador (claves `ma2_*`).
- **Sincronización entre dispositivos** (opcional): usa un *personal access token* de GitHub
  (fine-grained, permiso "Contents: Read and write") guardado en `localStorage`
  (`ma2_gh_token`), que se usa para leer/escribir `progreso.json` en un repositorio
  **privado** distinto llamado `mondongon-datos` (ver `CFG.datos`). El token se configura
  desde "Añadir test" → "Publicación directa". Nada de esto pasa por un backend propio: todo
  son llamadas directas a la API de GitHub desde el navegador.
- **Tests de la academia (privados)**: un test con origen `Academia` NO se publica en `tests/` (público): `nuevo.html` lo
  guarda en `tests-academia/` del repo privado `mondongon-datos`. `app.js` (bloque `PRIV`) los lista con el token, guarda su
  metadato en `ma2_privcat` y una copia del JSON en Cache Storage `ma-priv` (uso sin conexión); sin token no aparecen.
  `loadRawTest` busca primero ahí. `editar.html` edita/elimina en el repo que corresponda y no deja guardar como `Academia`
  un test público. El Test mixto admite `&fuente=Academia` (lo añade Tests al filtrar por origen).
- **Test de la academia en PDF**: «Añadir test» → «Subir PDF de la academia» lee el PDF en el navegador con pdf.js
  (`pdfLineas` en `nuevo.html`) y `parsePdfAcademia` (`app.js`) saca preguntas (`N.` / `N.-`), opciones `a)–d)` (también en dos
  columnas) y la tabla «SOLUCIÓN» (letra + referencia). Tema, título y origen salen del nombre del archivo (`B1-T01-01. Test 1. …`).
  Si el formato de la academia cambia, se ajusta ese parser; el resultado se revisa siempre antes de publicar.
- **Alta/edición de tests**: `nuevo.html`/`editar.html` generan el JSON del test y, con el
  mismo token, lo suben directamente a `tests/` en este repo mediante la API de GitHub (commit
  directo a `main`).

## Probarla en local

No hay servidor de desarrollo ni build. Basta con servir la carpeta como estática, por ejemplo:

```
cd C:\Proyectos\mondongon-web
npx serve .
```

(o cualquier otro servidor estático; abrir `index.html` con `file://` directamente puede fallar
por los `fetch` a `temario.json` y a la API de GitHub, que necesitan `http://`).

La sincronización y la subida de tests necesitan un token de GitHub real; sin token, la app
funciona igual pero el progreso solo se guarda en ese navegador y no se puede publicar un test
nuevo directamente (se puede exportar/importar el JSON manualmente).

## Publicarla

Es GitHub Pages servido directamente desde la rama `main` de este repo (dominio `mondongon.com`
vía `CNAME`). Publicar es simplemente hacer commit y push a `main`:

```
git add -A
git commit -m "..."
git push origin main
```

No hay paso de build ni de deploy aparte: lo que hay en `main` es lo que se sirve.

## Modo sin conexión (sw.js)

- `sw.js` sirve el **núcleo** (lo que está en `PRECACHE`) así: las **páginas** se piden a la red con
  un límite de 1,2 s y, si tarda más o no hay conexión, se usa la copia guardada; los **estilos,
  guiones, fuentes e iconos** salen directamente de la copia, sin tocar la red, que es lo que hace
  que cambiar de apartado sea casi instantáneo.
- Las copias de estilos y guiones se guardan **con su `?v=…`**: por eso basta con subir ese número en
  los HTML para que llegue la versión nueva, y nunca se mezcla una página nueva con estilos viejos.
- Todo lo que NO está en `PRECACHE` (los tests de `tests/`, por ejemplo) sigue siendo **network-first**
  con copia de respaldo y timeout de 3 s, para que un test recién subido se vea enseguida.
- La lista `PRECACHE` dentro de `sw.js` fija qué archivos se guardan de entrada en la instalación
  (núcleo: HTML, `app.js`, `style.css`, `temario.json`, manifest, iconos, fuentes).
- **Si cambia la lista `PRECACHE`** (se añade/quita/renombra un archivo en ella), hay que subir
  el número de `VERSION` en `sw.js`. El nombre de la caché de núcleo incluye `VERSION`
  (`ma-nucleo-<VERSION>`), y es lo que hace que el navegador borre la caché antigua y descargue
  la nueva lista en el siguiente `activate`. Conviene subir `VERSION` también en cualquier publicación que toque
  el núcleo, para que no se acumulen copias de versiones antiguas.

## Notas

- Los ficheros `tests/*.json` y `temario.json` que no indican "fuente" asumen
  `fuenteAntigua: 'ChatGPT'` (ver `CFG` en `app.js`); las fuentes válidas están en `FUENTES`.
- Esta carpeta es una copia de trabajo 1:1 del repo remoto (clonada, no hay archivos locales
  fuera de git). Versiones anteriores de estos mismos ficheros, que no coincidían con el
  remoto, se archivaron en `C:\Proyectos\mondongon-web-archivo` por si hace falta recuperar
  algo de ellas.

## Biblioteca y visor de PDF

- `biblioteca.html` + `biblioteca.js`: pestañas Material / Tarjetas / Notas, navegación por hash
  (`#material` = cuadrícula de bloques de colores, `#material/I` = temas del bloque I con sus documentos,
  `#material/general` = documentos sin tema). El enlace antiguo `biblioteca.html?tema=I-2#material`
  redirige a `#material/I` con ese tema abierto.
- Cada documento lleva `origen` (`Academia` o `Propio`; sin campo = `Propio`) y `tipo` (Temario, Esquema,
  Anexo, Test PDF, Audio, Ley, Apuntes, Resumen, Otro). Al subir, «Clasificar por el nombre» (`clasificaNombre`
  en `biblioteca.js`) lee `B1-T01-01 …` = bloque I, tema 1, origen Academia, y el tipo por palabras del
  nombre (esquema, anexo, test, mp3/m4a = audio); lo que no reconoce usa los valores del formulario.
  Hay filtro de origen en Material y etiqueta de origen en cada documento; en Tests, la etiqueta `.org-academia`
  (verde) y el botón «Quitar filtros». Tarjetas y Notas son siempre propias y no llevan origen.
- **Puerta de entrada** (`puerta.js`, primer script de cada HTML + `404.html`): si el dispositivo no tiene
  `localStorage.ma2_ok = '1'`, la página se sustituye por un «404 Not Found» (`window.stop()` + reemplazo del DOM; `app.js` lanza
  un error si `window.__PUERTA`, por si acaso). Se desbloquea tocando tres veces seguidas el «0»; Ajustes → «Ocultar la web»
  vuelve a cerrarla; el selector «Volver a taparla» (clave `ma2_puerta`: `sesion` por defecto = al cerrar la app, `15` = tras 15 min fuera, `nunca`) decide cuándo se pide de nuevo el triple toque. Es despiste, no seguridad (el código y los tests públicos siguen en el repo público). Los HTML nuevos
  deben llevar `<script src="puerta.js?v=…"></script>` justo después de `<meta charset>`, y `puerta.js` va en PRECACHE.
- **Biblioteca (tandas 22-23)**: dentro de cada tema (y de General) hay un filtro por **Tipo** y un selector de orden (`filtTema`, `ORDENES`, `listaDocs`): recientes, antiguos, A→Z, Z→A, por tipo y más grandes.
- **Historial, pendientes para practicar (tanda 31)**: en `repasos.html` las preguntas pendientes salen con las opciones sin marcar (`.rp-pick`): se puede elegir una, pedir «Pista» (1.ª la referencia, 2.ª descarta dos opciones) o «Ver solución»; solución, referencia y nota (`ocultos`) aparecen al responder. Acertar aquí NO resuelve la pregunta (eso solo ocurre en el test de repaso). Las resueltas se ven como siempre.
- **Editor de formato (tanda 30)**: la vista previa (`.fmt-prev`) está abierta por defecto en Notas y Tarjetas; `mdHtml` respeta varias líneas en blanco seguidas (`.md-sp`); el hover de `.fmt button` ya no pisa el color de los botones de color ni del resaltado.
- **Biblioteca (tanda 29)**: Tarjetas se organiza en dos paneles (`.tj-panel`: «Estudiar» y «Tus tarjetas») con las cifras arriba; en Notas, cada tema (`.nt-g`) guarda sus notas en `.nt-cuerpo`, sangrado y con la línea del color del bloque.
- **Errores y dudas (tanda 28)**: `repasos.html` (en PRECACHE, sw v15) es el historial. Al resolverse, `bankDel` conserva la entrada con `del:true, res:<fecha>` (más `p` primera vez, `rs` veces resuelta, `nota` del intento); `getErr/getDud` siguen filtrando `del`, y `mergeMap` no limpia las resueltas. Las notas escritas en un test van con el error/duda, ya NO a `ma2_notas` ni a Biblioteca > Notas. Inicio: `selectorN` (5/10/25/Todos, pref `ultN`/`refN`) en Últimos resultados y Qué reforzar.
- **Descarga en limpio (tanda 26)**: `descarga.js` (en PRECACHE, sw v14) genera PDF (iframe + imprimir), Word (.docx con zip sin compresión) y Markdown desde `pool` mezclando al azar preguntas y opciones en CADA descarga (la correcta se recoloca), sin notas ni respuestas, con soluciones en tabla vertical; se muestra en la bienvenida del test salvo en el mixto. Inicio: filas de «Sesión de hoy» con color (`p-err`, `p-tj`) y filtro por tipo + «Ver más» en «Últimos resultados».
- **Test (tanda 25)**: cada pregunta lleva `stars` (hasta 3, índices originales) y `nota` (del intento; al terminar pasa a `setNota`). La corrección muestra todas las opciones. Los fallos siempre van a errores; la casilla «contar» solo decide historial y estadísticas. Panel fijo `#side` en pantallas ≥1340 px (el botón «Preguntas» sigue en las estrechas). Cancelar vuelve a `DEST_CANCEL` (de dónde vienes) y terminar a `DEST_FIN` (Tests, salvo que vengas de otra página que no sea Inicio).
- **Formato de texto (tanda 24)**: Notas y Tarjetas guardan texto plano con marcas (`**negrita**`, `*cursiva*`, `++subrayado++`, `~~tachado~~`, `==resaltado==`, `{r|rojo}` `{a|}` `{v|}` `{n|}`, `{g|grande}` `{p|pequeño}`, `#`/`##`/`###` títulos, `-` y `1.` listas, `>` cita, `---` línea, tablas con `|`). `mdHtml()` (app.js) lo pinta sin innerHTML; `montaFormato()` (biblioteca.html) pone la barra de formato sobre los textarea `n-x`, `t-p`, `t-r`. Tarjetas usa el acento naranja (`--tj`) y Notas el cian (`--no`) con aspecto de baraja y de cuaderno.
- **Visor (tanda 23)**: cada página lleva encima una capa de texto de pdf.js (`.textLayer`, transparente) para seleccionar y copiar, y un buscador propio («Buscar» o Ctrl+F) que indexa el texto de todas las páginas y resalta los resultados con `<mark>`. Si el PDF es una imagen escaneada, avisa de que no tiene texto. Notas: la etiqueta es texto libre con chips de las ya usadas (`etqNotas`). Los botones de cancelar usan `.btn.cancelar` (rojo suave). «Actualizar» está en el menú lateral junto a Ajustes (`.nav-act`, llama a `refrescarTodo`).
- Temario y Estructura tienen un selector «Origen de las preguntas» (Todos, Academia, ChatGPT…; pref
  `fuenteVista`, solo en ese dispositivo). Se activa con `usaFuente = true` en la página (vistas.js:
  `fuenteSel`, `qFuente`, `itemsSel`, `enFuente`, `histOk`, `chipsFuente`); filtra tests, preguntas, aciertos,
  errores y dudas, y los enlaces a test.html/tests.html llevan `&fuente=`. Inicio y Tests no lo usan.
- Los archivos de material **no están en este repo**: viven en el repositorio privado `mondongon-datos`
  (carpeta `biblioteca/` y la lista `biblioteca.json`). La lista se copia en `localStorage` (`ma2_bib`) y
  cada archivo guardado «sin conexión» va a la caché `ma-bib` del navegador, por eso la Biblioteca y el
  visor funcionan sin red con lo ya guardado.
- `visor.html` abre los PDF con **pdf.js 3.11.174 (build legacy, scripts clásicos)**, vendorizado en
  `vendor/pdfjs3/` (`pdf.min.js`, `pdf.worker.min.js`, `LICENSE`). Se eligió esta versión porque pdf.js 6.5
  no dibuja páginas en el Chrome 101 de la Galaxy Tab A (2016). Versión fija: no se actualiza sola; para
  cambiarla, `npm pack pdfjs-dist@X` fuera del repo y copiar los mismos archivos desde
  `package/legacy/build/`, probando siempre en la tablet antes de subir de versión.
  Recuerda la última página y el zoom por documento en `ma2_visor`. El porcentaje de la barra es un
  campo escribible (50–300 %) y los botones «Ancho» y «Página» fijan el ajuste; el 100 % equivale a
  «Ancho», porque la escala base es el ancho disponible (`fit = disp / base.width`). El ancho se mide
  antes de que aparezca la barra de desplazamiento vertical, por eso `visor.html` reserva su hueco con
  `html{scrollbar-gutter:stable}` (sin eso, en escritorio la hoja salía 15 px más ancha al abrir).
- Temporizador de estudio: `temporizador.js` (cargado en Inicio, Temario, Tests, Biblioteca, visor y Ajustes;
  no en `test.html`) crea un botón flotante con panel. Estado en localStorage por dispositivo (`ma2_temp`,
  `ma2_temp_cfg`, `ma2_temp_log`; no se sincroniza). Usa la hora de fin, no cuenta segundos. Alarma generada
  con Web Audio. Estilos al final de `style.css` (`.tmp*`). Se puede arrastrar (posición y estado oculto en
  `ma2_temp_ui`, por dispositivo), ocultar con la flecha y la alarma se repite en bucle hasta pararla
  (ajuste `bucle`, 9 sonidos en `SONIDOS`). El botón «Terminar» (visible solo con la cuenta en marcha o
  en pausa, en rojo) corta la sesión y suma lo estudiado a `ma2_temp_log`; «Reiniciar» también lo suma.
  El modo Descanso NO suma al estudio: por eso se distingue con color, con la palabra «Descanso» en el botón
  flotante y con un aviso en el panel; elegir o iniciar un descanso de más de 20 min pregunta si es estudio, y
  «Terminar» en un descanso de 10 min o más ofrece contarlo como estudio. En Ajustes del panel se puede añadir
  tiempo estudiado a mano (minutos y día) con `sumaLog(seg, dia)`.
  **El tiempo de estudio SÍ se sincroniza**: vive en `app.js` (`LS.estudio`, `estudioAdd`, `estudioSemana`),
  un dato por día y dispositivo (clave `AAAA-MM-DD|idDispositivo`, `ma2_dev`), fusionado con `mergeMap`; así
  nunca se pisan y el panel muestra Hoy y Esta semana (lunes a domingo) sumando todos los dispositivos. La
  primera vez se migra el antiguo `ma2_temp_log`, que ya no se usa. Llega al resto cuando ese dispositivo sincroniza.
- **Notas libres** (Biblioteca → Notas): apuntes propios con título, texto, tema y etiqueta, en `LS.libres`
  (`getLibres`, `setLibre`, `delLibre`), sincronizados con `mergeMap` y con tumbas al borrar. `SYNC_VER = 2`.
- **Tarjetas** (Biblioteca → Tarjetas): pregunta y respuesta con tema y etiqueta, en `LS.tarjetas`
  (`getTarjetas`, `setTarjeta`, `delTarjeta`, `repasaTarjeta`), sincronizadas con `mergeMap` y tumbas. Repaso espaciado por cajas
  (`CAJAS` = días hasta el siguiente repaso; fallar vuelve a la caja 0). «Pegar varias» admite `pregunta | respuesta` por línea.
  Todo el código está en `biblioteca.html` (bloque «tarjetas»). `carta(k, grande)` crea la tarjeta que se gira (CSS `.fc*`: 3D con
  `perspective`, `backface-visibility`, sin `:has` ni `color-mix` por el Chrome 101 de la tablet). Las tarjetas se agrupan en Bloque (abierto por defecto) > Tema (cerrado por defecto); lo abierto se recuerda en `ma2_tjui` (solo en el
  dispositivo, no se sincroniza). Con búsqueda o filtros activos se abre todo lo que coincide. Hay buscador, filtros por tema, etiqueta y
  estado, y «Estudiar este tema / bloque». Cada pestaña (Notas, Tarjetas) abre con una tarjeta `.ib` que explica para qué sirve.
  En la cuadrícula cada tarjeta se gira al
  tocarla; «Estudiar hoy / Estudiar todas» abre el modo estudio (`est`, `pintaEst`): tarjeta grande, ✕ «No la sabía» / ✓ «La sabía»
  (llaman a `repasaTarjeta`), flechas y deslizar para moverse, espacio para girar, pantalla final con «Repasar las falladas».
  Opciones guardadas en `ma2_prefs` (`tjAzar`, `tjInv`). Estado de cada tarjeta: Nueva (sin `s`), Aprendiendo, Dominada (caja 4 o más).
  Las etiquetas son texto libre; se sugieren las ya usadas más cuatro base (`ETQ_BASE`) y sirven de filtro.
- **Ajustes → Tiempo de estudio**: resumen plegado (hoy, semana, media de 7 días y gráfico); «Corregir un día» abre un calendario propio
  (mes y año siempre visibles, `pintaCal`) y llama a `estudioCorrige`. No se usa `<input type=date>` porque el selector del navegador no
  indica en qué mes se está al desplazarse.
- **Estructura de la norma** (`estructura.html?n=ce`, se abre desde el tema I-1 del Temario): Título → Capítulo → Sección con
  sus preguntas, sacadas de la `ref` de cada pregunta (`refInfo` en `app.js`; la norma es LOTC si la ref o el título del test
  lo dicen, si no CE). Los tramos están en `estructura-ce.json` (para otra norma: otro `estructura-xx.json` y una línea en
  `NORMA_URL`). «Hacer test» abre `test.html?t=mixto&art=CE.15-29` (filtro `art=NORMA.desde-hasta`, también con `t=errores`).
  «Pedir más preguntas» copia un prompt para ChatGPT con el tramo, las preguntas que ya existen y los artículos sin cubrir.
  El acierto por tramo sale de `ar` (acierto por artículo) que desde ahora guarda cada intento en el historial. En las
  `ref` de los tests nuevos, los artículos van con cifras («Artículo 22.4»), y los de la LOTC con «LOTC» en la ref y en el título.
- **Al cambiar algo**: sube `VERSION` en `sw.js` si cambia la lista `PRECACHE`, y sube el parámetro
  `?v=` de los recursos (`style.css?v=…`, `app.js?v=…`…) en **todas** las páginas HTML para forzar la recarga.

## Trabajo entre dos equipos

Este proyecto se usa desde dos equipos distintos; el hook `SessionStart` de `.claude/settings.json`
hace `git pull --ff-only` al empezar. Reglas:

1. **Al empezar**, comprobar con `git status` que no hay cambios sin subir de una sesión anterior y
   avisar al usuario si los hay.
2. **Si `git pull` falla o hay conflicto**, no resolverlo por su cuenta: pararse y explicar al
   usuario qué pasa.
3. **Al terminar un cambio pedido por el usuario**, hacer `git status` y `git diff --stat`, mostrar
   el resumen, y después commit y push.
4. **Solo se suben archivos de la web**, nunca material de la academia ni tokens.
5. **Si va a tocar `sw.js` o la lista `PRECACHE`**, recordar al usuario que hay que subir `VERSION`.
6. **No arrancar servidores ni procesos en segundo plano** (`npx serve`, `python -m http.server`…) salvo que el
   usuario lo pida; si hace falta uno de prueba, cerrarlo al terminar. El usuario no usa servidores locales.
