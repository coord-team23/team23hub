# TEAM 23 Production Hub — sesión del 28/07/2026

Consolidado de todo lo hecho en la sesión, agrupado por área en lugar de por orden cronológico.
Al final están los pendientes y las cosas que quedaron a decisión tuya.

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
