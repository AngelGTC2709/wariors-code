-- Configuración inicial de autenticación y datos privados de Warrior Kids.
-- Ejecutar una sola vez en Supabase > SQL Editor.

alter table public.padres
  add column if not exists auth_user_id uuid references auth.users (id) on delete cascade,
  add column if not exists datos_app jsonb,
  add column if not exists datos_app_version integer not null default 0;

create unique index if not exists padres_auth_user_id_uidx
  on public.padres (auth_user_id);

create or replace function public.crear_perfil_tutor()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.padres (auth_user_id, primer_nombre, correo_electronico)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'name'), ''), split_part(new.email, '@', 1)),
    new.email
  )
  on conflict (auth_user_id) do update
    set correo_electronico = excluded.correo_electronico;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.crear_perfil_tutor();

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

do $$
declare
  table_name text;
  app_tables text[] := array[
    'padres',
    'hijos',
    'retos',
    'recompensas',
    'actividad_fisica',
    'actividad_didactica',
    'plan_alimenticio',
    'recetas',
    'asignan_recompensas',
    'obtienen_recompensas',
    'realizan_retos'
  ];
begin
  foreach table_name in array app_tables loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('revoke all on table public.%I from public, anon, authenticated', table_name);
  end loop;
end;
$$;

grant usage on schema public to authenticated;
grant select (id_padre, auth_user_id, datos_app, datos_app_version)
  on public.padres to authenticated;
grant update (datos_app)
  on public.padres to authenticated;

do $$
declare
  policy_name text;
begin
  for policy_name in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'padres'
  loop
    execute format('drop policy %I on public.padres', policy_name);
  end loop;
end;
$$;

create policy padres_ver_solo_propio
  on public.padres for select to authenticated
  using (auth_user_id = (select auth.uid()));

create policy padres_actualizar_solo_propio
  on public.padres for update to authenticated
  using (auth_user_id = (select auth.uid()))
  with check (auth_user_id = (select auth.uid()));

revoke all on function public.crear_perfil_tutor() from public;
revoke all on function public.actualizar_version_datos_app() from public;

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
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
    and not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'padres'
    )
  then
    alter publication supabase_realtime add table public.padres;
  end if;
end;
$$;
