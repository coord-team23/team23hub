-- ============================================================================
-- TEAM23 HUB — Presencia (quién está en el hub y en qué anda)
-- ----------------------------------------------------------------------------
-- El hub usa Supabase Realtime Presence sobre el canal PRIVADO "hub-presence":
-- cada pestaña abierta publica {nombre, vista, proyecto, qué está haciendo} y
-- todas reciben la lista. No hay servidor ni workflow: lo único que hace falta
-- es permitir que los usuarios logueados con rol "interno" lean y publiquen en
-- ese canal. Sin estas policies el canal rechaza la suscripción y el piso de
-- presencia simplemente no aparece (no rompe nada más).
--
-- Correr una vez en Supabase → SQL Editor. Requiere que exista public.profiles
-- con la columna role (la crea admin-migration.sql / el setup del login).
-- ============================================================================

create policy "hub presence: internos escuchan"
  on realtime.messages
  for select
  to authenticated
  using (
    realtime.topic() = 'hub-presence'
    and extension = 'presence'
    and exists (
      select 1 from public.profiles pr
      where pr.id = auth.uid() and pr.role = 'interno'
    )
  );

create policy "hub presence: internos publican"
  on realtime.messages
  for insert
  to authenticated
  with check (
    realtime.topic() = 'hub-presence'
    and extension = 'presence'
    and exists (
      select 1 from public.profiles pr
      where pr.id = auth.uid() and pr.role = 'interno'
    )
  );

-- Para deshacer:
-- drop policy "hub presence: internos escuchan" on realtime.messages;
-- drop policy "hub presence: internos publican" on realtime.messages;
