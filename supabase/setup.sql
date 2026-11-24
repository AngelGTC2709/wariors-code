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

create or replace function public.crear_perfil_infantil(
  p_nombres text,
  p_apellidos text,
  p_fecha_nacimiento date,
  p_sexo text,
  p_peso_kg numeric,
  p_estatura_cm numeric,
  p_acudio_especialista boolean,
  p_diagnostico_peso text,
  p_diagnostico_glucosa text,
  p_acepta_aviso_salud boolean
)
returns bigint
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_padre uuid := (select auth.uid());
  v_id_hijo bigint;
  v_edad integer;
  v_edad_min integer;
  v_edad_max integer;
begin
  if v_padre is null then
    raise exception 'Debes iniciar sesión como tutor para registrar un perfil infantil.';
  end if;
  if p_acepta_aviso_salud is not true then
    raise exception 'Se requiere autorización para guardar datos de salud.';
  end if;
  if nullif(pg_catalog.btrim(p_nombres), '') is null or p_apellidos is null
    or p_fecha_nacimiento is null or p_sexo is null or p_peso_kg is null or p_estatura_cm is null
    or p_acudio_especialista is null or p_diagnostico_peso is null or p_diagnostico_glucosa is null then
    raise exception 'Faltan datos obligatorios para registrar el perfil infantil.';
  end if;
  select min(g.edad_min), max(g.edad_max) into v_edad_min, v_edad_max from public.cat_grupo_edad g;
  v_edad := extract(year from pg_catalog.age(current_date, p_fecha_nacimiento))::integer;
  if v_edad_min is null or v_edad_max is null or p_fecha_nacimiento > current_date
    or v_edad < v_edad_min or v_edad > v_edad_max then
    raise exception 'La fecha de nacimiento no corresponde a una edad admitida.';
  end if;
  if not p_acudio_especialista and (p_diagnostico_peso <> 'ninguno' or p_diagnostico_glucosa <> 'ninguno') then
    raise exception 'Solo se puede registrar un diagnóstico si acudió a una persona especialista.';
  end if;
  insert into public.hijos (id_padre, nombres, apellidos, fecha_nacimiento, sexo, consentimiento_salud_en)
  values (v_padre, pg_catalog.btrim(p_nombres), pg_catalog.btrim(p_apellidos), p_fecha_nacimiento, p_sexo, pg_catalog.now())
  returning id_hijo into v_id_hijo;

  insert into public.mediciones_hijo (id_hijo, peso_kg, estatura_cm)
  values (v_id_hijo, p_peso_kg, p_estatura_cm);

  insert into public.valoraciones_salud (id_hijo, acudio_especialista, diagnostico_peso, diagnostico_glucosa)
  values (v_id_hijo, p_acudio_especialista, p_diagnostico_peso, p_diagnostico_glucosa);
  return v_id_hijo;
end;
$$;

revoke all on function public.crear_perfil_infantil(text, text, date, text, numeric, numeric, boolean, text, text, boolean)
  from public, anon, authenticated;
grant execute on function public.crear_perfil_infantil(text, text, date, text, numeric, numeric, boolean, text, text, boolean)
  to authenticated;

create table if not exists public.catalogo_actividades_fisicas (
  codigo text primary key,
  nombre text not null,
  grupo_edad text not null,
  tipo text not null,
  capacidad_fisica text not null,
  intensidad text not null,
  minutos_sesion text not null,
  dias_por_semana text not null,
  supervision text not null,
  material text not null,
  espacio text not null,
  precauciones text not null,
  como_se_hace text not null
);

alter table public.catalogo_actividades_fisicas enable row level security;
revoke all on public.catalogo_actividades_fisicas from anon, authenticated;
grant select on public.catalogo_actividades_fisicas to authenticated;

drop policy if exists catalogo_actividades_fisicas_lectura
  on public.catalogo_actividades_fisicas;
create policy catalogo_actividades_fisicas_lectura
  on public.catalogo_actividades_fisicas for select to authenticated
  using (true);

insert into public.catalogo_actividades_fisicas (
  codigo, nombre, grupo_edad, tipo, capacidad_fisica, intensidad,
  minutos_sesion, dias_por_semana, supervision, material, espacio,
  precauciones, como_se_hace
) values
  ('A01', 'Escondidillas', '9 a 12 años', 'juego_recreativo', 'velocidad, orientación', 'moderada', '20 a 30', 'diario', 'adulto cerca', 'ninguno', 'patio o casa, zona delimitada', 'Zona segura sin escaleras ni objetos', 'Uno cuenta con los ojos cerrados mientras los demás se esconden; al encontrar, se corre a la base.'),
  ('A02', 'Atrapadillas (congelados)', '9 a 12 años', 'juego_recreativo', 'velocidad, reacción', 'moderada', '15 a 20', 'diario', 'adulto cerca', 'ninguno', 'patio, zona delimitada', 'Pausas de hidratación; evitar empujones', 'Quien la liga atrapa; el atrapado se congela hasta que otro lo libere.'),
  ('A03', 'Persecución libre (stop, lobo y ovejas)', '9 a 12 años', 'juego_recreativo', 'agilidad, velocidad', 'moderada', '15 a 20', 'diario', 'adulto cerca', 'ninguno', 'patio', 'Pausas de 5 a 10 min si se cansa', 'Juego de persecución con cambios de dirección, sin competir a máximo esfuerzo.'),
  ('A04', 'Patio recreativo tradicional (avión, rayuela, gallinita ciega)', '6 a 12 años', 'juego_recreativo', 'coordinación, equilibrio', 'moderada', '45 a 60 en bloques de 15 a 20 min', 'diario', 'adulto cerca', 'gis (para rayuela)', 'patio', 'Pausas de 5 a 10 min entre bloques', 'Juegos tradicionales alternando saltos, desplazamientos y pausas.'),
  ('A05', 'Fútbol recreativo (mini partidos)', '9 a 12 años', 'predeportivo', 'coordinación, pase, desplazamiento intermitente', 'moderada', '20 a 30', '2 a 3', 'adulto cerca', 'balón', 'cancha o patio plano', 'Hidratación; sin partidos de competencia a máximo esfuerzo', 'Equipos pequeños, con cambios frecuentes y sin tiempos largos de juego continuo.'),
  ('A06', 'Básquetbol predeportivo (pases y tiros)', '9 a 12 años', 'predeportivo', 'coordinación, puntería', 'moderada', '20', '2 a 3', 'adulto cerca', 'balón y canasta', 'cancha o patio plano', 'Balón de tamaño adecuado', 'Pases en parejas y tiros cortos a canasta, con descanso entre rondas.'),
  ('A07', 'Imitación de animales (rana, oso, cangrejo)', '6 a 8 años', 'juego_recreativo', 'movilidad, fuerza con peso corporal', 'baja', '10 a 15', 'diario', 'adulto cerca', 'ninguno', 'sala o patio plano', 'Superficie plana; sin saltos desde altura', 'Cada animal es un movimiento: sentadilla corta, plancha corta, avance en cuatro apoyos.'),
  ('A08', 'Rayuela (saltar en un pie)', '6 a 8 años', 'juego_recreativo', 'equilibrio, coordinación', 'moderada', '10 a 15', 'diario', 'adulto cerca', 'gis', 'patio plano', 'Superficie no resbalosa; sin saltos altos', 'Saltar en un pie por la rayuela, cambiando de pie.'),
  ('A09', 'Relevos cortos sin competencia', '9 a 12 años', 'juego_recreativo', 'velocidad, coordinación', 'moderada', '10 a 15', '2 a 3', 'adulto cerca', 'conos o botellas', 'patio plano', 'Descanso entre tandas; no comparar tiempos', 'Carreras cortas por equipos, con intervalos de descanso.'),
  ('A10', 'Baile libre o coreografía', '6 a 12 años', 'juego_recreativo', 'resistencia, coordinación', 'moderada', '15 a 20', 'diario', 'adulto cerca', 'música', 'sala o patio', 'Espacio sin obstáculos', 'El niño elige canciones y crea sus propios pasos.'),
  ('A11', 'Paseo en bicicleta', '9 a 12 años', 'juego_recreativo', 'resistencia', 'moderada', '20 a 30', '2 a 3', 'adulto cerca', 'bicicleta y casco', 'calle sin tráfico o ciclovía', 'Casco obligatorio; supervisión en vía pública', 'Recorrido corto con paradas de descanso.'),
  ('A12', 'Nado recreativo', '6 a 12 años', 'juego_recreativo', 'resistencia, coordinación', 'moderada', '20 a 30', '2 a 3', 'adulto cerca', 'ninguno (chaleco si no sabe nadar)', 'alberca o playa con vigilancia', 'Nunca sin adulto cerca', 'Juegos en el agua de bajo impacto, con pausas.'),
  ('A13', 'Sentadillas con peso corporal', '6 a 12 años', 'ejercicio_peso_corporal', 'fuerza de piernas', 'baja', '10', '3 (no consecutivos)', 'adulto cerca', 'ninguno', 'superficie plana', 'Sin cargas; en 6-8 solo peso corporal; desde 9 años adaptaciones leves', '3 series de 8 a 10 repeticiones.'),
  ('A14', 'Flexiones en pared o de rodillas', '6 a 12 años', 'ejercicio_peso_corporal', 'fuerza de brazos y pecho', 'baja', '10', '3 (no consecutivos)', 'adulto cerca', 'pared o colchoneta', 'superficie plana', 'Sin cargas; progresar de pared a rodillas', '3 series de 6 a 10 repeticiones.'),
  ('A15', 'Plancha sobre rodillas', '6 a 12 años', 'ejercicio_peso_corporal', 'fuerza de abdomen y espalda', 'baja', '5 a 10', '3 (no consecutivos)', 'adulto cerca', 'colchoneta', 'superficie plana', 'Espalda recta; no aguantar si duele', '3 series de 10 a 20 segundos.'),
  ('A16', 'Puente de glúteo', '6 a 12 años', 'ejercicio_peso_corporal', 'fuerza de glúteos y espalda baja', 'baja', '5 a 10', '3 (no consecutivos)', 'adulto cerca', 'colchoneta', 'superficie plana', 'Sin cargas; detenerse si hay molestia', '3 series de 8 a 12 repeticiones.'),
  ('A17', 'Zancadas con peso corporal', '9 a 12 años', 'ejercicio_peso_corporal', 'fuerza y equilibrio de piernas', 'baja', '10', '3 (no consecutivos)', 'adulto cerca', 'ninguno', 'superficie plana', 'Sin cargas; apoyo en pared si es necesario', '3 series de 6 a 8 por pierna.'),
  ('A18', 'Trepar en barras o escalera de parque', '6 a 12 años', 'ejercicio_peso_corporal', 'fuerza de brazos y coordinación', 'moderada', '10 a 15', '2 a 3', 'adulto cerca', 'equipo de parque', 'parque infantil', 'Revisar que el equipo esté en buen estado', 'Subir y bajar con control, sin competir.'),
  ('A19', 'Equilibrio (un pie, caminar en línea)', '6 a 12 años', 'movilidad', 'equilibrio', 'baja', '5 a 10', 'diario', 'adulto cerca', 'línea en el suelo', 'superficie plana', 'Cerca de una pared', 'Sostenerse en un pie y caminar sobre una línea.'),
  ('A20', 'Yoga infantil con cuento y estiramientos guiados', '6 a 12 años', 'movilidad', 'flexibilidad, relajación', 'baja', '10 a 15 (cierre de sesión)', 'diario', 'adulto cerca', 'colchoneta', 'sala', 'Sin posturas forzadas ni rebotes', 'Posturas de animales al ritmo de un cuento; se usa al final de la sesión o cuando el niño está cansado.')
on conflict (codigo) do update set
  nombre = excluded.nombre,
  grupo_edad = excluded.grupo_edad,
  tipo = excluded.tipo,
  capacidad_fisica = excluded.capacidad_fisica,
  intensidad = excluded.intensidad,
  minutos_sesion = excluded.minutos_sesion,
  dias_por_semana = excluded.dias_por_semana,
  supervision = excluded.supervision,
  material = excluded.material,
  espacio = excluded.espacio,
  precauciones = excluded.precauciones,
  como_se_hace = excluded.como_se_hace;

create table if not exists public.catalogo_recetas_warrior_kids (
  codigo text primary key,
  id_receta bigint not null unique references public.recetas(id_receta) on delete cascade,
  nombre_platillo text not null,
  tipo_comida text not null check (tipo_comida in ('desayuno', 'colacion', 'comida', 'cena')),
  grupo_edad text not null,
  combinacion_grupos text not null,
  ingredientes text not null,
  porciones_por_grupo text not null,
  calorias_porcion_kcal integer not null check (calorias_porcion_kcal >= 0),
  tiempo_preparacion_min integer not null check (tiempo_preparacion_min >= 0),
  nota_educativa_app text not null,
  preparacion_completa text not null
);

alter table public.catalogo_recetas_warrior_kids enable row level security;
revoke all on public.catalogo_recetas_warrior_kids from anon, authenticated;
grant select on public.catalogo_recetas_warrior_kids to authenticated;

drop policy if exists catalogo_recetas_warrior_kids_lectura
  on public.catalogo_recetas_warrior_kids;
create policy catalogo_recetas_warrior_kids_lectura
  on public.catalogo_recetas_warrior_kids for select to authenticated
  using (true);

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
