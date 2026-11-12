# web-mondongon
Tests oposiciones AGE C1

Web estática para preparar la oposición de Administrativo del Estado (C1): tests tipo test, temario,
biblioteca de material con tarjetas y notas, y un temporizador de estudio. Publicada con GitHub Pages en
https://mondongon.com. No tiene build, ni framework, ni `package.json`: lo que hay en `main` es lo que se sirve.

## Mapa del proyecto

```
mondongon-web/
├─ Páginas (una por apartado)
│  ├─ index.html        Inicio: qué toca hoy, tu estudio de la semana, tests recomendados
│  ├─ temario.html      Temario por bloques y temas, con el acierto de cada tema
│  ├─ tests.html        Listado y filtros de tests; añadir test (con token)
│  ├─ test.html         Motor de test: resuelve, corrige y guarda el historial
│  ├─ biblioteca.html   Material (PDF), Tarjetas (flashcards que se giran) y Notas
│  ├─ visor.html        Visor de PDF (pdf.js) con recuerdo de página y zoom
│  ├─ estructura.html   Estructura de una norma (CE, LOTC) con sus preguntas y «Pedir más preguntas»
│  ├─ ajustes.html      Aspecto, tamaño del texto, tiempo de estudio, uso sin conexión, sincronización
│  └─ nuevo.html / editar.html   Crear y editar un test (se publica en tests/ con el token)
├─ Código compartido
│  ├─ app.js            Base: almacenamiento local, sincronización, historial, notas, tarjetas, estudio
│  ├─ vistas.js         Piezas comunes de Inicio, Temario, Tests y Biblioteca
│  ├─ biblioteca.js     Lógica del material (lista, subida, copias sin conexión)
│  ├─ temporizador.js   Botón flotante con el temporizador de estudio
│  ├─ style.css         Todos los estilos (claro y oscuro)
│  └─ sw.js             Service worker: uso sin conexión y velocidad
├─ Datos y recursos
│  ├─ temario.json                          Bloques y temas del temario
│  ├─ estructura-ce.json, estructura-lotc.json   Tramos de cada norma
│  ├─ tests/                                Un JSON por test
│  ├─ fonts/, vendor/pdfjs3/                Fuentes y pdf.js (versión fija a propósito)
│  └─ icon-192.png, icon-512.png, apple-touch-icon.png, manifest.webmanifest   Icono e instalación como app
└─ Configuración
   ├─ CNAME, robots.txt     Dominio propio y no indexar
   ├─ .claude/settings.json  Hook de Claude Code (git pull al empezar)
   ├─ CLAUDE.md             Guía detallada para Claude Code (cómo funciona cada parte)
   └─ README.md             Este mapa
```

## Dónde va cada cosa nueva

- **Un apartado nuevo**: un `.html` en la raíz, y añadirlo a `PRECACHE` de `sw.js` (y subir `VERSION`).
- **Lógica que usan varias páginas**: `app.js` (datos y sincronización) o `vistas.js` (piezas de pantalla).
- **Lógica de una sola página**: en el `<script>` de esa página, salvo la Biblioteca de material (`biblioteca.js`).
- **Estilos**: `style.css`, agrupados por apartado con un comentario `/* ---------- … ---------- */`.
- **Un test nuevo**: un `.json` en `tests/` (o desde «Añadir test»). **Una norma nueva**: `estructura-xx.json` y una línea en `NORMA_URL`.

## Tus datos no están en este repo

El progreso (historial, errores, notas, tarjetas, tiempo de estudio) vive en el navegador de cada dispositivo
y se sincroniza con el repositorio privado `mondongon-datos` mediante un token de GitHub guardado en cada
dispositivo. Los archivos de la Biblioteca también están en ese repositorio privado. Aquí nunca se suben
tokens ni material.

## Publicar un cambio

1. Subir el número `?v=` de `style.css`, `app.js` y demás en **todas** las páginas HTML (fuerza la recarga).
2. Subir `VERSION` en `sw.js` solo si cambia la lista `PRECACHE`.
3. `git add -A`, `git commit` y `git push origin main`. GitHub Pages publica solo (tarda uno o dos minutos).

Más detalle de cada parte (sincronización, temporizador, tarjetas, visor, modo sin conexión) en `CLAUDE.md`.
