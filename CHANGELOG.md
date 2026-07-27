# Changelog

Resumen de los cambios mergeados hasta ahora en TEAM 23 Production Hub (panel + portal de proveedores).

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
