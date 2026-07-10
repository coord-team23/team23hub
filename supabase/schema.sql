-- ============================================================
-- TEAM23 HUB (versión merged) — Supabase SOLO PARA LOGIN Y ROLES
-- Los datos de proyectos siguen viviendo en el Google Sheet (n8n).
-- Ejecutar completo en: Supabase Dashboard → SQL Editor → Run
-- ============================================================

-- Mails del equipo interno + su subrol.
-- 'ep' = Productor Ejecutivo (acceso total, puede eliminar proyectos)
-- 'productor' = Productor (todo menos eliminar)
-- Cualquier mail que NO esté acá entra como proveedor (solo portal).
create table public.internal_emails (
  email text primary key,
  subrol text not null default 'productor' check (subrol in ('ep','productor'))
);
-- ⬇️ CARGÁ ACÁ AL EQUIPO (antes de que se logueen):
-- insert into public.internal_emails (email, subrol) values
--   ('vos@team23.online', 'ep'),
--   ('productor@team23.online', 'productor');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  nombre text default '',
  role text not null default 'proveedor' check (role in ('interno','proveedor')),
  subrol text not null default '',
  created_at timestamptz default now()
);

-- Al primer login se crea el perfil con el rol correcto
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  ie record;
begin
  select * into ie from public.internal_emails where lower(email) = lower(new.email);
  insert into public.profiles (id, email, nombre, role, subrol)
  values (
    new.id,
    lower(new.email),
    coalesce(new.raw_user_meta_data->>'full_name',''),
    case when ie.email is not null then 'interno' else 'proveedor' end,
    coalesce(ie.subrol, '')
  )
  on conflict (id) do nothing;
  return new;
end; $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Permisos: cada usuario lee solo su propio perfil
alter table public.profiles enable row level security;
alter table public.internal_emails enable row level security;

create policy "perfil propio" on public.profiles
  for select using (id = auth.uid());

-- internal_emails: sin políticas → solo se toca desde el SQL Editor / service role

-- Si alguien ya se logueó ANTES de estar en internal_emails, promovelo a mano:
-- update public.profiles set role='interno', subrol='ep' where email='vos@team23.online';
