# Directorio de proveedores + indicador de carga

> Agrega el workflow 10 (`n8n/10-roster.json`) y cambios en `index.html`. Complementa a DISCORD-SETUP.md.

---

## 1. Qué agrega

**Indicador de carga de proyectos.** Al entrar al hub se pinta al instante lo cacheado en localStorage y, mientras llega lo fresco de n8n, aparece un pill con spinner debajo del título: "Buscando proyectos nuevos". Cuando termina, desaparece; si aparecieron proyectos que no estaban en el cache, avisa con un toast ("✔ 2 proyectos nuevos"). Así los nuevos ya no "aparecen de la nada".

**Directorio Team23.** Botón "Directorio" en el header (visible solo para internos) que abre la base de proveedores como tabla dentro del hub:

- Columnas idénticas al spreadsheet (las lee de la fila 1, así que si agregás una columna en el sheet, el hub la muestra sola).
- Orden por cualquier columna con click en el encabezado (A a Z / Z a A; si la columna es numérica como Valor Jornada, ordena por número). Los vacíos van siempre al final.
- Buscador que filtra por cualquier campo.
- Edición inline: click en una celda, editás, y al salir de la celda se guarda directo en el spreadsheet. Enter también guarda.
- Botón Refrescar y link "Abrir sheet" para editar en Google directamente.

**Sincronización en dos direcciones**: lo que se edita en el hub se escribe al toque en el spreadsheet; lo que se edita en el spreadsheet aparece en el hub al abrir el directorio o tocar Refrescar.

---

## 2. Seguridad: por qué un workflow con validación real

La Team23 Key viaja en el HTML del hub, que Netlify le sirve a cualquiera, así que **no alcanza con esconder el botón**: cualquiera con la key podría llamar al webhook. Por eso el workflow 10 valida en el servidor, igual que el portal de proveedores:

1. Recibe el token de sesión de Supabase que manda el hub.
2. Lo valida contra `auth/v1/user` (token inválido: 401).
3. Lee el rol del usuario en `profiles` con su propio token (el RLS "perfil propio" del schema.sql lo permite) y exige `role = interno` (si no: 403, "solo productores").
4. Recién ahí lee o escribe el spreadsheet.

Un proveedor logueado que intente llamar al webhook a mano recibe 403. Sin login, 401. **Los proveedores no pueden ver esta lista ni con la key.**

## 3. Setup

1. **Compartir el spreadsheet** de proveedores (`1jMs5xUhFKrp5z_LHMOdkJia7vKJsrtKdSB20g9KHsp0`) con la cuenta de Google de la credencial de n8n, como Editor. Sin esto, los nodos Roster dan 403 de Google.
2. **Importar `n8n/10-roster.json`.** El CONFIG ya trae `supabaseUrl`, `supabaseAnonKey` y `rosterSheetId` cargados (verificar que la anon key esté sana). Credenciales: Team23 Key en el Webhook, Google Sheets en los 4 nodos Roster ("metadata", "leer", "leer fila", "escribir"). **Publish.**
3. **Subir el `index.html`** nuevo al repo. Netlify redeploya.

## 4. Completar la base

La idea es que el sheet sea la base de todos los usuarios de la plataforma. Ya están Eyal, Leo, Ramiro Chalde y Roberto como filas. Falta agregar a mano las filas de **Narf, Teo, Milena y Karla** (y quien falte). Sugerencia opcional: si querés distinguir administradores de productores y proveedores dentro de la lista, agregá una columna `Rol` al final del sheet; el hub la muestra y ordena sola, sin tocar nada.

## 5. Asignaciones conectadas al directorio

Al agregar una persona en un proyecto (tanto en la creación como en la ficha), cada fila de asignación ahora tiene **cuatro campos: Nombre, Mail, Discord y Teléfono**.

- **Autocompletar**: al escribir en Nombre aparecen sugerencias del directorio (nativo del navegador). Si el nombre coincide con una fila del directorio, el mail, el Discord y el teléfono se completan solos (solo los campos que estén vacíos, no pisa lo que ya escribiste).
- **Sync de vuelta al spreadsheet**: al guardar el equipo (o al crear el proyecto), si cargaste un teléfono, Discord o mail que el spreadsheet no tiene para esa persona, se escribe en su fila del directorio. **Solo completa celdas vacías del sheet, nunca pisa datos existentes.** Cuando pasa, avisa con un toast.
- El match es por nombre exacto (ignora mayúsculas, tildes y espacios de sobra). Si la persona no existe en el directorio, no se sincroniza nada: agregala primero como fila (en el sheet o en el hub) y listo.
- Discord y Teléfono viajan dentro de `asignaciones_json`, así que no hay cambios de columnas ni de workflows para esto.

## 6. Chips desplegables en el directorio

Las columnas **Especialidad**, **Herramientas**, **Acuerdo** y **País** ya no se editan como texto libre: se muestran como chips y con un click se abre un selector.

- Las opciones salen de **lo que ya existe en esa columna** (dedupe ignorando tildes y mayúsculas), ordenadas alfabéticamente.
- Especialidad y Herramientas permiten **varias opciones** (se guardan separadas por coma, igual que hoy). Acuerdo y País son de **una sola opción**.
- Abajo del selector hay un campo "Agregar otro valor" para sumar opciones nuevas; quedan disponibles para todas las filas al instante.
- Se guarda al tocar "Listo" o al hacer click afuera del panel, con el mismo guard anti-pisadas que el resto.
- El detector de columnas es por nombre de encabezado (ignora tildes), así que si renombrás una columna dejan de ser chips y vuelven a texto libre.

## 7. Cómo se protege contra pisadas

Antes de escribir una fila, el workflow relee la columna A de esa fila en el sheet y la compara con lo que el hub tenía. Si no coincide (alguien ordenó, insertó o borró filas en Google mientras tanto), **rechaza el guardado** con un mensaje claro y el hub refresca la lista solo. Nunca escribe sobre la fila equivocada.

## 8. Trampas

- La lista lee la **primera pestaña** del spreadsheet (gid 0), hasta la columna Z y la fila 2000. Las pestañas de opciones (Especialidad, Disponibilidad, etc.) no se tocan.
- Si dos personas editan la misma fila a la vez en el hub, gana el último; el guard de la columna A solo protege contra movimientos de filas, no contra ediciones simultáneas de celdas distintas de la misma fila (el último escribe la fila completa).
- Las listas desplegables de validación del sheet (Disponibilidad, Nivel de Confianza) no se validan desde el hub: se escribe el texto tal cual. Escribir un valor que no está en la lista lo marca Google con el triangulito rojo, nada más.
- El autocompletado precarga el directorio al entrar al hub (una sola lectura). Si justo agregaste una fila nueva en el sheet, tocá Refrescar en el directorio para que el autocompletado la vea.
- El buscador y el orden son locales al hub, no cambian el spreadsheet. Ordenar EN el spreadsheet mientras alguien tiene el directorio abierto en el hub dispara el guard al primer guardado (comportamiento esperado: refrescar y listo).
