# Changelog

Resumen de los cambios mergeados hasta ahora en TEAM 23 Production Hub (panel + portal de proveedores).

## 2026-07-26 — Landing, mes en completados, y reconciliación de tus fixes de mobile

Importante primero: **confirmamos que Netlify deploya desde `coord-team23/team23hub`**, no desde `t34M23/team23hub`. De acá en más, cada sincronización se pushea a los **dos** repos (ya lo hicimos con este commit) para que el sitio live se actualice solo.

### home.html (landing) — rediseño

- Se sacó el sector superior (wordmark + botón "Ingresar") y la sección "Qué datos usa TEAM 23 Hub y para qué" (esa info sigue en `/privacidad`, solo se sacó de la landing).
- Tarjetas y el bloque "¿Quién puede entrar?" ahora con `border-radius:var(--radius-lg)`, igual que el resto del hub (antes tenían esquina recta).
- El `h1` tenía `font-weight:900` y `letter-spacing:-1px` hardcodeados — no coincidía con el resto del hub, que usa `var(--weight-bold)` (700) + `var(--tracking-tight)`. Ya alineado, más el mismo `-webkit-text-stroke` que usa `.hero h1` en `index.html`.
- El subtítulo pasó de `<p>` a `<h2>`, con menos interlineado, y el texto se acortó a: *"Plataforma de gestión del estudio TEAM 23 para organizar cada proyecto de principio a fin..."*
- Kicker actualizado a "Dirección Creativa, Post Producción & New Media Lab", con `letter-spacing:-0.04em` (el mismo valor de `--tracking-tight`).
- Footer reemplazado por el mismo de `index.html` (logo + "MX — ARG — WORLDWIDE" + copyright), antes tenía uno propio con links de privacidad/contacto sueltos.

### Kerning de Nimbus, unificado en toda la plataforma

`login.html`, `home.html` y `privacidad.html` no tenían `letter-spacing` en el `body` — `index.html` y `proveedores.html` sí. Se agregó `var(--tracking-tight)` a los tres para que el kerning sea consistente en todo el sitio, no solo en el hub y el portal.

### Header: botones unificados con las tabs

- "Directorio" / "Usuarios" / "+ Nuevo Proyecto" / "Salir" ahora comparten exactamente el mismo stroke (2px, antes 4px), la misma altura y las mayúsculas de "Status"/"Proyectos"/"Calendario".
- "Salir" pasa a ser solo un ícono de flecha (antes decía "Salir" y ocupaba mucho ancho en mobile).
- En modo demo (sin `CONFIG.SUPABASE_URL`) esos tres botones ahora se muestran solos, para poder recorrer el hub completo local sin login real.

### Completados: agrupado por mes + año

Al marcar un proyecto "Completado" ahora se guarda el mes además del año (`p.month`), y el listado de completados agrupa mostrando "Marzo de 2026" en vez de solo "2026". Los completados de antes de este cambio (sin mes guardado) siguen agrupándose bien, solo por año. Wireado en `n8n/2-get-projects.json` y `n8n/4-update-project.json` (campo `month`) — si tenés algo tocando esos workflows del lado tuyo, avisame para no pisarnos.

### Reconciliación con tus 4 commits nuevos (fixes de responsive mobile)

Encontramos que habías seguido puliendo el responsive en `index.html` desde la última sincronización — historias no relacionadas (subiste todo por "Add files via upload"), así que el merge automático marcó todo como conflicto add/add. Se resolvió a mano: base nuestra + tu delta real reaplicado encima. Nada tuyo se perdió — el push a tu repo fue un fast-forward limpio (`c895141..95202b6`), sin forzar nada.

Lo tuyo que quedó adoptado:
- Header en columna en mobile (antes se desbordaba del viewport y "Salir" quedaba directamente afuera de la pantalla).
- Tabs en una sola línea con scroll horizontal en vez de wrap.
- Tracker de jornadas y calendario: en vez de aplastar las columnas hasta ilegibles, ahora scrollean de costado.
- Grilla de asignación (nombre/mail/discord/teléfono) con `grid-area` explícito — antes el campo Discord se colaba en la columna de la cruz de borrar.
- Alturas mínimas más generosas en checkboxes/botones chicos para que se puedan tocar con el dedo.
- Popups (síntesis, notas, mail) con menos alto fijo, para no obligar a scrollear tanto en pantallas chicas.
- Se descartó de nuevo `n8n/index.html` — el mismo archivo accidental (una copia vieja de `index.html` subida por error a esa carpeta) que ya habíamos sacado la vez pasada, había vuelto a aparecer.

## 2026-07-25 — Reconciliación con la versión de Eyal + rebrand TEAM 23

Este merge trajo tu último estado de `coord-team23/team23hub` (67 commits desde la vez pasada) hacia `t34M23/team23hub`, resolviendo los lugares donde ambos tocamos lo mismo. Punto de rollback si algo se rompe: tag `pre-eyal-merge-2026-07-25`.

### Lo tuyo que se adoptó tal cual

- **Borrador + automatizaciones**: al crear un proyecto, ahora se puede dejar "en borrador" y elegir qué se dispara de una (Drive / Frame.io / Discord), en vez de todo junto.
- **Mails de propuesta por candidato** (`mailOpen`/`mailBuildHTML`), con preview en vivo antes de mandar.
- **Notas por tarea** (`notaOpen`/`notaSave`), separadas de las fechas.
- **Banner de "proyectos nuevos"** con cache en localStorage.
- **Tu síntesis colapsable + popup** (con la vista previa "Cómo se va a ver") — la adoptamos en vez de la que habíamos armado nosotros en paralelo, porque la tuya quedó más completa. Si ves referencias a `sxBoxHTML`/`sxOpen`/`sxToggle` en el código, es la tuya.
- `n8n/0-setup-portada.json` (portada del Brief en Slides).
- **Se descartó** `n8n/index.html` — parecía una copia vieja del hub subida por error a esa carpeta; avisame si en realidad tenía algo que necesitás.

### Lo que reaplicamos encima de tu versión (no estaba ahí)

- Pills de tareas alineadas a la derecha del título + mismo tamaño que el badge de estado, en las cards de "Proyectos".
- Bloques "equipo + fechas" sin borde (antes tenían un recuadro).
- "Tareas TEAM 23" y "Calendario" en la ficha ahora son colapsables: arrancan cerradas, se abren clickeando en cualquier parte del título (no solo un ícono), con un toggle circular de borde negro.
- Fix de un bug real: el nodo de debrief IA tenía `model: 'claude-sonnet-4-6'` (no existe) — corregido a `claude-sonnet-5`. Si en tu copia lo volviste a tocar, chequealo.

### Nuevo en esta tanda (no existía en ningún lado antes)

- **Rebrand de marca**: `TEAM23` → `TEAM 23` (con espacio) en todo el hub — wordmark, título de la pestaña del navegador, footers, asunto/cuerpo de los mails de propuesta, PDF del calendario. **Ojo si tenés textos propios con "TEAM23" pegado** (código, docs, mails) — para consistencia visual conviene que uses la misma separación de acá en más. No se tocó nada técnico: el dominio `team23.online`, las rutas de webhook (`team23/create`, `team23/update`, etc.) y el nombre de la credencial de n8n `Team23 Key` quedan exactamente igual.
- Los botones del header (Directorio / Usuarios / + Nuevo Proyecto / Salir) ahora comparten look exacto con las tabs de navegación: mismo stroke (2px), misma altura, mayúsculas. "Salir" pasa a ser solo un ícono de flecha (antes decía "Salir" y ocupaba mucho ancho).
- En modo demo (sin `CONFIG.SUPABASE_URL`) los botones de Directorio/Usuarios/Salir ahora se muestran solos, para poder recorrer el hub completo localmente sin necesitar login real.

### Nota sobre `CONFIG`

Mientras probábamos local, vaciamos temporalmente `CONFIG` (N8N_BASE/API_KEY/SUPABASE_*) en `index.html` y `proveedores.html` para no pegarle a producción por accidente. **Ya está restaurado** con los valores reales antes de este commit — si en algún momento ves el hub pidiéndote solo "MODO DEMO" en el live, es que quedó vacío por error, avisame.

## Merge con la versión de Eyal

Se trajeron 4 features de su fork al `main`, adaptadas al código ya existente (director, lockMeta, workload, tipografía, etc. — nada de eso se perdió):

- **Candidatos**: cada asignación en una tarea puede estar en estado `candidato / confirmado / rechazado`. Se agregaron chips de estado, botones Confirmar/Rechazar/↺, y el badge de "candidatos sin resolver" en la card del proyecto. Los mails de aviso solo van a los confirmados.
- **Gate de activación**: antes de pasar de Pre-producción a un estado en curso, aparece un checklist obligatorio (categoría Discord, canales, timing, Notion, adelanto a Krla). Es irreversible: una vez activado, no se puede volver a Pre-producción.
- **Checklists de etapa**: Protocolo de Delivery (al entrar a Entregando) y Protocolo de Cierre (al entrar a Listo para cierre), con items por responsable (COORD/PROD/EP/ADMIN), persistidos en el proyecto.
- **Debrief con IA (Opción 2)**: alternativa a la creación manual de proyecto — pegás un debrief/brief y Claude precarga nombre, cliente, agencia, tareas y fechas sugeridas.
- Bug real encontrado y corregido: un comentario mal cerrado en `design-system/tokens/effects.css` rompía el token `--space-1`.

## Ajustes posteriores al merge

- Calendario editable desde **Pre-producción**, no solo desde Ejecutando.
- Tareas de Team23 en **modo solo lectura durante Entregando** (las 3 filas de tareas en el calendario siguen editables ahí).
- Contenido final de los 3 checklists (Gate, Delivery, Cierre) ajustado item por item.
- Los checklists **bloquean el avance de etapa** si no están todos los items tildados.
- **Avisos a Discord** cuando se tilda/destilda cualquier item de los 3 checklists (nuevo workflow `n8n/7-discord-notify.json`, vía Incoming Webhook, sin bot).

## Portal de Proveedores (`proveedores.html`)

- Traído desde la rama `version-eyal` (login Supabase, todavía apagado por defecto).
- Rediseñado 1:1 con el design system del hub principal (tipografía, colores, botones, footer).
- Header: mantiene "PRODUCTION HUB", sin el subtítulo "CON TEAM23".
- Eliminado el bloque de "Fases" en el detalle de proyecto.
- Unificado el link "Notas" → "Feedback" (mismo cambio en el hub principal).
- Nuevo resumen en "Tus proyectos": listado de próximos hitos + tus propias entregas (fecha de fin de tu tarea, marcada en rojo como "Entrega"), sin tarjetas de conteo por etapa.
