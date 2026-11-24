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