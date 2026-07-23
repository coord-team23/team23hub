-- ============================================================
-- MIGRACIÓN: panel de usuarios en el hub
-- Correr una vez en: Supabase Dashboard → SQL Editor → Run
-- Habilita que los usuarios internos vean la lista completa de
-- perfiles y puedan cambiar roles desde el hub.
-- ============================================================

-- helper sin recursión de RLS: ¿el que consulta es interno?
create or replace function public.is_internal() returns boolean
language sql security definer set search_path = public stable as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'interno')
$$;

-- los internos ven todos los perfiles (cada uno sigue viendo el suyo)
create policy "internos ven todos" on public.profiles
  for select using (public.is_internal());

-- los internos pueden cambiar rol/subrol
create policy "internos actualizan" on public.profiles
  for update using (public.is_internal()) with check (public.is_internal());

-- los internos administran la lista del equipo (para que el trigger
-- clasifique bien a los que se registren después del cambio)
create policy "internos leen equipo"       on public.internal_emails for select using (public.is_internal());
create policy "internos suman equipo"      on public.internal_emails for insert with check (public.is_internal());
create policy "internos actualizan equipo" on public.internal_emails for update using (public.is_internal()) with check (public.is_internal());
create policy "internos quitan equipo"     on public.internal_emails for delete using (public.is_internal());
