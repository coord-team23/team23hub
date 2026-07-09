# TEAM23 — Production Hub

Página web que centraliza tus proyectos de post: Drive, Frame.io, calendario y equipo, con creación automática de toda la estructura al dar de alta un proyecto.

**Cómo funciona la arquitectura:**

```
Página web (Cloudflare Pages)
        │  fetch con header x-team23-key
        ▼
n8n (n8n.rawmarketing.co) — 5 workflows con webhooks
        ▼
Google Drive · Google Docs · Google Sheets · Frame.io · Gmail
```

La "base de datos" es un Google Sheet (`TEAM23_DB`) que se crea solo con el workflow 1. Nada vive en la página: si mañana querés migrar todo, tus datos están en un Sheet tuyo.

---

## Qué hace cada workflow

| # | Workflow | Webhook | Qué hace |
|---|----------|---------|----------|
| 1 | Setup DB | (manual, se corre 1 vez) | Crea el spreadsheet TEAM23_DB con tabs Projects y Calendar |
| 2 | Get Projects | `GET /webhook/team23/projects` | Devuelve todos los proyectos + calendarios a la página |
| 3 | Crear Proyecto | `POST /webhook/team23/create` | Crea carpeta raíz en Drive + las 6 carpetas + subcarpetas de FOOTAGE y DELIVERY + copia Desglose y Tracker + crea el Doc de Notas con template + crea el proyecto en Frame.io con sus 4 carpetas + guarda el registro |
| 4 | Actualizar Proyecto | `POST /webhook/team23/update` | Edita nombre/cliente/agencia/productora/**director**, equipo, tareas, asignaciones, **`taskDates_json`** (fechas por tarea: `{ "VFX": {inicio,fin,notas}, ... }`) y estado (según qué campos vengan en el body) |
| 5 | Guardar Calendario | `POST /webhook/team23/calendar` | Guarda el calendario y manda mail a todos los involucrados |
| 6 | Eliminar Proyecto | `POST /webhook/team23/delete` | Borra el registro del proyecto (recibe `{id}`). No borra la carpeta de Drive ni el proyecto en Frame.io — eso se hace a mano si hace falta |

**Estructura que crea en Drive por cada proyecto:**

```
{NOMBRE DEL PROYECTO}/
├── 00. COORD/
│   ├── {Proyecto} — Notas        (Google Doc con template de reunión + feedback)
│   ├── {Proyecto} — Desglose     (copia de tu planilla de desglose)
│   └── {Proyecto} — Tracker      (copia de tu tracker)
├── 01. SUPERVISION - PRE/
├── 02. FOOTAGE/
│   ├── 00. Armados/  01. Cámara/  02. Animaciones/  03. Sobreimpresos/
├── 03. RECURSOS/
├── 04. EDICIÓN/
├── 05. DELIVERY/
│   ├── 00. Pre-Online/  01. VFX/  02. Para Color/  03. WIP pCliente/  04. Masters/
└── 06. FINALES/                    (entregas finales; el hub la muestra como botón)
```

> El botón **06. FINALES** de la ficha abre `links.finales`. Para que funcione, el workflow de creación (y/o el de Get Projects) debe crear esa carpeta y devolver su URL en `links.finales` junto al resto de los links. Si no viene, el botón igual aparece: desactivado fuera de cierre y en rojo (sin destino) al entrar en cierre.

**En Frame.io:** proyecto con carpetas `1. Footage / 2. Offline / 3. Online / 4. Masters`.

---

## Instalación (una sola vez, ~30 min)

### Paso 1 — Credenciales en n8n

Entrá a tu n8n → **Credentials** → creá estas (las de Google probablemente ya las tenés):

1. **Google Drive OAuth2** — la misma cuenta donde querés que vivan los proyectos.
2. **Google Sheets OAuth2** — misma cuenta.
3. **Google Docs OAuth2** — misma cuenta.
4. **Gmail OAuth2** — la casilla desde la que salen los avisos de calendario.
5. **Header Auth** llamada **`Team23 Key`**:
   - Name: `x-team23-key`
   - Value: inventá una clave larga (ej: `t23_9f8s7dfh34kjh...`). Es la contraseña entre la página y n8n.
6. **Header Auth** llamada **`Frame.io Token`**:
   - Name: `Authorization`
   - Value: `Bearer TU_TOKEN_DE_FRAME` (con la palabra Bearer adelante)

### Paso 2 — Importar los workflows

En n8n → **Workflows → Import from File** → importá los 5 archivos de la carpeta `n8n/` en orden.

En cada workflow, tocá los nodos que aparecen en rojo y seleccioná tu credencial correspondiente (dice `REEMPLAZAR`).

### Paso 3 — Correr el Setup

Abrí **Team23 — 1. Setup DB** y ejecutalo una vez (Execute Workflow). El nodo final **RESULTADO** te muestra el `dbSheetId`. Copialo.

### Paso 4 — Completar los nodos CONFIG

En los workflows **2, 3, 4 y 5** hay un nodo llamado **CONFIG**. Pegá ahí:

- `dbSheetId` → el ID del paso 3 (en los 4 workflows).
- Solo en el workflow 3, además:
  - `parentFolderId` → ID de la carpeta madre de Drive donde van a vivir todos los proyectos (creá una carpeta "PROYECTOS TEAM23", abrila, y el ID es lo que está después de `/folders/` en la URL).
  - `desgloseTemplateId` y `trackerTemplateId` → **ya están precargados** con tus dos planillas. La cuenta de Google conectada en n8n tiene que tener acceso a esas planillas para poder copiarlas.
  - `frameAccountId` y `frameWorkspaceId` → ver abajo.

**Cómo obtener los IDs de Frame.io (API v4):**

```
curl -H "Authorization: Bearer TU_TOKEN" https://api.frame.io/v4/accounts
curl -H "Authorization: Bearer TU_TOKEN" https://api.frame.io/v4/accounts/{account_id}/workspaces
```

El primer comando te da el `account_id`, el segundo el `workspace_id` del workspace donde querés que se creen los proyectos.

> **Si tu cuenta usa la API legacy (v2):** los endpoints cambian. En el workflow 3, editá los dos nodos de Frame:
> - Crear proyecto: `POST https://api.frame.io/v2/teams/{team_id}/projects` con body `{"name": "..."}`
> - Crear carpetas: `POST https://api.frame.io/v2/assets/{root_asset_id}/children` con body `{"name": "...", "type": "folder"}` (el `root_asset_id` viene en la respuesta del proyecto)
> Avisame y te paso los nodos ya armados para v2.

### Paso 5 — Activar los workflows

Prendé el toggle **Active** en los workflows 2, 3, 4 y 5 (el 1 no hace falta, es manual).

### Paso 6 — Deployar la página

1. Abrí `index.html` y completá al inicio del `<script>`:
   ```js
   const CONFIG = {
     N8N_BASE: "https://n8n.rawmarketing.co",
     API_KEY: "la-clave-que-inventaste-en-Team23-Key"
   };
   ```
2. Andá a **Cloudflare Pages** → Create project → **Direct Upload** → arrastrá la carpeta con el `index.html`. En 1 minuto tenés una URL tipo `team23-hub.pages.dev` (podés colgarle un dominio propio después).

Listo. Entrás, creás un proyecto, y en ~15 segundos tenés Drive + Frame.io + documentos armados con los links en la card.

---

## Uso diario

- **Pestañas** (arriba, junto al logo): **Proyectos** (la vista de siempre, con alta y edición completa), **Calendario** (todas las fases/hitos de los proyectos activos cruzadas en un solo mes, coloreadas por proyecto), **Equipo** (mismo listado de proyectos pero abre un detalle de solo lectura: calendario y links, sin edición) y **Dashboard** (conteos, carga de trabajo por persona y próximos hitos, calculados en el momento a partir de los proyectos activos).
- **Estados del proyecto** (pipeline): **PRE-PRODUCCIÓN** → **EJECUTANDO** → **ENTREGANDO** → **LISTO PARA CIERRE** → **COMPLETADO**. En las listas se agrupan en tres bloques jerárquicos: *Pre-producción*, *Activos* (paraguas de Ejecutando/Entregando/Listo para cierre, cada tarjeta con su badge de etapa) y *Completados*. Los valores internos que recibe n8n no cambiaron (`por_activarse`, `activo`, `entregando`, `cierre`, `completado`).
- **+ NUEVO PROYECTO** (botón fijo a la derecha de la barra de navegación, en todas las vistas) → cargás datos del proyecto, equipo interno (con mails), tareas (con equipo + fechas) → se crea todo. El proyecto nace en **PRE-PRODUCCIÓN**.
- **Datos del proyecto**: **Nombre de la campaña · Productora · Director · Cliente · Agencia**. Editables solo en **PRE-PRODUCCIÓN**; desde **EJECUTANDO** en adelante, tanto estos datos como el **equipo interno** quedan en solo lectura.
- **Tareas = fases del calendario**: al elegir una tarea le cargás **equipo + inicio + fin** en el mismo bloque. Cada tarea se dibuja como su propia barra en el calendario. Las fechas se editan indistintamente desde el bloque de Tareas o desde la tabla del calendario (quedan sincronizadas). El calendario además admite **fases independientes** (ej. "Entrega Masters", se agregan con "+ agregar fase") e **hitos** por día. Tareas actuales: VFX · Color · DG · Motion Graphics · IA · 3D/CGI · Retoque · SFX/Mezcla · Online.
- **Activar**: abrís el proyecto → tocás **EJECUTANDO** → cargás las fechas de cada tarea y de las fases; aparecen como barras en el calendario → **Guardar calendario y avisar al equipo** manda el mail a todos.
- **Cierre automático**: cuando un proyecto en *Ejecutando* o *Entregando* pasa su fecha de finalización (la última fecha del calendario), el hub lo mueve solo a **LISTO PARA CIERRE** al cargar. En ese estado la ficha se bloquea: no se editan campos, desaparece la sección de tareas, el calendario pasa a **vista semanal de solo lectura** y se habilita en rojo el botón **06. FINALES** de Drive (antes aparece desactivado). *(El cálculo es del lado del navegador; si querés que el cambio de estado quede persistido siempre, el hub ya postea el nuevo estado a `/webhook/team23/update`.)*
- **Hitos por día**: clickeás cualquier día del calendario mensual → "agregar hito este día" para detallar cosas puntuales (ej: "Corte 1 al cliente", "Llegada de material"). Los hitos aparecen en rojo dentro del día y también van en el mail.
- **Cambios de calendario**: editás fechas o hitos → guardar → mail automático a todos los involucrados.
- **PDF**: botón "Descargar PDF" en el calendario (imprime solo el calendario, limpio).
- **Completar**: tocás **COMPLETADO** → pasa a la sección de completados agrupado por año.
- **Editar equipo/tareas**: en **PRE-PRODUCCIÓN** el equipo interno es editable; las tareas (con equipo + fechas) se editan mientras el proyecto está activo → "Guardar cambios de equipo".
- **Editar datos del proyecto**: se editan en "Datos del proyecto" solo en PRE-PRODUCCIÓN → "Guardar datos del proyecto". La creación de carpetas guarda además `taskDates_json` (fechas por tarea) y `director`; el workflow de n8n debe persistir esos campos.
- **Eliminar proyecto**: al fondo del detalle, en "Zona de riesgo" → pide confirmación antes de borrar. Solo borra el registro del hub; las carpetas de Drive y el proyecto en Frame.io quedan (borralos a mano si corresponde).

---

## Seguridad y límites (honesto)

- La página es estática y la protege la clave `x-team23-key`. Es seguridad de herramienta interna: suficiente para el equipo, no para exponer públicamente con data sensible. Si querés login real, en Cloudflare activás **Cloudflare Access** sobre el dominio (SSO con Google) en 5 minutos, sin tocar código.
- La pestaña **Equipo** no es un permiso real: solo oculta los controles de edición en el navegador. Cualquiera con el link puede tocar la pestaña **Proyectos** y editar. Si necesitás que eso sea un límite de verdad (no solo de interfaz), es un tema de Cloudflare Access / login, no de esta página.
- El mail de calendario sale **cada vez** que guardás el calendario (incluida la primera vez, con asunto "Calendario definido").
- Los destinatarios son los mails cargados en el proyecto (EP, Productor, Coordinador y asignados). El EP con mail es obligatorio al crear, así nunca se guarda un calendario sin destinatario.
- Si n8n actualiza mucho de versión y algún nodo de Sheets pide re-elegir la hoja, es re-seleccionar "Projects"/"Calendar" en el dropdown y listo.
- El calendario vive en la web y en el tab Calendar del Sheet; el Sheet es el respaldo. El tab Calendar tiene una columna `tipo` que distingue `fase` (rango con barra) de `hito` (detalle de un día). Si corriste el Setup con una versión anterior de estos workflows, agregá a mano la columna `tipo` entre `notas` y `updated_at`.

### Conectar el calendario a Google Calendar (pendiente, hub ya preparado)

Hoy `POST /webhook/team23/calendar` solo guarda en el Sheet y manda el mail. Cuando quieras que cada fase/hito también viva como evento en un Google Calendar, el hub ya manda todo lo necesario en ese mismo POST — falta agregar el workflow del lado de n8n:

- Cada entrada de `entries[]` trae un `id` **estable** (se genera una sola vez en el navegador y se mantiene mientras exista la fase/hito), más `title` (`"Proyecto · Fase"` ya armado), `inicio`/`fin` (`allDay:true`) y `notas`.
- `deletedEventIds[]` trae los ids de fases/hitos que se borraron desde el navegador desde el último guardado — son los eventos que hay que borrar de Calendar.
- Con eso, el workflow de n8n debería: guardar en algún lado (columna nueva en el tab Calendar, o un Data Table) el `eventId` de Google que le corresponde a cada `id` propio; en cada guardado, por cada `entries[]` hacer upsert (crear si no existe ese `id` todavía, actualizar si ya existe) y por cada `deletedEventIds[]` borrar el evento.
- La cuenta de Google se conecta con OAuth2 directamente en el nodo de Google Calendar de n8n — no hace falta tocar nada en esta página ni pedirle login a nadie en el navegador.

## Modificaciones

Pedime lo que necesites: campos nuevos en el form, otra estructura de carpetas, roles distintos, recordatorios automáticos X días antes de una fase, vista semanal del calendario, etc.
