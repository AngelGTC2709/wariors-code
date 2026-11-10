import 'react-native-url-polyfill/auto';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type Database = {
  public: {
    Tables: {
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
