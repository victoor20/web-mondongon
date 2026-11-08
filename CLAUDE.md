# Mi Academia (web-mondongon)

Web estática (sin build, sin framework, sin `package.json`) para practicar tests tipo test
de la oposición de Administrativo del Estado (C1), centrada en la Constitución Española.
Repo remoto: https://github.com/victoor20/web-mondongon (rama `main`). Publicada en
GitHub Pages con dominio propio `mondongon.com` (ver `CNAME`).

## Estructura

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

- `sw.js` es un service worker **network-first**: siempre intenta la red primero (para ver la
  última versión) y solo sirve la copia cacheada si no hay conexión o la red tarda demasiado
  (timeout de 3 s cuando ya hay copia guardada).
- La lista `PRECACHE` dentro de `sw.js` fija qué archivos se guardan de entrada en la instalación
  (núcleo: HTML, `app.js`, `style.css`, `temario.json`, manifest, iconos, fuentes).
- **Si cambia la lista `PRECACHE`** (se añade/quita/renombra un archivo en ella), hay que subir
  el número de `VERSION` en `sw.js`. El nombre de la caché de núcleo incluye `VERSION`
  (`ma-nucleo-<VERSION>`), y es lo que hace que el navegador borre la caché antigua y descargue
  la nueva lista en el siguiente `activate`. Si solo cambia el contenido de un archivo ya listado
  (sin tocar la lista), no es necesario subir `VERSION`: el propio comportamiento network-first ya
  trae la versión nueva.

## Notas

- Los ficheros `tests/*.json` y `temario.json` que no indican "fuente" asumen
  `fuenteAntigua: 'ChatGPT'` (ver `CFG` en `app.js`); las fuentes válidas están en `FUENTES`.
- Esta carpeta es una copia de trabajo 1:1 del repo remoto (clonada, no hay archivos locales
  fuera de git). Versiones anteriores de estos mismos ficheros, que no coincidían con el
  remoto, se archivaron en `C:\Proyectos\mondongon-web-archivo` por si hace falta recuperar
  algo de ellas.

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
