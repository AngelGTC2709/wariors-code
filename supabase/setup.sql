-- Configura el perfil de tutor, el estado unificado de la app y la evidencia.
-- Ejecutar en Supabase > SQL Editor. public.padres y las tablas del nuevo
-- esquema deben existir antes de ejecutar este script.

alter table public.padres
  add column if not exists datos_app jsonb,
  add column if not exists datos_app_version integer not null default 0;

create or replace function public.crear_perfil_tutor()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- apellido_paterno es NOT NULL; se usa '' cuando Auth no proporciona el dato.
  insert into public.padres (id_padre, primer_nombre, apellido_paterno)
  values (
    new.id,
    coalesce(
      nullif(pg_catalog.btrim(new.raw_user_meta_data ->> 'name'), ''),
      pg_catalog.split_part(coalesce(new.email, ''), '@', 1)
    ),
    coalesce(nullif(pg_catalog.btrim(new.raw_user_meta_data ->> 'apellido_paterno'), ''), '')
  )
  on conflict (id_padre) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.crear_perfil_tutor();

insert into public.padres (id_padre, primer_nombre, apellido_paterno)
select
  u.id,
  coalesce(
    nullif(pg_catalog.btrim(u.raw_user_meta_data ->> 'name'), ''),
    pg_catalog.split_part(coalesce(u.email, ''), '@', 1)
  ),
  coalesce(nullif(pg_catalog.btrim(u.raw_user_meta_data ->> 'apellido_paterno'), ''), '')
from auth.users u
left join public.padres p on p.id_padre = u.id
where p.id_padre is null
on conflict (id_padre) do nothing;

create or replace function public.actualizar_version_datos_app()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.datos_app is distinct from old.datos_app then
    new.datos_app_version := old.datos_app_version + 1;
  end if;
  return new;
end;
$$;

drop trigger if exists padres_datos_app_version on public.padres;
create trigger padres_datos_app_version
  before update of datos_app on public.padres
  for each row execute function public.actualizar_version_datos_app();

revoke all on function public.crear_perfil_tutor() from public, anon, authenticated;
revoke all on function public.actualizar_version_datos_app() from public, anon, authenticated;

grant usage on schema public to authenticated;

revoke all on public.padres from anon, authenticated;
grant select (id_padre, primer_nombre, apellido_paterno, apellido_materno, datos_app, datos_app_version)
  on public.padres to authenticated;
grant update (datos_app) on public.padres to authenticated;
alter table public.padres enable row level security;

do $$
declare
  policy_name text;
begin
  for policy_name in
    select policyname
    from pg_catalog.pg_policies
    where schemaname = 'public'
      and tablename = 'padres'
  loop
    execute pg_catalog.format('drop policy %I on public.padres', policy_name);
  end loop;
end;
$$;

create policy padres_ver_solo_propio
  on public.padres for select to authenticated
  using (id_padre = (select auth.uid()));

create policy padres_actualizar_solo_propio
  on public.padres for update to authenticated
  using (id_padre = (select auth.uid()))
  with check (id_padre = (select auth.uid()));

do $$
declare
  table_name text;
  app_tables text[] := array[
    'hijos',
    'cat_tipo_deporte',
    'cat_intensidad',
    'cat_materia',
    'retos',
    'actividades_fisicas',
    'actividades_didacticas',
    'hijo_reto',
    'recompensas',
    'canjes_recompensa',
    'planes_alimenticios',
    'recetas',
    'plan_receta'
  ];
begin
  foreach table_name in array app_tables loop
    execute pg_catalog.format('alter table public.%I enable row level security', table_name);
    execute pg_catalog.format(
      'revoke insert, update, delete, truncate on table public.%I from anon',
      table_name
    );
  end loop;
end;
$$;

alter view public.v_padres_nombre set (security_invoker = true);
alter view public.v_puntos_hijo set (security_invoker = true);
revoke all on public.v_padres_nombre, public.v_puntos_hijo from anon;

insert into storage.buckets (id, name, public)
values ('activity-evidence', 'activity-evidence', false)
on conflict (id) do update set public = false;

drop policy if exists evidencia_ver_solo_propia on storage.objects;
drop policy if exists evidencia_subir_solo_propia on storage.objects;
drop policy if exists evidencia_actualizar_solo_propia on storage.objects;
drop policy if exists evidencia_borrar_solo_propia on storage.objects;

create policy evidencia_ver_solo_propia
  on storage.objects for select to authenticated
  using (
    bucket_id = 'activity-evidence'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy evidencia_subir_solo_propia
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'activity-evidence'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy evidencia_actualizar_solo_propia
  on storage.objects for update to authenticated
  using (
    bucket_id = 'activity-evidence'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'activity-evidence'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy evidencia_borrar_solo_propia
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'activity-evidence'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

do $$
begin
  if exists (
    select 1 from pg_catalog.pg_publication where pubname = 'supabase_realtime'
  ) and not exists (
    select 1
    from pg_catalog.pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'padres'
  ) then
    alter publication supabase_realtime add table public.padres;
  end if;
end;
$$;
