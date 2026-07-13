# Changelog

Resumen de los cambios mergeados hasta ahora en TEAM23 Production Hub (panel + portal de proveedores).

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
