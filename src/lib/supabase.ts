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
    Functions: Record<string, never>;
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
