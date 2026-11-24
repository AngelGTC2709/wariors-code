import 'react-native-url-polyfill/auto';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type Table<Row, Insert, Update = Partial<Insert>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

type Database = {
  public: {
    Tables: {
      hijo_ingrediente: Table<
        { id_hijo: number; id_ingrediente: number; tipo: 'alergia' | 'no_le_gusta' | 'preferido' },
        { id_hijo: number; id_ingrediente: number; tipo: 'alergia' | 'no_le_gusta' | 'preferido' }
      >;
      hijos: Table<
        {
          id_hijo: number;
          id_padre: string;
          nombres: string;
          apellidos: string;
          fecha_nacimiento: string;
          sexo: 'femenino' | 'masculino';
          consentimiento_salud_en: string;
        },
        {
          id_padre: string;
          nombres: string;
          apellidos: string;
          fecha_nacimiento: string;
          sexo: 'femenino' | 'masculino';
          consentimiento_salud_en: string;
        }
      >;
      retos: Table<
        {
          id_reto: number;
          id_padre: string;
          descripcion_reto: string;
          puntos_de_recompensa: number;
          fecha_inicio: string;
          fecha_limite: string;
        },
        {
          id_padre: string;
          descripcion_reto: string;
          puntos_de_recompensa: number;
          fecha_inicio: string;
          fecha_limite: string;
        }
      >;
      hijo_reto: Table<
        {
          id_hijo_reto: number;
          id_hijo: number;
          id_reto: number;
          estado: 'asignado' | 'en_progreso' | 'completado' | 'verificado' | 'rechazado';
          fecha_asignacion: string;
          fecha_completado: string | null;
          fecha_verificacion: string | null;
          puntos_otorgados: number | null;
        },
        {
          id_hijo: number;
          id_reto: number;
          estado?: 'asignado' | 'en_progreso' | 'completado' | 'verificado' | 'rechazado';
          fecha_asignacion?: string;
          fecha_completado?: string | null;
          fecha_verificacion?: string | null;
          puntos_otorgados?: number | null;
        }
      >;
      recompensas: Table<
        {
          id_recompensa: number;
          id_padre: string;
          nombre_premio: string;
          costo_en_puntos: number;
          cantidad_disponible: number;
          estado: 'activa' | 'inactiva' | 'agotada';
        },
        {
          id_padre: string;
          nombre_premio: string;
          costo_en_puntos: number;
          cantidad_disponible?: number;
          estado?: 'activa' | 'inactiva' | 'agotada';
        }
      >;
      canjes_recompensa: Table<
        {
          id_canje: number;
          id_hijo: number;
          id_recompensa: number;
          fecha_canje: string;
          puntos_gastados: number;
          estado: 'solicitado' | 'entregado' | 'cancelado';
        },
        {
          id_hijo: number;
          id_recompensa: number;
          fecha_canje?: string;
          puntos_gastados: number;
          estado?: 'solicitado' | 'entregado' | 'cancelado';
        }
      >;
      planes_alimenticios: Table<
        {
          id_plan: number;
          id_hijo: number;
          meta_calorias_diarias: number;
          fecha_inicio: string;
          fecha_fin: string;
        },
        {
          id_hijo: number;
          meta_calorias_diarias: number;
          fecha_inicio: string;
          fecha_fin: string;
        }
      >;
      plan_receta: Table<
        {
          id_plan: number;
          id_receta: number;
          fecha: string;
          tipo_comida: 'desayuno' | 'colacion' | 'comida' | 'cena';
        },
        {
          id_plan: number;
          id_receta: number;
          fecha: string;
          tipo_comida: 'desayuno' | 'colacion' | 'comida' | 'cena';
        }
      >;
      cat_tipo_deporte: Table<
        { id_tipo_deporte: number; nombre: string },
        { id_tipo_deporte?: number; nombre: string }
      >;
      cat_intensidad: Table<
        { id_intensidad: number; nombre: string },
        { id_intensidad?: number; nombre: string }
      >;
      cat_materia: Table<
        { id_materia: number; nombre: string },
        { id_materia?: number; nombre: string }
      >;
      actividades_fisicas: Table<
        {
          id_actividad_fisica: number;
          id_reto: number;
          id_tipo_deporte: number;
          id_intensidad: number;
          distancia_km: number | null;
          tiempo_minutos: number | null;
        },
        {
          id_reto: number;
          id_tipo_deporte: number;
          id_intensidad: number;
          distancia_km?: number | null;
          tiempo_minutos?: number | null;
        }
      >;
      actividades_didacticas: Table<
        {
          id_actividad_didactica: number;
          id_reto: number;
          id_materia: number;
          duracion_horas: number;
          duracion_minutos: number;
        },
        {
          id_reto: number;
          id_materia: number;
          duracion_horas?: number;
          duracion_minutos?: number;
        }
      >;
      ingredientes: Table<
        { id_ingrediente: number; nombre: string; id_padre: string | null },
        { nombre: string; id_padre?: string | null }
      >;
      receta_ingrediente: Table<
        { id_receta: number; id_ingrediente: number; cantidad: string | null },
        { id_receta: number; id_ingrediente: number; cantidad?: string | null }
      >;
      recetas: Table<
        {
          id_receta: number;
          nombre_platillo: string;
          instrucciones: string;
          prep_horas: number;
          prep_minutos: number;
          calorias_porcion: number | null;
        },
        {
          nombre_platillo: string;
          instrucciones: string;
          prep_horas?: number;
          prep_minutos?: number;
          calorias_porcion?: number | null;
        }
      >;
      catalogo_recetas_warrior_kids: Table<
        {
          codigo: string;
          id_receta: number;
          nombre_platillo: string;
          tipo_comida: 'desayuno' | 'colacion' | 'comida' | 'cena';
          grupo_edad: string;
          combinacion_grupos: string;
          ingredientes: string;
          porciones_por_grupo: string;
          calorias_porcion_kcal: number;
          tiempo_preparacion_min: number;
          nota_educativa_app: string;
          preparacion_completa: string;
        },
        {
          codigo: string;
          id_receta: number;
          nombre_platillo: string;
          tipo_comida: 'desayuno' | 'colacion' | 'comida' | 'cena';
          grupo_edad: string;
          combinacion_grupos: string;
          ingredientes: string;
          porciones_por_grupo: string;
          calorias_porcion_kcal: number;
          tiempo_preparacion_min: number;
          nota_educativa_app: string;
          preparacion_completa: string;
        }
      >;
      mediciones_hijo: Table<
        {
          id_medicion: number;
          id_hijo: number;
          fecha_medicion: string;
          peso_kg: number;
          estatura_cm: number;
        },
        { id_hijo: number; fecha_medicion?: string; peso_kg: number; estatura_cm: number }
      >;
      valoraciones_salud: Table<
        {
          id_valoracion: number;
          id_hijo: number;
          fecha_registro: string;
          acudio_especialista: boolean;
          fecha_consulta: string | null;
          diagnostico_peso: string;
          diagnostico_glucosa: string;
        },
        {
          id_hijo: number;
          acudio_especialista: boolean;
          fecha_consulta?: string | null;
          diagnostico_peso?: string;
          diagnostico_glucosa?: string;
        }
      >;
      catalogo_actividades_fisicas: {
        Row: {
          codigo: string;
          nombre: string;
          grupo_edad: string;
          tipo: string;
          capacidad_fisica: string;
          intensidad: string;
          minutos_sesion: string;
          dias_por_semana: string;
          supervision: string;
          material: string;
          espacio: string;
          precauciones: string;
          como_se_hace: string;
        };
        Insert: {
          codigo: string;
          nombre: string;
          grupo_edad: string;
          tipo: string;
          capacidad_fisica: string;
          intensidad: string;
          minutos_sesion: string;
          dias_por_semana: string;
          supervision: string;
          material: string;
          espacio: string;
          precauciones: string;
          como_se_hace: string;
        };
        Update: {
          codigo?: string;
          nombre?: string;
          grupo_edad?: string;
          tipo?: string;
          capacidad_fisica?: string;
          intensidad?: string;
          minutos_sesion?: string;
          dias_por_semana?: string;
          supervision?: string;
          material?: string;
          espacio?: string;
          precauciones?: string;
          como_se_hace?: string;
        };
        Relationships: [];
      };
      padres: {
        Row: {
          id_padre: string;
          primer_nombre: string;
          apellido_paterno: string;
          apellido_materno: string | null;
          datos_app: Json | null;
          datos_app_version: number;
        };
        Insert: {
          id_padre?: string;
          primer_nombre: string;
          apellido_paterno: string;
          apellido_materno?: string | null;
          datos_app?: Json | null;
          datos_app_version?: number;
        };
        Update: {
          id_padre?: string;
          primer_nombre?: string;
          apellido_paterno?: string;
          apellido_materno?: string | null;
          datos_app?: Json | null;
          datos_app_version?: number;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      crear_perfil_infantil: {
        Args: {
          p_nombres: string;
          p_apellidos: string;
          p_fecha_nacimiento: string;
          p_sexo: string;
          p_peso_kg: number;
          p_estatura_cm: number;
          p_acudio_especialista: boolean;
          p_diagnostico_peso: string;
          p_diagnostico_glucosa: string;
          p_acepta_aviso_salud: boolean;
        };
        Returns: number;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

let client: SupabaseClient<Database> | null = null;

export function getSupabaseClient(): SupabaseClient<Database> {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error('Falta configurar EXPO_PUBLIC_SUPABASE_URL o EXPO_PUBLIC_SUPABASE_ANON_KEY en .env.local.');
  }
  if (!client) {
    client = createClient<Database>(url, anonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: false,
        detectSessionInUrl: false,
      },
    });
  }
  return client;
}
