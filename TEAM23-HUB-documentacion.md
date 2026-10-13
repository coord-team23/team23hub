# TEAM23 Production Hub — Documentación completa del proyecto

Herramienta interna de gestión de post-producción del estudio **Team23**. Centraliza proyectos, calendarios, entregas, asignaciones de equipo y coordinación con proveedores. Última actualización de este documento: julio 2026.

---

## 1. Stack y URLs

| Pieza | Detalle |
|---|---|
| Frontend | HTML/CSS/JS estático, sin framework. `index.html` (hub interno), `proveedores.html` (portal), `login.html`, `home.html` (landing pública), `privacidad.html` |
| Design system | `design-system/styles.css` → imports de `design-system/tokens/` (fig-tokens, colors, typography, effects). Los alias semánticos (`--ink`, `--red`, `--gray`) y clases base (`.btn`, `.kicker`) viven en el `<style>` de `index.html`; login, home y privacidad los llevan embebidos (autosuficientes) |
| Backend | n8n cloud: `https://coordteam23.app.n8n.cloud` (usa botón **Publish**) |
| Base de datos | Google Sheet `1mL5ks1vzLfZIUjZPX_Y-0xGAUyFjgU9zLxz8iS_PMXE`, pestañas **Projects** y **Calendar** |
| Directorio proveedores | Sheet `1jMs5xUhFKrp5z_LHMOdkJia7vKJsrtKdSB20g9KHsp0` (14 columnas) |
| Auth | Supabase `https://muvmrkacjhygfuialpyn.supabase.co` — roles `interno` / `proveedor` en tabla `profiles` (RLS "perfil propio") |
| Deploy | GitHub → Netlify `team23hub.netlify.app`, dominio custom **hub.team23.online** |
| API key interna | Header `x-team23-key: coordHUBt23` (webhooks de n8n, salvo wf8 que va SIN ese header). **Ojo: no es un secreto.** Vive en `CONFIG.API_KEY` de `index.html`, que Netlify sirve como archivo estático: se lee con ver-código-fuente. El login de Supabase protege la interfaz, no el archivo. Ver sección 7 bis. |
| Frame.io | OAuth v4. accountId `6d46597e-55cc-4300-ae24-22625452eb1d`, workspaceId `0af44ea1-03b4-483d-99ff-88106ee46f0e` |
| Marca | Negro `#0A0A0A` / blanco / rojo `#FF2B1E`, Archivo Black, ojitos googly |

## 2. Rutas (Netlify `_redirects`)

```
/              /home.html         200!   ← el ! fuerza el rewrite (index.html existe en la raíz)
/login         /login.html        200
/productores   /index.html        200
/proveedores   /proveedores.html  200
/privacidad    /privacidad.html   200
```

El login redirige por rol: interno → `/productores`, proveedor → `/proveedores`. La landing (`home.html`) saltea automáticamente a `/login` si detecta sesión en localStorage (`sb-muvmrkacjhygfuialpyn-auth-token`); los visitantes anónimos (incluidos los revisores de Google) la ven normal.

## 3. Frontend — features principales de `index.html`

- **Vistas**: Status (dashboard), Proyectos (tarjetas por estado), Calendario global, Equipo, Directorio (solo internos).
- **Estados de proyecto**: `borrador` → `por_activarse` (Pre-producción) → `activo` (Ejecutando) → `entregando` → `cierre` (Listo para cierre) → `completado`.
  La vista Proyectos tiene tres baldes (`por_activarse`+`borrador` / `activo`+`entregando`+`cierre` / `completado`). Un status fuera de esa lista **no caía en ninguno y el proyecto quedaba invisible en el hub**; ahora `statusRaro()` lo manda a Pre-producción con una píldora roja mostrando el valor crudo, así se ve y se puede corregir en el sheet. Los dos backends comparten el mismo default (`por_activarse`) cuando la celda está vacía: si divergen, una vista cuenta distinto que la otra.
- **Estados de la gente en la ficha** (`r.estado` dentro de `asignaciones_json`): en la ficha nadie se borra, se cambia de estado. La cruz de eliminar quedó solo en los formularios de creación y, dentro de la ficha, en una fila recién agregada que todavía está vacía (el hueco se mantiene con `.icon-slot` para no romper la grilla).
  - **Pre-producción**: `candidato` → `confirmado` / `rechazado`, con ↺ para volver atrás. El rechazado se colapsa a una línea (`.assign-min`: nombre tachado + chip Rechazado + ↺), así no ocupa lugar pero se ve que quedó afuera.
  - **Ejecutando en adelante**: los `rechazado` desaparecen del cuadro (se filtran del render, **no** se borran del sheet: si hiciera falta se recuperan) y ya no hay confirmar/rechazar. Los que quedan se prenden y apagan: `confirmado` (o sin estado, del alta manual) muestra chip **Activo** + Desactivar; `inactivo` muestra chip **Inactivo** + ↺ Reactivar. Un `candidato` sigue siendo candidato y conserva **✓ Confirmar / ✕ Rechazar**: son las personas que se suman con el proyecto ya en marcha (y las que quedaron sin resolver al activar). Si se las rechaza, salen del cuadro igual que en pre-producción.
  - De **Entregando** en adelante la ficha pasa a solo lectura: lista sin rechazados y con los inactivos tachados.
  - El aviso "N candidatos sin resolver" de la tarjeta solo aparece en pre-producción.
- **Creación** por dos flujos: alta manual (ovNew) y **debrief con IA** (ovNew2, workflow 6): pegás el debrief → Claude extrae nombre/cliente/agencia/productora/director/síntesis/tareas/timeline con notas → formulario precargado → crear.
- **Borradores compartidos**: fila en Projects con `status=borrador` y snapshot completo en columna `draft_json`. Sin automatizaciones. Tarjeta con borde rojo entrecortado en Pre-producción, visible para todo el equipo. Botones "Guardar borrador" en el armado y en el popup de cerrar. Crear desde un borrador corre todo normal y elimina la fila.
- **Calendario en el armado**: la misma grilla mensual de la ficha se renderiza en vivo en los dos formularios de creación (salta al mes de la primera fecha).
- **Automatizaciones activables por proyecto**: bloque "Automatizaciones" al final de los dos formularios de creación, con tres checks — **unidad de Drive** (arrastra plantillas y portada), **proyecto de Frame.io** y **canales de Discord**. Vienen los tres encendidos; apagar alguno manda `auto_drive` / `auto_frame` / `auto_discord` en `false` y el workflow 3 saltea ese bloque. Cuando hay algo apagado aparece un aviso rojo: el proyecto se crea igual, pero desde el hub no se puede generar después (queda a mano). Los flags viajan también en el `draft_json` del borrador.
- **Sumar gente al proyecto en marcha**: en la ficha, debajo de cada candidato hay una sola barra (`.person-bar`): a la izquierda el estado y la decisión (Candidato · ✓ Confirmar · ✕ Rechazar), a la derecha la propuesta. La mitad de propuesta aparece solo cuando la fila tiene mail cargado y está en `candidato`: sin enviar muestra el switch **Mandar propuesta por mail** (arranca apagado; prendido dice `Mandar propuesta al guardar`) + `✎ Editar mail`. El mail sale con **Guardar cambios de equipo**: `saveTeam()` junta las filas con el switch prendido, pregunta con nombres (`GUARDAR Y ENVIAR PROPUESTA`) y manda `mails:[…]` en el mismo `POST /webhook/team23/update`; el switch no se persiste (`mailOn` se borra antes de serializar). Enviada muestra `✉ Propuesta enviada 24/07 18:30 · ↺ Reenviar · ✎ Editar mail` (el reenvío sí es inmediato, con su propio confirm). Si la persona está confirmada / activa / inactiva, esa mitad desaparece. Quien se agrega desde la ficha nace con `estado: candidato`, que es lo que habilita proponerle y después confirmarlo o rechazarlo. Manda el mismo mail que el armado pero con los datos del proyecto ya creado, en el momento: `POST /webhook/team23/update` con `{id, asignaciones_json, mails:[…]}`. El envío persiste a la persona, dispara la rama de accesos de Discord (igual que guardar el equipo) y la deja en `candidato`, así todavía puede confirmar o rechazar. Nada se manda solo: sin la clave `mails` en el body, wf4 no toca Gmail.
- **Mails de propuesta editables** (armado desde debrief): cada candidato con dirección cargada muestra debajo de su fila un switch **Mandar propuesta al crear** (con el destinatario al lado; apagado dice `No se le manda propuesta`) y un botón **✎ Editar mail**. El popup (`ovMail`) trae asunto, apertura personalizable y vista previa en iframe de lo que realmente sale; el desplegable "Editar el HTML completo" se precarga con el mail armado y, mientras tenga contenido, se manda tal cual (bloquea la apertura). "Restablecer" vuelve al automático. El hub manda `body.mails` (`rol`, `to`, `nombre`, `enviar`, `subject`, `html`) y wf3 lo respeta; solo guarda como override lo que difiere del automático, así el mail sigue tomando los cambios del formulario mientras no lo pisen. Los overrides viajan en el `draft_json`.
- **Tracker de jornadas**: rango de días del calendario del proyecto, una columna por participante (equipo interno + asignados) y una grilla de jornadas clickeables. Dos cosas importantes:
  - **El activo/inactivo está sincronizado con la ficha**: para la gente asignada, la fuente es `r.estado` en `asignaciones_json` (el participante lleva un `ref:{tarea,i}` que apunta a su fila). Inactivar desde el tracker cambia el estado de la persona en el proyecto y manda `asignaciones_json` + `tracker_json` en la misma llamada, refrescando la ficha si está abierta detrás. `t.inactivos` quedó solo para quienes no tienen fila: EP/Prod/Coord y los que ya no están asignados. Los inactivos **aparecen en el cuadro** grisados (antes se caían y se perdían de vista sus jornadas); candidatos y rechazados no.
  - **Botón "Finalizó" → cierra el conteo**: abre `ovFin`, que propone el día de hoy y ofrece un atajo a la última jornada marcada, para confirmar o corregir el último día de trabajo. Se guarda en `tracker.finalizados[key] = {fecha, marcadoEl}`. Con el conteo cerrado, `toggleJornada` no acepta marcar ni desmarcar (avisa por qué) y las celdas se ven rayadas. La fecha sale en el encabezado y en una columna del resumen, que avisa en rojo si no coincide con la última jornada.
  - **Botón "↺ Reactivar" → reabre el conteo**: aparece en lugar de *Finalizó* cuando la persona está finalizada. Abre `ovReact`, que reconfirma mostrando la fecha de finalización y las jornadas cargadas. Borra la finalización y vuelve a habilitar la carga; las jornadas ya cargadas no se tocan.
  - Ninguno de los dos toca el estado activo/inactivo: son el ciclo de vida del conteo, no del vínculo con el proyecto.
    **Seam para el aviso a administración** (pendiente): al confirmar, la llamada a wf4 incluye `finalizacion: {key, nombre, rol, fecha, jornadas, proyecto, proyecto_id}` o `reactivacion: {key, nombre, rol, fechaPrevia, jornadas, proyecto, proyecto_id}`. Hoy viajan inertes porque `Preparar fila` solo escribe las columnas de su lista blanca; para el aviso hay que colgar una rama post-respuesta en wf4 que gatee sobre esas claves, igual que `¿Mandar propuestas?`.
- **Notas por tarea, legibles y en popup**: eran un input de una línea, ilegible con una nota larga. Ahora el bloque de la tarea muestra el texto completo con wrap (`.nota-box`, `white-space:pre-wrap`) y se edita en el popup `ovNota` (textarea de 220px). En la tabla del calendario la celda de Notas pasó a ser un preview recortado a dos líneas, clickeable, con el texto entero en el `title`. Tres puntos de entrada al mismo dato: `task` (bloque de tarea, `setTaskDate`), `caltask` (fila de tarea en la tabla, `taskDateSet`) y `cal` (fase independiente, `calSet`). La IA la llena desde el debrief y viaja a la columna NOTAS del Calendar.
  **Trampa que trajo esto**: la ficha marca `detailDirty` con los listeners de `input`/`change` de sus propios campos. Editando desde un popup esos eventos no ocurren, así que `notaSave()` prende `detailDirty` / `calDirty` a mano. Cualquier campo que se migre a popup tiene que hacer lo mismo o el cambio se pierde sin avisar.
- **Síntesis formateada, colapsable y editable en popup**: la IA la escribe estructurada (párrafo + "Puntos clave:" + bullets `•`); `sintesisHTML()` la renderiza con estilo (bullets cuadraditos rojos). En el hub vive en una **caja colapsable** (`sxBoxHTML(ctx)`) presente en los tres contextos: ficha (`dt`), alta manual (`np`) y debrief (`n2`). **Arranca colapsada** y muestra la primera línea como preview; la preferencia dura la sesión, por contexto. Se edita **siempre en el popup `ovSintesis`** (textarea grande + vista previa en vivo del formato), nunca en línea. Desde la ficha guarda vía workflow 4 y revierte si falla; desde el armado solo escribe el formulario y viaja al crear. En el alta manual la síntesis del kick off antes era invisible: ahora se ve y se edita. El portal de proveedores tiene su propia copia de `sintesisHTML` y **no** lleva la caja colapsable.
- **Directorio**: tabla dinámica del sheet roster, orden por columna, buscador, edición inline, chips desplegables (Especialidad/Herramientas multi; Acuerdo/País single). Requiere rol interno (validado server-side en wf10).
- **Autocompletado de asignaciones** desde el roster (aparece desde la 1ª letra) + autofill de mail/discord/teléfono si el nombre matchea.
- **Sync al directorio** (fill-if-empty): al crear proyecto o guardar equipo, completa celdas vacías del roster para personas que ya existen (match por nombre, tolerante a tildes). Nunca pisa datos del sheet, nunca crea filas nuevas.
- **Confirm con estética del hub** (`t23Confirm`): reemplaza los `confirm()` nativos; soporta tercer botón opcional.
- **Loader animado** (`t23LoadShow/Hide`) — bloquea la interfaz mientras la operación está en vuelo, que es la mitad del punto: ojitos googly + barra tinta/rojo + frases rotando cada 3s. Pozo común: "Sincronizando el caos" · "Un segundo, que esto quede prolijo" · "Cargando… ponete cómodo, pero no tanto" · "Acomodando los pixeles uno por uno" · "Negociando con la nube" · "No apagues el equipo, actualización 3 de 47" · "Tiempo estimado: 4 minutos… 2 horas… 30 segundos". Específica de crear: "Convenciendo a Drive y a Frame de trabajar juntos". Cableado en crear (ambos flujos), analizar debrief, guardar borrador, eliminar proyecto, eliminar borrador y enviar propuesta desde la ficha. Frase propia de borrar: "Haciendo desaparecer el borrador sin dejar rastro". El borrado de borrador además lleva una guarda de reentrada (`borrandoDraft`) porque la ✕ de la tarjeta es chica y se clickea dos veces fácil.
- **Guardia de descarte** en el armado, con dos textos según el caso: si el proyecto todavía no existe (armado nuevo) → "CERRAR SIN CREAR", con `Cerrar igual` en rojo y la opción `Guardar borrador`. Si se está editando un borrador que ya existe → "CAMBIOS SIN GUARDAR", con `Seguir editando` / `No guardar` / `Guardar cambios` y sin rojo, porque cerrar nunca elimina el borrador. Un borrador que se abre y se cierra sin tocar nada no pregunta nada: `n2Dirty()` compara contra `n2DraftBase`, la foto del snapshot al abrirlo. El botón del formulario también cambia (`Guardar borrador` / `Guardar cambios`), igual que el toast.
- **Parse blindado**: valida la respuesta del debrief; si llega vacía reintenta una vez en silencio y recién después muestra error honesto (sin abrir formulario vacío, sin borrar el texto pegado).
- **Mail de propuesta** (wf3): tabla de timeline real desde `taskDates` (FASE/INICIO/FIN + NOTAS si hay), fechas DD/MM/AAAA, fila del rol del candidato resaltada en rojo con "← tu rol".

## 4. Google Sheet — columnas

**Projects (fila 1):** `id, nombre, cliente, agencia, productora, director, ep_nombre, ep_email, prod_nombre, prod_email, coord_nombre, coord_email, tareas_json, asignaciones_json, status, year, links_json, created_at, taskDates_json, sintesis, storyboard_url, tratamiento_url, tracker_json, discord_category_id, discord_avisos_id, draft_json`

**Calendar:** `project_id, id, tipo (fase|hito), fase, inicio, fin, notas`

**Convención crítica:** los IDs de Discord se guardan con **apóstrofo adelante** (`'123456...`) porque son snowflakes de 18-19 dígitos y Sheets les rompe la precisión como número. Todos los workflows los limpian con `replace(/^'+/, '')` antes de usarlos.

**Roster (14 columnas):** Nombre/Nick, Especialidad, Herramientas, Valor Jornada, Acuerdo, País, Discord, Teléfono, Mail, Disponibilidad, Nivel de Confianza, Modalidad, Tipo de proyecto, Notas. Compartido como **Editor** con la cuenta de Google de n8n.

## 5. Workflows de n8n

| # | Nombre / ruta | Qué hace |
|---|---|---|
| 0 | Setup portada (manual, una vez) | Crea el template de portada como Google Slides nativo vía API (52 requests: fondo tinta, ojitos, `{{NOMBRE}}`, `{{CLIENTE}} · {{ANIO}}`, marcas +, wordmark). El nodo Resultado da el `portadaTemplateId` |
| 1 | Setup DB (manual, una vez) | Inicializa el sheet |
| 2 | `/webhook/team23/projects` | Lista proyectos + calendario (incluye `draft_json`) |
| 3 | `/webhook/team23/create` | Creación completa: unidad de Drive con subcarpetas, proyecto Frame.io con carpetas, templates copiados (desglose/brief/feedback/notas), categoría + canales privados de Discord, registro en el sheet, mails de propuesta a candidatos, **portada automática** (Slides → PNG 1600px → banner de la unidad de Drive + primer asset en Frame) y **rama borrador** (`body.modo === 'borrador'` → solo escribe la fila, cero automatizaciones). **Gates por bloque**: `¿Drive activo?` → `¿Frame activo?` → `¿Discord activo?` en cadena, cada uno con la regla "corre salvo que llegue `false`", más `¿Portada?` (pide Drive encendido + template válido), `¿Portada a Frame?` y `¿Aviso a Discord?` en la parte post-respuesta. `Armar registro` lee todos los nodos con accesores `try/catch` y omite del `links_json` lo que no se creó. `Armar propuestas` usa `body.mails` cuando llega (respeta el `enviar` de cada candidato y manda el HTML del hub tal cual) y solo arma el mail por su cuenta si no llega la lista |
| 4 | `/webhook/team23/update` | Actualiza campos (síntesis incluida), avisos de Discord por cambio de etapa, hitos al canal general del servidor, accesos automáticos a confirmados al activar y **propuestas por mail a demanda** (`¿Mandar propuestas?` → `Mail de propuesta`, tercera rama post-respuesta: solo corre si el body trae `mails`, así ningún update normal manda mail) |
| 5 | `/webhook/team23/calendar` | Guarda calendario + avisos (Discord y mail) |
| 6 | `/webhook/team23/parse` | Debrief con IA: guard anti-vacío → Claude (`claude-sonnet-4-6`) extrae el JSON del proyecto → limpieza. Prompt con reglas de timeline (nombres exactos de tareas, ventanas consolidadas, fechas YYYY-MM-DD, notas por tarea) y síntesis estructurada |
| 8 | `/webhook/team23/portal` | Portal de proveedores (login validado contra Supabase; **sin** header Team23 Key). `Filtrar por proveedor` **excluye los borradores** y devuelve los proyectos donde el mail figura sin estado o como `confirmado` (un `rechazado` o `inactivo` deja de verlos) con el **set completo de links** menos `desglose` |
| 9 | `/webhook/team23/delete` | Borra filas de Projects+Calendar (batchUpdate de abajo hacia arriba) + canales y categoría de Discord (hijos primero). NO borra Drive ni Frame a propósito |
| 12 | *(sin webhook — trigger programado)* | **Recordatorio del tracker de jornadas.** Lunes y viernes 09:00 (`0 9 * * 1,5`). Recorre los proyectos en curso y avisa en **un solo canal de coordinación** (`discordCoordId`, nunca en el canal de cada proyecto) cuáles no tienen jornadas cargadas en los últimos `ventanaDias` (7 por defecto). El tracker no guarda fecha de modificación, así que la señal de "actualizado" es la **jornada más reciente marcada** entre todos los participantes. Saltea los que todavía no arrancaron según el calendario. `estadosChequeados` (`activo,entregando`) y `avisarSiTodoAlDia` (mandar igual el recordatorio cuando no hay atrasados) son configurables |
| 11 | *(sin webhook — trigger programado)* | **Avance automático por calendario.** Corre todos los días a las 07:00: lee `Projects` y `Calendar`, y para cada proyecto en `activo` o `entregando` calcula la última fecha mirando **las dos fuentes** (`taskDates_json` + filas de `Calendar`, fases e hitos). Si ya pasó, llama a wf4 con `{id, status:'cierre'}`, así el aviso de Discord y la escritura al sheet salen por el camino de siempre y no hay lógica duplicada. `diasGracia` en CONFIG da margen (0 por defecto: vence al día siguiente del fin). Sin fechas cargadas no decide nada. Es idempotente: una vez en `cierre` ya no lo vuelve a tocar. El nodo HTTP va **sin retry** a propósito, porque un reintento duplicaría el aviso de Discord |
| 10 | `/webhook/team23/roster` | Directorio: listar/actualizar. Valida token de Supabase + rol interno server-side. Guard anti-pisadas por columna A |
| 99 | Limpiar Discord (manual, una vez) | Aspiradora de huérfanos: pegás IDs de categorías y borra hijos + categoría, con rate-limit |

### Credenciales de n8n

| Credencial | Tipo | Usada en |
|---|---|---|
| Team23 Key | Header Auth (`x-team23-key: coordHUBt23`) | Webhooks (menos wf8) |
| Google Sheets account | OAuth | Nodos de Sheets |
| Google Drive account | OAuth | Drive + portada (copiar/subir/mover/fondo) |
| Google Slides account | OAuth | Portada (título/primera página/thumbnail) y wf0 |
| Discord Bot | Header Auth (`Authorization: Bot TOKEN`, B mayúscula, un espacio) | Discord en wf3/4/5/9/99. El bot necesita Manage Channels + Send Messages + Manage Roles + **Server Members Intent** |
| Anthropic API Key | Header Auth (`x-api-key: sk-ant-...`) | wf6 (el nodo manda `anthropic-version` aparte) |
| Frame.io OAuth2 | OAuth2 genérico | Frame en wf3 |
| Gmail | OAuth | Mails en wf3, wf4 y wf5 (con `appendAttribution: false` para que no firme "sent with n8n") |

### CONFIG por workflow (se resetea al reimportar)

wf11 y wf12 no tienen webhook: son **triggers programados**, así que no alcanza con publicarlos, hay que **activarlos**. wf12 arranca con `discordCoordId` en placeholder y sin ese id no manda nada (lo deja anotado en el log).

Valores a recargar siempre: `dbSheetId`, `discordGuildId`, `discordGeneralId` (canal general del servidor, wf4), `rosterSheetId` (wf4/wf10), `frameAccountId`, `frameWorkspaceId`, `portadaTemplateId` (wf3), `discordViewerUserIds`/`discordViewerRoleIds` (wf3, recomendado rol t23-post).

En el JSON de wf2 del repo ya viene cargado `dbSheetId`, y en wf9 `discordGuildId`: eran los dos únicos placeholders de esos workflows, y wf2 sin sheet deja al hub mostrando caché viejo (ver más abajo). En el JSON de wf3 ya vienen cargados `discordGuildId` (`1137462471767097534`) y `portadaTemplateId` (`1tjQ4jKS404gHhGPm_skaQkUHLRm5u5N5CO4XoOjrso0`), así que reimportar ese workflow no los pierde. Siguen en placeholder `discordViewerUserIds` y `discordViewerRoleIds`: el nodo `Discord: permisos` los filtra con `/^\d{5,}$/`, así que el placeholder no rompe nada, pero hasta cargarlos los canales privados solo los ve el bot.

## 5 bis. Portal de proveedores — links visibles

El portal muestra dos bloques: **Carpetas de Drive** (unidad, 0. COORD, 1. SUPERVISION, 2. FOOTAGE, 3. RECURSOS, 4. EDITABLES, 5. FINALES) y **Documentos** (Brief, Feedback, Notas, Frame.io). Se dibuja solo lo que llegó, así un proyecto creado con Drive o Frame desactivados no muestra huecos, y cada bloque desaparece si queda vacío.

`desglose` queda **afuera a propósito** por si lleva presupuesto: para sumarlo hay que agregar la clave en el `reduce` de `Filtrar por proveedor` (wf8) y en `DOCS` de `proveedores.html`. Ojo que el acceso real lo gobierna Drive, no esta lista: si el proveedor tiene permiso sobre la unidad, puede navegar a cualquier documento de adentro igual.

## 6. Portadas automáticas

Template = **Google Slides** diseñable (creado por wf0, editable a gusto). Placeholders: `{{NOMBRE}}` (obligatorio), `{{CLIENTE}}`, `{{ANIO}}`. **Regla de composición: el título va en la franja horizontal central**, que es lo único visible en el banner de Drive (recorte `yCoordinate: 0.39` en el nodo "Portada: fondo de la unidad"; ajustable 0–1). El flujo: copiar template a PLANTILLAS de la unidad nueva → replaceAllText → thumbnail PNG 1600px → (a) fondo/tema de la unidad de Drive, (b) primer asset en Frame (`00 PORTADA — nombre.png`, requiere `media_type: 'image/png'` en la API v4). Frame v4 no tiene portada por API: la tarjeta se setea a mano ("Set as project cover" sobre el asset) o adopta el thumbnail sola. La cadena corre post-respuesta: si falla, el proyecto se crea igual (ver Executions).

## 7. Auth, dominio y verificación de Google

- **Supabase**: Site URL `https://hub.team23.online/login`, Redirect URLs con `https://hub.team23.online/*` (+ la de netlify.app). SMTP custom: smtp.gmail.com:465 con `coord@team23.online` y App Password. Plantilla de mail de confirmación con marca en `supabase/email-confirm-signup.html`.
- **DNS (GoDaddy, zona team23.online)**: CNAME `hub` → `team23hub.netlify.app`; TXT `subdomain-owner-verification` (verificación de Netlify). Raíz y `www` apuntan a Vercel (otro sitio); MX de Google intactos. Trampa histórica: espacios invisibles al pegar valores.
- **Verificación de marca Google OAuth** (para que el consentimiento diga "Team23 Hub" en vez del dominio de Supabase): nombre congelado **"Team23 Hub"** exacto en consola y en la home; homepage `https://hub.team23.online/` pública con propósito + tarjeta "Qué datos usa Team23 Hub y para qué"; privacy `https://hub.team23.online/privacidad`; dominio autorizado `team23.online` (Search Console). El panel "intento anterior" muestra el veredicto viejo hasta que termine la ronda nueva (días). **No subir logo hasta aprobar**. Si rebota con todo alineado → pedir revisión manual.

## 7 bis. Sobre la API key

`CONFIG.API_KEY` (`coordHUBt23`) está en el HTML que se descarga el navegador. No hay forma de esconderla ahí: ofuscarla, moverla a otro archivo o pasarla a base64 no cambia nada, porque el navegador necesita el valor en claro para mandar el header. Con esa key, cualquiera que abra `/productores` puede pegarle directo a los webhooks de wf2, wf3, wf4, wf5, wf9 y wf10 — leer todos los proyectos, crearlos, actualizarlos y borrarlos. También aparece en este mismo documento, que se sirve desde la raíz del sitio.

`SUPABASE_ANON_KEY` es otra cosa: está diseñada para vivir en el cliente. Lo que protege los datos ahí es Row Level Security en Supabase, no el secreto de la key.

Arreglo de fondo, cuando haya tiempo: **el patrón ya existe en el repo.** wf8 no usa header key — valida el JWT de Supabase contra `/auth/v1/user` en el nodo `Validar login`, y el frontend ya sabe pedir el token (`sb.auth.getSession()`). Portar ese nodo a los workflows de escritura y sacarles el header auth cambia "quien conozca la cadena" por "quien tenga sesión válida", que es lo que se quiere.

Mientras tanto, tres cosas baratas: rotar la key, bloquear que Netlify sirva los `.md` y la carpeta `n8n/`, y tener presente que hoy la superficie expuesta es esa.

## 7 ter. Mobile — lo que hay que saber antes de tocar el CSS

Un solo breakpoint: `@media(max-width:640px)`. Modales a pantalla completa (`min-height:100dvh`, sin bordes ni radio, con `env(safe-area-inset-*)`), inputs a 16px para que iOS no haga auto-zoom al enfocar.

Tres reglas que se rompen fácil:

0. **Todo `<button>` necesita `color` explícito.** En iOS Safari un botón sin `color` declarado usa el azul del sistema; en Chrome de escritorio usa `buttontext` (negro), así que el bug es invisible mientras se prueba en la compu. Pasó con `.modal .close`, `.icon-btn`, `.mini-btn`, `.status-opt`, `.task-pill`, `.cal-nav button` y `.dp-close`: todas las ✕ y las flechas del calendario se veían celestes en el teléfono.

1. **Todo contenedor con `overflow-x:auto` necesita `min-width:0`** si es hijo de un flex. Sin eso un flex item no encoge por debajo del ancho de su contenido, así que el scroll interno no se activa y en cambio empuja la fila: aparece scroll horizontal en toda la página. Pasó con `.tabbar`.
2. **Nada de `display:flex` con estilo inline en filas que tengan que reacomodarse en mobile.** El media query no puede pisar un `style=""`. La fila de acciones del header (`.tabacts`) estuvo así y era la causa del scroll horizontal.

**En grillas de pocas columnas, posicioná explícito.** `.assign-row` tiene cinco hijos (nombre, mail, ✕, discord, teléfono) y en mobile son dos columnas: dejar que la autoubicación decida mandaba Discord a la columna de 44px. Las cinco posiciones ahora son `grid-area` fijas. Si se agrega un campo a la fila, hay que sumarle su área o vuelve a desordenarse.

Los anchos grandes viven todos dentro de un contenedor con scroll y así tiene que seguir: `.cal-min` (520px en mobile, 660 en desktop) en `.cal-scroll`, `table.cal` (540px) en `.tbl-scroll`, `table.trk` y `.trk-resumen table` (440px) en su wrapper, `.dir-table` (1500px) en `.dir-wrap`. Si agregás algo ancho, va adentro de uno de esos o hace desbordar la página.

## 8. Trampas conocidas (leer antes de tocar nada)

1. **Reimportar un workflow resetea CONFIG a placeholders y desengancha credenciales.** Ritual: reimportar → credenciales → CONFIG completo → Publish.
2. **`{{ }}` literal dentro de expresiones de n8n las rompe** ("invalid syntax"): los placeholders van por concatenación: `'{'+'{NOMBRE}'+'}'`.
3. **IDs de Discord**: siempre con apóstrofo en el sheet, siempre limpiar al leer.
4. **Diagnóstico de webhooks**: "Failed to fetch" = ruta inexistente o sin Publish; HTTP 500/403 = el workflow existe pero falló → Executions.
5. **Deploy**: el sitio se deploya COMPLETO (design-system/ y assets/ incluidos). Un parche parcial que pise el repo mata la estética.
6. **El hub puede estar mostrando caché viejo.** Pinta desde `localStorage` (`t23_projects`) mientras llega lo fresco. Si el fetch a wf2 falla, lo que queda en pantalla es ese caché: el hub se ve normal pero le falta todo lo que cambió desde la última carga buena. Pasó con `dbSheetId` de wf2 en placeholder — el portal del proveedor leía bien y el hub no mostraba el proyecto. Ahora hay un banner persistente (`#staleBanner`) con la antigüedad del caché y un botón Reintentar, en vez del toast de 4 segundos. Chequeo rápido desde la consola: `localStorage.removeItem('t23_projects'); location.reload()` — si la lista queda vacía, wf2 está fallando.
7. **Pestañas viejas**: el hub es una SPA que queda abierta días; después de deployar, recargar las pestañas abiertas.
8. **Slides API**: los `objectId` necesitan mínimo 5 caracteres.
9. **Retry solo en operaciones idempotentes**; mensajes de Discord sin retry (duplica). Nodos que se multiplican por items → `executeOnce: true`.
10. **Nodos de Gmail nuevos** nacen con la firma de n8n activada: apagar "Append n8n Attribution".
11. **El template del mail de propuesta está en dos lugares**: `mailBuildHTML()` en `index.html` (lo que se ve y se manda) y el nodo `Armar propuestas` de wf3 (fallback para clientes viejos). Hoy generan HTML idéntico byte a byte cuando el mail no se editó; si tocás uno, tocá el otro.
12. **Los overrides de mail editados desde la ficha viven en `asignaciones_json`** (`mailIntro`, `mailSubject`, `mailHtml`, `mailSentAt` por persona). Un `mailHtml` completo son ~2 KB; con mucha gente y mucho HTML a mano la celda puede crecer (el límite de Sheets es 50.000 caracteres). Los overrides del armado no se arrastran al proyecto: ahí solo viaja `mailSentAt`.
13. La carpeta `n8n/` del repo se publica en Netlify (los JSONs son descargables). Riesgo bajo (los IDs no dan acceso), mejora opcional: repo privado aparte.

## 9. Pendientes conocidos

- Verificación de Google: esperando veredicto de la ronda con la landing (si rebota → revisión manual).
- Frame: portada de tarjeta manual por proyecto ("Set as project cover") hasta que la API v4 lo exponga.
- Sheet Projects: columna `draft_json` agregada a mano (requisito de borradores).
- Roster: faltan filas de Narf, Teo, Milena y Karla.
- De la reunión del 24/7: bugs de botones de confirmación e interfaz de sesiones (falta detalle), hub de mensajes, botón de cierre de tarea + última jornada (para administración/Carla), síntesis desplegable, links más accesibles, completar exportación PDF del calendario. **Hecho**: modal editable para mails antes de enviar e inhabilitar usuarios en proyectos (ver sección 3). Piloto: proyecto IPF, despliegue final apuntado a agosto.
- Ofertas abiertas de mejora: invitaciones automáticas de Discord a no-miembros, revocación de accesos, borradores con fecha visible, cadena Docs→PDF para adjuntar propuestas.

## 10. Contacto y cuentas

- Coordinación: `coord@team23.online` · Comercial: `biz@team23.online`
- Google Cloud project "Team23 Hub" (OAuth consent / Auth Platform)
- n8n: coordteam23.app.n8n.cloud · Netlify: team23hub · Supabase: muvmrkacjhygfuialpyn
