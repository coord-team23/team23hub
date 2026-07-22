# Discord por proyecto: canales automáticos y avisos importantes

> Actualización de los workflows 1, 3, 4 y 5 + `index.html`. Reemplaza al workflow 7 (que quedaba en un solo canal fijo y avisaba cada tilde de checklist).

---

## 1. Qué agrega

- **Al crear un proyecto** (workflow 3): el bot crea en Discord una **categoría** con el nombre del proyecto y adentro los canales de texto:
  - `nombre-prod`, `nombre-coord` y `nombre-general` (siempre)
  - `nombre-online`, `nombre-vfx`, `nombre-color` solo si el proyecto tiene esas tareas seleccionadas en el hub
  - Publica un **aviso inicial** en el `#-general` del proyecto con cliente, agencia y los links de Drive y Frame.io
  - La categoría y sus canales nacen **privados**: @everyone no los ve; solo los usuarios y/o roles listados en el CONFIG (más el bot, que se autoriza solo, y los administradores del servidor, que ven todo siempre)
- **Cambio de etapa** (workflow 4): aviso en el `#-general` del proyecto (Ejecutando, Entregando, Listo para cierre, Completado).
- **Hitos en el canal general** (workflow 4): esos mismos cambios de etapa se publican también en un canal general del servidor, con mínima info de fechas: rango del proyecto (primera fase a última) y el próximo hito del calendario. Pre-producción no se publica ahí.
- **Cambio de calendario** (workflow 5): aviso en el `#-general` del proyecto con fases e hitos.
- **Se eliminan** los avisos por cada tilde de checklist (frontend actualizado). El workflow 7 queda obsoleto: despublicarlo o borrarlo en n8n.

Qué tarea crea qué canal se define en el nodo **"Discord: armar canales"** del workflow 3 (constante `MAPA`). Hoy: Online, VFX y Color. Agregar una línea ahí para sumar más (por ejemplo `'3D/CGI': '3d'`).

---

## 2. Por qué un bot y no un webhook

Los webhooks de Discord solo publican mensajes en el canal donde nacieron. **No pueden crear categorías ni canales.** Para eso hace falta un bot con permiso Manage Channels. El mismo bot publica los avisos, así que el webhook viejo del workflow 7 ya no se usa.

---

## 3. Crear el bot (una sola vez)

1. Ir a `https://discord.com/developers/applications` con la cuenta que administra el servidor de Team23. **New Application**, nombre: `Team23 Hub`.
2. Menú **Bot**: botón **Reset Token**, copiar el token (se muestra una sola vez). Es un secreto de verdad: quien lo tenga controla el bot. Vive solo en la credencial de n8n, nunca en el repo ni en el frontend.
3. En la misma pantalla, apagar **Public Bot** (así solo vos podés invitarlo). No hace falta ningún Privileged Intent.
4. Menú **OAuth2 → URL Generator**: scope `bot`; permisos: **View Channels**, **Send Messages**, **Manage Channels**. Abrir la URL generada, elegir el servidor de Team23, autorizar.
5. Opcional: ponerle los ojitos googly de avatar en General Information.

## 4. ID del servidor (guild)

En Discord: Ajustes de usuario → Avanzado → **Modo desarrollador** ON. Click derecho sobre el nombre del servidor → **Copiar ID del servidor**. Ese número va al CONFIG del workflow 3 (`discordGuildId`).

## 4 bis. Quiénes ven los canales de cada proyecto

Con el Modo desarrollador activado:

- **ID de un usuario**: click derecho sobre la persona → Copiar ID de usuario.
- **ID de un rol**: Ajustes del servidor → Roles → menú de tres puntos del rol → Copiar ID del rol.

Van al CONFIG del workflow 3, separados por coma si son varios: `discordViewerUserIds` y/o `discordViewerRoleIds`. Cualquiera de los dos puede quedar vacío.

**Recomendado**: crear un rol (por ejemplo `t23-post`) y poner solo ese ID en `discordViewerRoleIds`. Sumar o sacar gente pasa a ser asignar el rol en Discord, sin tocar n8n. Los IDs de usuarios sueltos sirven para excepciones puntuales.

Ojo: esto aplica a los proyectos que se creen de acá en adelante. Categorías ya creadas se ajustan a mano (click derecho a la categoría → Editar categoría → Permisos, y después sincronizar los canales).

## 5. Credencial en n8n

Credentials → nueva **Header Auth**:

| Campo | Valor |
|---|---|
| Nombre de la credencial | `Discord Bot` |
| Name | `Authorization` |
| Value | `Bot PEGAR_EL_TOKEN` (la palabra Bot, un espacio, y el token) |

## 6. Columnas nuevas en el sheet (antes de importar)

En la pestaña **Projects**, al final de la fila 1, agregar dos encabezados:

- `discord_category_id`
- `discord_avisos_id`

Si todavía no están `tratamiento_url` y `tracker_json` (pendiente viejo), agregarlas también, antes de estas dos. **Sin estas columnas, la creación de proyectos falla al guardar la fila.** El `1-setup-db.json` de esta carpeta ya trae los 4 encabezados para instalaciones desde cero.

## 7. Importar los workflows

Reemplazar 3, 4 y 5 en n8n con los de esta carpeta. La trampa de siempre: **al importar, el CONFIG vuelve a placeholders y las credenciales quedan en REEMPLAZAR.**

- **Workflow 3**: CONFIG → recargar todos los IDs de siempre + `discordGuildId` (paso 4) + `discordViewerUserIds` / `discordViewerRoleIds` (paso 4 bis). Credenciales: Team23 Key (Webhook), Google Drive/Sheets, Frame.io OAuth2, Gmail, y `Discord Bot` en los 4 nodos de Discord: "Discord: Quién soy", "Discord: Crear categoría", "Discord: Crear canales" y "Discord: Aviso inicial".
- **Workflow 4**: CONFIG → `dbSheetId` + `discordGeneralId` (el ID del canal general: click derecho al canal → Copiar ID; si se deja el placeholder, simplemente no publica ahí). Credenciales: Team23 Key, Google Sheets en "Actualizar en DB", **"Leer Projects" y "Leer Calendario"**, `Discord Bot` en "Discord: avisar etapa".
- **Workflow 5**: CONFIG → `dbSheetId`. Credenciales: Team23 Key, Google Sheets en los nodos de sheet (incluido el nuevo "Leer Projects"), Gmail, `Discord Bot` en "Discord: avisar calendario".
- **Publish** en los tres.
- **Workflow 7**: despublicar o borrar.

## 8. Frontend

Subir el `index.html` de esta carpeta al repo (se quitaron los avisos por checklist y la función `notifyDiscord`). Netlify redeploya solo.

---

## Accesos automáticos para el equipo confirmado (workflow 4)

Cuando un proyecto pasa a **Ejecutando (activo)**, el bot le da acceso en Discord a cada persona **confirmada** en las asignaciones (los agregados directos sin estado de candidato cuentan como confirmados, igual que en el portal):

- **`#proyecto-general`**: ver y escribir (todos los confirmados).
- **La categoría**: solo ver, para que los canales les aparezcan agrupados.
- **Su canal de tarea** si existe (Online → `-online`, VFX → `-vfx`, Color → `-color`): ver y escribir. El mapa tarea → canal es espejo del workflow 3: si agregás canales ahí, replicalo en el nodo "Armar accesos" del 4.
- **`-prod` y `-coord` siguen siendo internos**: nadie del equipo confirmado recibe acceso ahí.

También corre cuando se guarda el equipo o se confirma un candidato **con el proyecto ya en marcha** (activo, entregando o cierre), así los que se suman tarde no quedan afuera. Dar el mismo acceso dos veces no rompe nada.

**De dónde sale el tag de Discord de cada persona**: primero del campo Discord de la asignación (el que autocompleta el hub); si está vacío, del roster (columna Discord, matcheando por nombre). El tag se normaliza (minúsculas, sin @, sin caracteres raros) y se compara contra los miembros del servidor.

**Al activar**, el bot publica un resumen en el `-general` del proyecto: quiénes recibieron acceso, quiénes no están en el servidor o su tag no coincide, y quiénes no tienen tag cargado. Los guardados de equipo posteriores dan accesos en silencio (sin resumen, para no hacer ruido).

### Requisitos nuevos en Discord (una sola vez)

1. **SERVER MEMBERS INTENT**: Developer Portal → tu app → Bot → Privileged Gateway Intents → activar **Server Members Intent** y guardar. Sin esto, el bot no puede listar los miembros del servidor y la rama falla con 403.
2. **Permiso Gestionar roles (Manage Roles)**: dárselo al rol del bot en Ajustes del servidor → Roles. Es lo que Discord exige para editar permisos de un canal. (Antes era opcional, ahora es obligatorio.)

### Requisitos en n8n

Al reimportar el workflow 4: CONFIG suma `rosterSheetId` (ya viene cargado con el sheet de proveedores). Credenciales: Google Sheets también en "Projects (accesos)", "Roster: metadata" y "Roster: leer"; `Discord Bot` también en "Discord: canales del guild", "Discord: miembros", "Discord: dar acceso" y "Discord: avisar accesos". Publish.

### Cosas para saber

- **La persona tiene que estar en el servidor de Discord** para recibir acceso. El bot no manda invitaciones; si alguien no está, aparece en el resumen como "no están en el servidor" y se le da acceso automáticamente la próxima vez que se guarde el equipo (ya estando adentro).
- El bot no saca accesos: si alguien pasa de confirmado a rechazado después de activar, su acceso queda y se quita a mano. Se puede automatizar más adelante si hace falta.
- El listado de miembros trae hasta 1000; sobra para el servidor de Team23.

---

## Portadas de marca en Drive y Frame.io (workflow 3)

Al crear un proyecto, el workflow genera una portada con el título y la aplica en los dos lugares:

- **Google Drive**: la setea como **imagen de fondo (tema) de la unidad compartida**, el banner que se ve arriba al abrir la unidad.
- **Frame.io**: la sube como **primer asset** del proyecto (`00 PORTADA — nombre.png`), que es lo que se ve en la tarjeta del proyecto (la API v4 no tiene portada configurable; esto es el equivalente real).

### Cómo funciona

La imagen se genera desde un **template de Google Slides** que diseñás vos: el workflow lo copia a la carpeta PLANTILLAS de la unidad nueva, reemplaza los placeholders, exporta la primera diapositiva como PNG (1600px) y la sube a los dos destinos. El deck copiado queda en PLANTILLAS por si querés retocar la portada de un proyecto puntual (retocar el deck no re-exporta solo: es la fuente, no el resultado).

### Armar el template (una sola vez)

1. Crear una presentación en Google Slides, una sola diapositiva, tamaño 16:9 (el default).
2. Diseñarla con la marca (fondo negro, Archivo Black, ojitos, rojo `#FF2B1E`) usando estos placeholders donde va el texto dinámico: `{{NOMBRE}}` (obligatorio), `{{CLIENTE}}` y `{{ANIO}}` (opcionales).
3. **Regla de composición importante**: la **franja horizontal central** de la diapositiva (más o menos el cuarto del medio) es lo único que se ve en el banner de Drive (que es ultra apaisado). Poné el título ahí; arriba y abajo va decoración que solo se ve en la versión de Frame.
4. El archivo tiene que ser accesible por la cuenta de Google de n8n. Copiar su ID (el de la URL) al CONFIG del workflow 3: `portadaTemplateId`.

### Setup en n8n

- Credencial nueva: **Google Slides account** (misma cuenta de Google de siempre; n8n pide los permisos al crearla). Va en "Portada: título", "Portada: primera página" y "Portada: thumbnail".
- Google Drive account en "Portada: copiar template", "Portada: subir a Drive", "Portada: mover y nombrar" y "Portada: fondo de la unidad".
- Frame.io OAuth2 en "Portada Frame: crear archivo".
- "Portada: descargar" y "Portada Frame: subir" van **sin credencial** (usan URLs firmadas).
- CONFIG: recargar todo + `portadaTemplateId`. Publish.

### Detalles

- La portada corre **después de responderle al hub**, así que no hace más lenta la creación; aparece unos segundos después.
- Si querés ajustar qué franja de la imagen usa el banner de Drive, es el `yCoordinate` (0 a 1) en el nodo "Portada: fondo de la unidad" (está en 0.39, centrado).
- Si algo de la cadena de portada falla, el proyecto ya se creó igual (mirá Executions). La subida a Frame tolera que la API no devuelva URL de subida: en ese caso la saltea sin romper.

---

## Workflow 9: Eliminar proyecto (nuevo)

El hub siempre tuvo el botón "Eliminar proyecto" (solo EP), pero nunca existió el workflow detrás: por eso tiraba "Failed to fetch". El `9-delete-project.json` registra la ruta `/webhook/team23/delete` y hace:

1. Busca el proyecto en el sheet por id (si no está, devuelve error claro).
2. Borra sus filas del calendario y su fila de Projects (vía batchUpdate de la API de Sheets, de abajo hacia arriba para que no se corran los índices).
3. Responde ok al hub.
4. Después de responder, borra la categoría de Discord del proyecto y todos sus canales (primero los canales, la categoría al final). Si el proyecto no tiene Discord (proyectos viejos) o los canales ya se borraron a mano, sigue sin error.

**Qué NO borra, a propósito**: la unidad compartida de Drive y el proyecto de Frame.io. Borrar material de producción automáticamente es demasiado riesgo; se archivan a mano cuando corresponda.

Setup: importar, CONFIG (`dbSheetId` + `discordGuildId`), credenciales: Team23 Key en el Webhook, Google Sheets en "Leer Projects", "Leer Calendario", "Sheets: metadata" y "Sheets: borrar filas", `Discord Bot` en "Discord: listar canales" y "Discord: borrar canales". Publish.

---

## 9. Probar

1. Crear un proyecto de prueba con tareas Online y VFX → en Discord aparece la categoría con `nombre-prod`, `nombre-coord`, `nombre-general`, `nombre-online`, `nombre-vfx`, y el aviso inicial en el general del proyecto.
2. Verificar la privacidad con una cuenta que no esté en la lista (o pidiéndole a alguien): no tiene que ver la categoría. Vos, si sos admin, la ves siempre, así que no sirve probar con tu propia cuenta.
3. Cambiarle la etapa → aviso en el `-general` del proyecto + hito con fechas en el canal general del servidor.
4. Guardar el calendario → aviso con fases e hitos.
5. Eliminar el proyecto de prueba → desaparece del hub y del sheet (Projects + Calendar), y en Discord se van la categoría y sus canales.
6. Si algo no aparece: n8n → **Executions**. El frontend no muestra estos errores.

---

## 10. Trampas nuevas (anotar en el contexto)

- **IDs de Discord en Sheets**: los snowflakes tienen 18 o 19 dígitos y Google Sheets los rompe si los interpreta como número (pierde precisión y el canal queda inservible). Por eso se guardan con un **apóstrofo adelante** y los workflows lo quitan al leer. No "corregir" eso a mano en el sheet.
- **Proyectos anteriores a este cambio** no tienen canales: sus avisos de etapa y calendario no publican nada (el workflow lo detecta y sigue sin error). Para sumarle Discord a un proyecto viejo: crear la categoría y el canal `-general` a mano, click derecho a ese canal → Copiar ID, y pegarlo en `discord_avisos_id` de esa fila con un apóstrofo adelante.
- **Límite de Discord**: 500 canales por servidor. Con ~5 canales por proyecto conviene borrar o archivar categorías de proyectos completados cada tanto (el bot no borra nada solo).
- Los permisos privados solo incluyen a quien esté en el CONFIG al momento de **crear** el proyecto. El nodo "Discord: Quién soy" existe para que el bot se agregue a sí mismo: sin eso, al negarle la vista a @everyone el bot quedaría afuera de sus propios canales y los avisos fallarían.
- Si al crear un proyecto Discord devuelve 403 Missing Permissions en la categoría, sumarle "Gestionar roles" (Manage Roles) al rol del bot en Ajustes del servidor → Roles.
- Ojo con la palabra "general", que ahora nombra dos cosas distintas: el canal `#proyecto-general` (uno por proyecto, donde van los avisos de ese proyecto) y el **canal general del servidor** (`discordGeneralId` en el CONFIG del workflow 4, donde van los hitos de todos los proyectos). La columna del sheet se sigue llamando `discord_avisos_id` justamente para no chocar con eso: guarda el ID del `-general` del proyecto.
- **Mensajes duplicados en Discord**: los nodos que publican mensajes ya no tienen retry (un aviso repetido molesta más que uno perdido; los retries quedan solo en operaciones seguras de repetir, como crear canales o dar permisos). Además el hub ahora ignora el re-click del mismo estado. Si igual ves duplicados, n8n → Executions dice todo: varias ejecuciones = el webhook se llamó varias veces; una sola ejecución = duplicado del lado de Discord.
- Varias lecturas intermedias (calendario, metadata, miembros de Discord) tienen activado **Execute Once**: sin eso, n8n las repetía una vez por cada fila o canal recibido (con riesgo de 429 al listar miembros). Si editás la rama de accesos, mantené ese flag.
- Regla para diagnosticar el hub: **"Failed to fetch" = la ruta no existe en n8n o el workflow no está publicado** (el preflight CORS del navegador muere antes de ver el 404). En cambio **"HTTP 500/403"** = el workflow existe pero falló adentro: mirar Executions.
- Si el canal general tiene permisos restringidos por rol, dar acceso de escritura al rol del bot (los canales que crea el bot no tienen ese problema).
- El aviso inicial y los canales tardan unos segundos más que antes (rate limit de Discord: 1 canal por segundo, mismo patrón de batching + retry que Frame.io).
