# Changelog

Resumen de los cambios mergeados hasta ahora en TEAM 23 Production Hub (panel + portal de proveedores).

## 2026-10-23 — Debrief (wf6): la IA responde con JSON garantizado

Tres intentos seguidos el 23/10 fallaron en `Limpiar JSON` con "La IA no devolvió JSON válido": la síntesis traía comillas sin escapar (`Campaña H2 "Futuro"`) y `JSON.parse` se rompía. El prompt pedía "SOLO JSON válido", pero eso es una súplica, no una garantía.

- `Claude: extraer datos` pasa a **structured outputs** (`output_config.format` con el schema de nombre/cliente/agencia/productora/director/síntesis/tareas/timeline/storyboard_url): la API valida el JSON antes de devolverlo. Modelo `claude-opus-5-5` (los structured outputs no corren en Sonnet 4.6, que es lo que estaba en vivo; el repo decía `claude-sonnet-5`), `max_tokens` 6000 (el modelo piensa siempre y eso cuenta), timeout 120 s, y `fallbacks: 'default'` por si un debrief dispara un rechazo de seguridad.
- `Limpiar JSON` avisa claro si la respuesta vino cortada (`max_tokens`) o rechazada (`refusal`), en vez de "JSON inválido".
- Probado en vivo con un debrief que repite el caso de las comillas: nombre, 3 tareas y timeline de 6 fases con notas, todo parseado. Deployado por API; nada que importar a mano.

## 2026-10-19 — n8n al día: wf17 activo, Admin reimportado, y el avance automático a cierre por fin funciona

Deployado por API directo en la instancia (`coordteam23.app.n8n.cloud`), nada quedó pendiente de importar a mano.

- **wf17 creado y activo** (`2P8UdQy521XKKLn6`), con `discordCoordId` = `#coordinacion-general` (`1473387046788923527`, el mismo canal de wf12) y las credenciales Google Sheets / Discord Bot. Primer aviso posible: mañana 10:00; los proyectos que ya estaban en cierre cuentan desde hoy.
- **wf13/14/15/16 reimportados** con la pestaña `Admin` (en vivo todavía decían `AdminTasks`). wf3 ya estaba igual al repo; wf4 recibió el `discordGuildId` que le faltaba en vivo (sin él, la rama de accesos de Discord rompía).
- **wf11 → wf4 nunca había funcionado.** Dos cosas: el nodo `Avanzar a cierre (wf4)` tenía enchufada la credencial *Discord Bot* en vez de *Team23 Key*, y desde el 14/9 wf4 exige sesión de Supabase, que un cron no tiene. No se notó porque el nodo tiene continue-on-error y `Decidir avances` casi nunca produce filas. Arreglo: wf11 manda el header `x-team23-internal` y wf4 tiene un IF `¿Llamada interna?` antes de `Validar login` que lo acepta. El valor vive **solo en n8n** (`CONFIG.internalSecret` de wf4 y wf11); en el repo va `PEGAR_SECRETO_INTERNO_SOLO_EN_N8N`, que el IF rechaza aunque coincida (pide ≥32 caracteres y que no empiece con `PEGAR`). Probado: con el secreto 200, con uno falso o sin header 401.
- **Inactivación al cierre en el avance automático: resuelta en wf11, no en wf4.** wf11 ya lee la hoja Projects, así que aplica la misma regla que `desactivarEquipoAlCierre()` del hub sobre `asignaciones_json` (inactivos, rechazados y candidatos no se tocan; guarda `estadoAntesDeCierre`) y lo manda en el mismo update. Hacerlo en wf4 habría sumado una lectura de Sheets a cada update del hub (toggles, tracker…) para cubrir un camino que solo usa wf11.

**Para que el sitio tome los pushes del 16/10** (presencia, cierre, alta unificada): el repo sigue privado, así que Netlify rechaza los builds por el límite de contribuyentes. Hay que hacerlo público (decisión de NETLIFY-CONTRIBUTOR-FIX.md) o reintentar a mano desde el dashboard.

## 2026-10-16 — Feedback del equipo: cierre de proyecto y volver de etapa

Salido de las notas de Mile (14/9), Eyal (17/8) y Teo (14/8).

- **Al pasar a Listo para cierre (o Completado), todo el equipo asignado queda inactivo** (`desactivarEquipoAlCierre()` en `setStatus`). Así deja de sumar en la Carga de trabajo del Status. Cada fila guarda `estadoAntesDeCierre` para restituirse si el proyecto se reabre; candidatos sin resolver, rechazados y quien ya estaba inactivo no se tocan. Se guarda en el mismo `update` del status, con rollback si falla. Ojo: lo hace el frontend, así que **el avance automático de wf11 (que llama a wf4 directo) no lo aplica** — ver pendientes.
- **Volver de etapa ya no pide tildar el checklist**: el checklist de la etapa actual solo frena *avanzar*. Retomar o reabrir un proyecto (Completado → Ejecutando, Listo para cierre → Entregando, etc.) es libre. Sigue sin poder volver a Pre-producción.
- **Nuevo `n8n/17-cierre-reminder.json`** (importar y ACTIVAR, cargar `discordCoordId` y el credential `Discord Bot`): todos los días 10:00 avisa en Discord de los proyectos que llevan +10 días en Listo para cierre (`diasUmbral`), y repite cada 7 (`repetirCadaDias`, 0 = una sola vez). Como el Sheet no guarda desde cuándo está en cierre, anota la fecha la primera vez que lo ve (static data de n8n); los que ya estén en cierre al activarlo cuentan desde ese día.

**Decidido:** no se hacen las fechas de ingreso/egreso por persona (Eyal "roles conectados a periodos", Teo #1; los rangos siguen siendo por tarea), ni la etapa extra "Re-ejecutando" (con volver de etapa libre alcanza), ni el reinicio del checklist al reabrir (si un proyecto vuelve a Entregando, el checklist queda como estaba).

**Pendiente:** llevar la inactivación al cierre a wf4, para cubrir también el cambio automático de wf11.

## 2026-10-16 — Piso de presencia: quién está en el hub y en qué anda

Los ojitos de la marca viven al pie de `index.html`, sobre la página misma (sin franja, fondo ni raya; no capturan clicks). Caminan de verdad por todo el ancho a velocidad constante y se reparten para no pisarse los globos: una pareja de ojos por persona conectada y un globo que dice dónde está (`viendo · PRESIDENTE`, `en las tareas · …`, `editando la síntesis · …`, `creando un proyecto`, `en Calendario`, `zzz` a los 3 min sin actividad, `en otra pestaña`). Cambió de actividad → saltito. Fijo abajo, sin colapsar.

- **Cómo funciona**: Supabase Realtime Presence sobre el canal privado `hub-presence`. Cada pestaña hace `track({n, v, p, s, idle, away, t})`; el estado se lee del DOM (qué overlay está `.open`) y de `currentView`/`detailProject`, así que no hay que avisar en cada lugar. Sin servidor ni workflow.
- **Para activarlo**: correr `supabase/presence-migration.sql` una vez (dos policies en `realtime.messages`, solo rol `interno`). Sin eso el canal rechaza la suscripción, el piso no aparece y nada más cambia.
- **Lo útil**: el Sheet es "el último que guarda pisa al otro". Si alguien más está en la misma ficha, su globo pasa a rojo (`· también acá`) y sale un toast una vez por persona y proyecto.
- Parpadean bajando el párpado (no aplastando el ojo); dormidos, el párpado queda a la mitad. Caminata y frenado sin saltos: la clase de paso se saca en el borde del ciclo, con los dos ojos apoyados.
- **Agarrar y soltar** (lo ven todos): se agarra a cualquiera con el mouse, cuelga del punto donde lo agarraste como un péndulo, mira para arriba con los ojos grandes; al soltarlo cae con gravedad, rebota, se aplasta, patina y se marea, y vuelve a caminar. Física en JS (RULES.md §4). A los demás les llegan dos broadcasts por agarrada (`grab` / `drop`): lo ven levantarse y colgar con el globo `¡lo agarró Eyal!` (o `¡te agarró …!` si sos vos) y caer con la velocidad del tiro. Si el que lo tiene se desconecta, se cae solo a los 12 s. La policy de `presence-migration.sql` ahora también habilita `broadcast`.
- Un personaje por **navegador**, no por cuenta: dos personas con la misma cuenta en dos computadoras aparecen como dos (con el mismo nombre) y se avisan si coinciden en una ficha; varias pestañas del mismo navegador cuentan como uno. Id en `localStorage` (`t23_browser`).
- Oculto en mobile (≤640px). Va debajo de los overlays: con un modal abierto se ve apagado detrás del scrim.

## 2026-10-13 — Un solo camino de alta, barra de candidato y pie de tarea alineado

### Alta de proyecto: se va la Opción 1 (kick off manual)

`+ NUEVO PROYECTO` abre directo el formulario desde debrief (IA). Se eliminaron el selector de opciones (`#ovChooser`), el wizard de planificación (`#ovKickOff`, `KICKOFF_QUESTIONS`) y el formulario manual (`#ovNew`, `createProject()` y todo el estado `np*`). `assignStore`, `taskDatesStore`, `autoStore` y `linksStore` ya no tienen rama `np`. Son ~330 líneas menos en `index.html`.

### Bloque de tarea (ficha y armado)

- **Una barra por candidato** (`.person-bar`): a la izquierda el estado y la decisión (Candidato · ✓ Confirmar · ✕ Rechazar), a la derecha la propuesta por mail, separadas por una raya. Antes eran dos filas de pastillas de 24px pegadas entre sí.
- **La propuesta por mail es un switch** (`.sw`) en los dos lados. En el armado arranca prendido y sale al crear. En la ficha arranca apagado y, prendido, sale con **Guardar cambios de equipo**: `saveTeam()` pregunta con nombres y manda `mails` en el mismo update (antes era un botón que mandaba al toque). Enviada, muestra `Propuesta enviada <fecha>` y un `↺ Reenviar` que existía en `mailSend()` pero no tenía botón.
- **Fechas y notas en dos columnas alineadas**: `.ab-foot` es una grilla con etiqueta arriba (INICIO · FIN · NOTAS). Sin nota, un botón punteado `+ agregar nota` de la misma altura que los inputs de fecha; con nota, la caja con ✎.
- Escala única para controles chicos: `.mini-btn` 30px (34 en mobile), `.chipst` 26px, `.mini-btn.ico` para ✎ / ↺.
- `.modal:focus{outline:none}`: el anillo de foco del navegador alrededor del modal entero (a11y.js enfoca el contenedor al abrirlo).

### Creación: sin `id` no se agrega

Si `/webhook/team23/create` responde sin `id` (wf3 cortado a mitad, p. ej. Frame.io con credencial vencida), el hub avisa en vez de agregar un proyecto fantasma que después devolvía HTTP 500 en cada edición. wf3 además saltea Frame si falla (`¿Frame creado?` / `¿Carpeta POST?`) y devuelve `avisos` que el hub muestra en el toast.

## 2026-09-14 — Auditoría: login validado en n8n, config compartida, admin arreglado

### Seguridad: n8n valida la sesión de Supabase en cada webhook

Hasta hoy los webhooks de proyectos (`projects`, `create`, `update`, `calendar`, `parse`, `delete`) solo pedían el header `x-team23-key`, que está en el HTML público: cualquiera que viera el código fuente podía listar, editar o borrar proyectos sin loguearse. Ahora `index.html` y `admin.html` mandan `Authorization: Bearer <JWT>` en cada llamada (`authHeader()` en `api()`), y los workflows 2, 3, 4, 5, 6 y 9 tienen la misma cadena que ya usaba el 10 (roster): `Validar login` → `¿Login válido?` (401) → `Leer rol` → `¿Es interno?` (403). El token se lee del header, no del body. **Hay que reimportar esos seis workflows en n8n** para que aplique.

### `/admin` funcional: workflow 13 + pestaña Admin

`admin.html` llamaba a `/webhook/team23/admin-tasks`, que no existía en n8n. Nuevo `n8n/13-admin-tasks.json` (lee la pestaña **Admin** del Sheet, valida login + lista de mails admin) y `n8n/seed-admin.csv` con las 237 filas del seguimiento original para poblar la pestaña. Ver README → "Admin".

### Bugs en `admin.html`

- El filtro de estado comparaba un `Set` con `"all"`: todos los grupos quedaban abiertos y el toggle no cerraba.
- Si fallaba la conexión con Supabase la página se mostraba igual. Ahora bloquea con el mismo aviso que `index.html`.

### Config compartida

`design-system/config.js` reemplaza los cuatro bloques `CONFIG` copiados en `index`, `admin`, `login` y `proveedores`. Cambiar host, clave o proyecto de Supabase es un solo archivo.

### Docs y pendientes viejos

- README: la página vive en Netlify (`hub.team23.online`), no en Cloudflare; n8n es `coordteam23.app.n8n.cloud`; sección nueva para Admin; párrafo de seguridad reescrito.
- `privacidad.html`: `font-weight:900` / `letter-spacing:-0.5px` pasados a tokens (pendiente desde el 08-07).

## 2026-09-02 — Sección ADMIN

Nueva `admin.html` en `/admin` (ruta agregada en `_redirects`): seguimiento interno del estudio por pilar (Operativa / Ejecutiva / Crecimiento), grupos colapsables, filtro de estado multi-selección, filtro por responsable con alias por persona (`RESP_ALIAS`: "Kr", "Krl", "Krla" → Karla). Acceso restringido a una lista fija de mails (`ADMIN_MAILS`), no a todo rol interno.

## 2026-08-07 — Colores fijos por tarea, tabla de Fases colapsable, y tipografía del wordmark

### Pills de tareas: color fijo por tarea, no más rojo genérico

Antes, al seleccionar una tarea (VFX, Color, IA, etc.) el pill se pintaba siempre de rojo, sin distinguir cuál era cuál. Ahora cada tarea tiene un color fijo propio (reutilizando la paleta que ya usa el calendario), consistente en los 4 lugares donde aparecen: alta manual de proyecto, ficha editable, ficha de solo lectura y alta por debrief con IA. Nueva función `taskColor(t)` en `index.html`.

### Tabla de Fases (Fase/Inicio/Fin/Notas), ahora colapsable

En proyectos grandes (caso real: Nissan) esa tabla dentro de "Calendario" podía ocupar muchísimo espacio. Ahora arranca colapsada, con el mismo toggle circular que ya usan "Tareas TEAM 23" y "Calendario" — es un colapsable anidado, independiente del de "Calendario" (podés tener Calendario abierto y Fases cerrado, o viceversa).

### Wordmark "TEAM 23" en el login: tipografía alineada al resto del hub

`login.html` e `index.html` (pantalla de bloqueo `#authGate`) tenían el wordmark con `font-weight:900` y `letter-spacing:-0.5px` hardcodeados — no coincidía con el resto del sistema, que usa los tokens `var(--weight-bold)` / `var(--tracking-tight)`. Ya alineado en ambos.

**Pendiente, no tocado todavía**: `privacidad.html` tiene el mismo patrón de `font-weight:900` hardcodeado en 3 lugares (`.pv-head .mark`, `h1`, `h2`) — mismo fix, lo dejamos para la próxima tanda.

## 2026-07-28 — Sesión grande de Eyal: estados de gente, mails de propuesta, mobile, workflows 11/12

Consolidado tal cual lo documentó Eyal, agrupado por área en lugar de por orden cronológico.

**Archivos tocados:** `index.html` · `proveedores.html` · `n8n/2` `n8n/3` `n8n/4` `n8n/8` `n8n/9` · **nuevos:** `n8n/11-auto-advance.json` `n8n/12-tracker-reminder.json`

**Requieren reimportar en n8n:** 2, 3, 4, 8, 9 · **requieren importar y ACTIVAR:** 11, 12

---

## 1. Workflows nuevos

### wf11 — Avance automático por calendario
`Cada día 07:00 → CONFIG → Leer Projects → Leer Calendar → Decidir avances → Avanzar a cierre (wf4) → Resumen`

Reemplaza el chequeo que corría en el navegador (`autoAdvanceOverdue`), que tenía tres problemas: solo corría si alguien abría el hub, se duplicaba entre pestañas y dispositivos (un aviso de Discord por cada una), y **solo miraba `p.calendario`**, así que un proyecto con las fechas cargadas únicamente en las tareas nunca avanzaba.

- Mira las **dos** fuentes de fechas: `taskDates_json` + filas de la hoja `Calendar`.
- Llama a wf4 con `{id, status:'cierre'}` en vez de escribir el sheet y postear por su cuenta: así el aviso de Discord se sigue armando en un solo lugar.
- `diasGracia` configurable (0 por defecto). Sin fechas cargadas no decide nada y lo deja en el log.
- Idempotente: una vez en `cierre` no lo vuelve a tocar. Sin retry (un reintento duplicaría el aviso).
- Solo avanza `activo` y `entregando` → `cierre`. No activa proyectos ni los da por completados.
- `autoAdvanceOverdue()` se eliminó del frontend, de sus **dos** puntos de llamada. `projectEndDate()` se queda porque la vista semanal la usa.

Probado contra 13 casos: fechas en tareas, hito futuro que frena el avance, estados que no se tocan, JSON corrupto, borde exacto del día, `diasGracia`, e idempotencia en la segunda corrida.

### wf12 — Recordatorio del tracker de jornadas
`Lunes y viernes 09:00 (0 9 * * 1,5) → … → Discord: recordatorio`

Un solo mensaje al canal de coordinación con los proyectos que tienen el tracker atrasado.

- El tracker no guarda fecha de modificación, así que la señal de "actualizado" es la **jornada más reciente marcada entre todos los participantes**. Si alguien cargó la semana entera el viernes, el proyecto está al día.
- Saltea los proyectos que todavía no arrancaron según el calendario.
- Configurables: `ventanaDias` (7), `estadosChequeados` (`activo,entregando`), `avisarSiTodoAlDia`, `discordCoordId`.
- Sin `discordCoordId` no manda nada y lo anota en el log en vez de fallar.

---

## 2. Automatizaciones al crear un proyecto (wf3)

- **Los tres bloques que dispara wf3 ahora se pueden apagar de a uno** desde el armado: unidad de Drive, proyecto de Frame.io y canales de Discord. Flags `auto_drive` / `auto_frame` / `auto_discord`, leídos como "encendido salvo que llegue false", así que un cliente viejo o un borrador guardado antes sigue creando todo.
- Seis nodos IF nuevos en wf3 y `Armar registro` reescrito con accesores tolerantes: si un bloque no corrió, el registro se arma igual en vez de romper.
- La portada viaja pegada a Drive: sin unidad no hay dónde ponerla.

---

## 3. Propuestas por mail a candidatos

- **Interruptor por candidato** en el armado y **popup de edición** (`ovMail`) con asunto, apertura personalizada, override de HTML completo y vista previa en vivo en un iframe.
- El template vive en **dos lugares** que tienen que quedar idénticos: `mailBuildHTML()` en el frontend y el nodo de wf3. Si tocás uno, tocá el otro.
- **wf4 sumó una rama de propuestas** (`¿Mandar propuestas?` → `Mail de propuesta`) para poder invitar gente con el proyecto ya en marcha. Solo dispara cuando el body trae `mails`.
- El bloque de propuesta aparece **solo** si la persona está en `candidato` y todavía no la recibió. Con la propuesta enviada, o si ya está confirmada / activa / inactiva, desaparece: no hay reenvío desde la fila.
- La fecha del envío no se pierde: pasa al chip de estado (`✉ enviada 24/07 18:30`) mientras el candidato siga sin contestar.
- Quien se agrega desde la ficha nace con `estado: candidato` — sin eso quedaba como "activo" y no se le podía proponer, que era justo el caso de sumar gente en marcha.

---

## 4. Zona TAREAS TEAM 23 (la que más cambió)

### Estados de la gente
- Máquina de estados completa: `candidato` → `confirmado` / `rechazado`, y `activo` / `inactivo` con el proyecto en marcha.
- En pre-producción los rechazados se colapsan a una línea; en curso se ocultan.
- La ✕ de borrar fila quedó solo en las filas vacías: para sacar a alguien con datos hay que rechazarlo o desactivarlo, que deja rastro.

### Menos ruido visual
- **Quien ya está en el equipo se muestra en una línea, no en cuatro cajas.** Confirmados, gente del alta manual e inactivos pasan a una `.team-line` con nombre, contacto en gris, un **✎** que abre `ovPersona`, y los chips de estado al lado. El candidato pendiente conserva el formulario, porque ahí todavía se cargan los datos.
- `stateInner()`: los chips y botones se separaron de su contenedor para poder usarse en línea o debajo del formulario.

### Reestructura visual
- **La fila pasó a grilla de tres columnas** (nombre · contacto · controles). Antes era flex con `flex:1` en el contacto, que abría un hueco muerto de medio ancho cuando el nombre y el mail eran cortos.
- **Encabezado con resumen**: nombre de la tarea, cuánta gente y el **rango de fechas legible** (`16 jul → 23 jul`). Se entiende la tarea sin leer los inputs.
- **Las fechas dejaron de ser full width**: dos inputs de 158px en el pie del bloque.
- **Notas vacías = una línea** en vez de una caja alta que decía "Sin notas para esta tarea".
- **Cada tarea es una tarjeta cerrada** con banda gris en el encabezado. Sin eso los bloques se leían como un flujo continuo: la caja de notas de una tarea quedaba pegada al encabezado de la siguiente.
- El **listado de solo lectura** usaba una estructura vieja con `.ttl`; pasó a la misma tarjeta, así las dos vistas se ven iguales.
- Las tres instancias (ficha, alta manual, debrief) comparten `assignBlockHTML`, verificado.
- En el armado, una tarea recién elegida ya no dice `sin fechas` en rojo: ahí todavía no las cargaste.

### Ventanas donde se puede editar
- **Entregando volvió a ser editable.** `lockTareas` era `lockFields || status==="entregando"`; ahora es solo `lockFields`. Se puede sumar, activar y desactivar gente durante la entrega. **Listo para cierre** y **Completado** son los únicos congelados.

---

## 5. Equipo interno

- **Editable en todas las etapas.** Mile había agregado `lockMeta` (`ro || status!=="por_activarse"`), que gobernaba a la vez los datos del proyecto y el equipo interno: el ✎ solo aparecía en Pre-producción. Ahora tiene su propio `lockInterno = ro`, así que se puede cambiar de EP, productor o coordinador en cualquier momento. Solo la vista de solo lectura lo congela.
- Los tres roles **en la misma fila**, con un único botón `✎ editar` que abre `ovInterno` con los seis campos juntos.
- **Nombres con autocompletado filtrado por rol**, en el popup y en los **seis** campos de los dos formularios de creación:
  - **Productor** y **Coordinador** filtran por la columna `especialidad` del Directorio, insensible a acentos, con forma femenina (`Productora` entra) y multivalor (`coordinacion de post` entra). Al Productor se le excluye `ejecutivo`.
  - **Productor Ejecutivo** sale de una lista fija en el código (Narf, Mile, Teo): el Directorio es el spreadsheet de proveedores y los EP no están ahí.
  - Si alguien está en las dos fuentes queda **una sola entrada fusionada**.
  - Al elegir completa mail, Discord y teléfono **solo si están vacíos**.

---

## 6. Síntesis y notas

- **Síntesis colapsable** (`sxBoxHTML`) en los tres contextos, **arrancando colapsada** y con la primera línea como preview. Se edita **siempre en el popup** `ovSintesis`, con textarea grande y **vista previa en vivo del formato** (los subtítulos y viñetas antes había que adivinarlos escribiendo a ciegas).
- En el alta manual la síntesis del kick off **era invisible**: se cargaba en el wizard y el formulario no la mostraba. Ahora se ve y se edita.
- **Notas de tarea legibles.** Eran un input de una línea; ahora el bloque muestra el texto completo con saltos de línea y se edita en `ovNota`. En la tabla del calendario la celda pasó a preview de dos líneas, clickeable, con el texto entero en el tooltip. Tres puntos de entrada al mismo dato.

---

## 7. Tracker de jornadas

- **El activo/inactivo se sincronizó con la ficha.** El tracker tenía su propio `t.inactivos` en `tracker_json`, sin relación con el estado de la persona. Ahora, para la gente asignada, la fuente es `r.estado` en `asignaciones_json`, vía un `ref:{tarea,i}`.
- **Bug encontrado**: `trackerParticipants` filtraba con `r.estado!=="confirmado"`, así que alguien desactivado en la ficha **desaparecía del cuadro** y con él las jornadas que ya tenía cargadas. Ahora aparece grisado.
- **Botón "Finalizó"** por persona: popup que propone hoy, muestra las jornadas cargadas y ofrece un atajo a la última jornada marcada. **Cierra el conteo**: la grilla no acepta marcar ni desmarcar y las celdas se ven rayadas.
- **Botón "↺ Reactivar"** con su propio popup de reconfirmación. Reabre el conteo sin tocar las jornadas ya cargadas.
- El resumen sumó la columna **Finalizó** y avisa en rojo si la fecha no coincide con la última jornada.
- **Seam listo para el aviso a administración**: la llamada incluye `finalizacion` o `reactivacion` con todos los datos. Viajan inertes hasta que exista la rama que los lea.

---

## 8. Portal de proveedores

- **De 2 links visibles a 11**, en dos bloques: *Carpetas de Drive* (unidad + las seis numeradas) y *Documentos* (Brief, Feedback, Notas, Frame.io). La causa era del backend: wf8 recortaba el `links_json` a tres claves.
- **Bug cruzado**: wf8 mandaba `notas` y el portal buscaba `feedback`. El link de notas llegaba y no se dibujaba nunca; el de feedback se dibujaba y nunca llegaba.
- **Los borradores le llegaban al proveedor como proyectos normales**, con links y calendario. Un borrador es un plan interno sin confirmar: ahora se excluyen.
- `desglose` queda afuera a propósito por si lleva presupuesto. (El acceso real lo gobierna Drive, no esta lista.)
- Efecto secundario útil: desactivar a alguien en la ficha le saca el acceso al portal automáticamente.

---

## 9. Consistencia entre el hub y el portal

Tres causas de que un proyecto se viera en un lado y no en el otro:

1. **Los dos backends tenían distinto default para un status vacío**: wf2 lo leía `por_activarse` y wf8 `activo`. La misma fila se veía en Pre-producción en el hub y como **Activo** en el portal.
2. **Un status desconocido dejaba al proyecto invisible en el hub.** La vista Proyectos tiene tres baldes y un valor fuera de la lista no caía en ninguno, mientras el portal lo mostraba igual. Ahora `statusRaro()` lo manda a Pre-producción con una píldora roja **estado desconocido: X**.
3. **El hub mostraba caché viejo sin avisar.** Pinta desde `localStorage` mientras llega lo fresco; si el fetch falla, lo que queda en pantalla es el caché y el único aviso era un toast de 4 segundos. Ahora hay un banner persistente con la antigüedad del caché y un botón Reintentar. *Esta fue la causa real del "está en el portal pero no en el hub": `dbSheetId` de wf2 estaba en placeholder.*

Y para que no vuelva: **`dbSheetId` cargado en el JSON de wf2** y `discordGuildId` en el de wf9. Eran los únicos placeholders de esos workflows, así que reimportarlos reintroducía el bug cada vez.

---

## 10. Guardas de cambios sin guardar

- **`n2Dirty()` solo miraba tres campos** (debrief, nombre, tareas). Cargabas el equipo interno, la productora, el director, la síntesis o una fecha, cerrabas, y se perdía sin preguntar. Ahora `hayAlgoCargado()` recorre todos los campos, las tareas, las asignaciones y las fechas.
- **El alta manual no tenía guarda en absoluto.** La ✕, Cancelar y el click afuera llamaban a `closeModal('ovNew')` directo. Ahora pasa por `closeNew()`, y también cuenta lo que trajo el kick off (resumen y links), que si cerrás hay que rehacer.
- No cuentan: una fila de persona vacía, ni el acto de revelar el formulario con "cargar a mano". Todo lo que se escribe sí cuenta.
- Un borrador que ya existe sigue preguntando solo si cambió algo desde que se abrió.
- **Diálogo de cerrar borrador reescrito**: dejó de hablar de eliminar (`Seguir editando` / `No guardar` / `Guardar cambios`), y el de cerrar sin crear dice `Cerrar sin guardar` en vez de `Cerrar igual`.
- **Eliminar borrador** sumó loader (que además bloquea la pantalla), guarda contra doble click, y recuperación si el backend falla.
- **`ovConfirm` reordenado**: tres botones full-size no entran en 480px y wrapeaban torcidos. Ahora se apilan y van ordenados por riesgo, con el destructivo último y separado.

---

## 11. Mobile

- **El scroll horizontal de toda la página era el header**: la fila de acciones era `display:flex` **inline**, sin wrap, con `margin-left:auto` y `#btnNew` a `width:100%` adentro. Pasó a la clase `.tabacts` y en mobile cada grupo toma su propio renglón.
- **Todos los `<button>` sin `color` declarado se veían celestes en iOS** (el azul del sistema). En Chrome de escritorio se ven negros, así que probando en la compu era invisible. Faltaba en siete clases, en los dos HTML.
- **El calendario del proyecto estaba apretado porque el media query desactivaba su propio scroll**: forzaba 7 columnas en 360px, con las barras de fase reducidas a tiritas de 12px y `font-size:0`. Ahora scrollea de costado y las barras recuperan etiqueta.
- **La tabla de fases se pisaba a sí misma**: con `min-width:540px` y los inputs de fecha a 16px (obligatorio para que iOS no haga auto-zoom), las seis columnas no entraban. Ahora 700px con anchos fijos.
- **El campo Discord caía en la columna de 44px** de `.assign-row` (autoubicación de grilla), quedando una cajita con el texto cortado. Las cinco posiciones ahora son explícitas.
- La tabla del tracker se aplastaba en vez de scrollear; las tabs wrapeaban a dos filas en un header sticky; `.glabel` con texto de ayuda largo quedaba ilegible; objetivos táctiles de 1 a 4px pasaron a 26–36px; `env(safe-area-inset-*)` en la ✕ de los modales.
- Auditados los tokens CSS: ninguno sin definir (después de que se me colara un `--space-6` inexistente, que invalida la declaración entera en silencio).

---

## 12. Otros bugs encontrados de paso

- **Carga de trabajo mostraba a la misma persona dos veces** (`Narf (3 proyectos)` y `Narf (1 proyecto)`): `computeLoad` armaba dos diccionarios separados y los concatenaba. Ahora es una entrada por persona, contada en proyectos, con cruce de nombre y mail, insensible a mayúsculas y acentos, y sin contar rechazados ni inactivos. Dos personas distintas con el mismo nombre siguen separadas y se muestran con el mail.
- **Los tags se salían del recuadro** de la tarjeta de proyecto: el contenedor tenía `flex:none`, que no encoge nunca, así que el `flex-wrap` nunca llegaba a actuar.
- **Trampa documentada**: la ficha marca `detailDirty` con los listeners `input`/`change` de sus propios campos. Editando desde un popup esos eventos no ocurren, así que hay que prender la bandera a mano — o el cambio se pierde en silencio. Aplica a notas, síntesis, persona y equipo interno.

---

## 13. Diagnósticos sin cambio de código

- **HTTP 403 en el portal**: seguí los tres caminos internos de wf8 y solo puede devolver 200 o 401, así que el 403 venía de la capa de webhook de n8n (autenticación de header activada).
- **Mensajes de Discord repetidos**: descarté `api()` sin retry, `setStatus` con guarda, ninguna otra función mandando `status`, `retryOnFail` apagado en los nodos que postean, sin aristas duplicadas en el grafo y los code nodes en `runOnceForAllItems`. Quedaba wf4 ejecutándose de más — resuelto de tu lado.
- **La API key `coordHUBt23` está en `index.html`**, que Netlify sirve como archivo estático: se lee con ver-código-fuente, y con ella se puede pegar directo a wf2/3/4/5/9/10. No se puede esconder en el cliente. El arreglo de fondo ya existe en el repo: wf8 valida el JWT de Supabase en vez de usar header key.

---

## Pendientes

| # | Qué | Dónde |
|---|-----|-------|
| 1 | Completar los mails de Narf, Mile y Teo | `PER_ROLES.ep.fijos` en `index.html` |
| 2 | Cargar `discordCoordId` | CONFIG de wf12 |
| 3 | Rama de aviso a administración que lea `finalizacion` / `reactivacion` | wf4 |
| 4 | `discordGeneralId` | CONFIG de wf4 |
| 5 | `discordViewerUserIds` / `discordViewerRoleIds` | CONFIG de wf3 |
| 6 | `toggleChk` es optimista **sin rollback**: un tilde que no llega al sheet queda mostrado igual, y los checklists bloquean el avance de etapa | `index.html` |
| 7 | Rotar la API key y bloquear que Netlify sirva los `.md` y la carpeta `n8n/` | Netlify |
| 8 | Migrar los workflows de escritura a validación por JWT de Supabase | wf2/3/4/5/9/10 |

## A decisión tuya

- **Los datos del proyecto** (nombre, cliente, agencia, productora, director) siguen editables solo en Pre-producción, como los dejó Mile en `lockMeta`. Si querés el mismo tratamiento que el equipo interno, es una línea.
- **Tres tarjetas con borde de 2px negro apiladas** son bastante tinta. Alternativas: borde de 1.5px gris dejando solo la banda como separador, o sin borde y solo la banda.
- **"Finalizó" no cambia el activo/inactivo**: son el ciclo de vida del conteo, no del vínculo con el proyecto. Se pueden acoplar si preferís.
- **El equipo interno quedó editable también en cierre y completado.** Si preferís congelarlo al completar, es una palabra.

## Faltan en el repo

- **`TEAM23-HUB-documentacion.md`** no está en la versión de Mile. Ahí vivían las trampas conocidas, las reglas de mobile, la sección de la API key y la tabla de workflows.
- **`n8n/11-auto-advance.json` y `n8n/12-tracker-reminder.json`** tampoco están en `n8n/`.
- El **`CHANGELOG.md`** de la versión de Mile perdió 21 entradas de esta sesión (todo lo anterior al merge). Este documento las recupera.

---


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
