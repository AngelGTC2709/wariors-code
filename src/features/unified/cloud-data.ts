import { File } from 'expo-file-system';
import { Platform } from 'react-native';
import type { RealtimeChannel, User } from '@supabase/supabase-js';

import {
  createEmptyUnifiedData,
  isUnifiedData,
  type LocalAccount,
  type UnifiedData,
} from '@/features/unified/model';
import { getSupabaseClient, type Json } from '@/lib/supabase';

const EVIDENCE_BUCKET = 'activity-evidence';

export type CloudDataSnapshot = {
  data: UnifiedData;
  version: number;
};

export function accountFromUser(user: User): LocalAccount {
  const email = user.email?.trim().toLocaleLowerCase('es-MX') ?? '';
  if (!email) throw new Error('La cuenta de Supabase no tiene un correo electrónico.');
  const metadataName = user.user_metadata?.name;
  const name = typeof metadataName === 'string' && metadataName.trim()
    ? metadataName.trim()
    : email.split('@')[0];

  return { id: user.id, name, email, role: 'tutor', source: 'unified' };
}

export async function verifyTutorPassword(
  email: string,
  password: string,
  expectedUserId: string,
): Promise<void> {
  const { data, error } = await getSupabaseClient().auth.signInWithPassword({ email, password });
  if (error) throw error;
  if (data.user?.id !== expectedUserId) {
    throw new Error('La cuenta verificada no coincide con la sesión actual.');
  }
}

export async function loadCloudData(
  user: User,
  account: LocalAccount,
): Promise<CloudDataSnapshot> {
  const supabase = getSupabaseClient();
  const { data: parent, error } = await supabase
    .from('padres')
    .select('datos_app, datos_app_version')
    .eq('id_padre', user.id)
    .maybeSingle();

  if (error) throw new Error(`No se pudieron cargar los datos de Supabase: ${error.message}`);
  if (!parent) {
    throw new Error('No encontramos el perfil familiar de esta cuenta. Verifica que se haya aplicado el SQL de configuración.');
  }

  if (parent.datos_app === null) {
    const initialData = createEmptyUnifiedData(account);
    const version = await saveCloudData(user.id, initialData, parent.datos_app_version);
    return { data: initialData, version };
  }
  if (!isUnifiedData(parent.datos_app)) {
    throw new Error('Los datos familiares en Supabase no tienen el formato esperado. No se sobrescribieron.');
  }

  return { data: parent.datos_app, version: parent.datos_app_version };
}

export async function saveCloudData(
  userId: string,
  data: UnifiedData,
  expectedVersion: number,
): Promise<number> {
  if (!isUnifiedData(data)) {
    throw new Error('No se guardaron los cambios porque el formato nuevo no pasó la validación.');
  }
  const { data: updated, error } = await getSupabaseClient()
    .from('padres')
    .update({ datos_app: JSON.parse(JSON.stringify(data)) as Json })
    .eq('id_padre', userId)
    .eq('datos_app_version', expectedVersion)
    .select('datos_app_version')
    .maybeSingle();

  if (error) throw new Error(`No se pudieron guardar los cambios en Supabase: ${error.message}`);
  if (!updated) {
    throw new Error('Los datos cambiaron en otro dispositivo. Vuelve a cargar tu espacio para evitar sobrescribir cambios.');
  }
  return updated.datos_app_version;
}

export function subscribeToCloudData(
  userId: string,
  onData: (snapshot: CloudDataSnapshot) => void,
  onError: (error: Error) => void,
): RealtimeChannel {
  return getSupabaseClient()
    .channel(`family-data-${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'padres',
        filter: `id_padre=eq.${userId}`,
      },
      payload => {
        const row = payload.new;
        if (typeof row.datos_app_version !== 'number' || !isUnifiedData(row.datos_app)) {
          onError(new Error('Supabase envió datos familiares con un formato inesperado.'));
          return;
        }
        onData({ data: row.datos_app, version: row.datos_app_version });
      },
    )
    .subscribe(status => {
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        onError(new Error('No se pudo mantener la sincronización en tiempo real con Supabase.'));
      }
    });
}

export async function uploadEvidence(
  userId: string,
  uri: string,
  fileName: string | null | undefined,
  mimeType: string | null | undefined,
): Promise<string> {
  const contentType = mimeType || 'image/jpeg';
  const extension = fileName?.split('.').pop()?.replace(/[^a-zA-Z0-9]/g, '')
    || contentType.split('/').pop()?.replace(/[^a-zA-Z0-9]/g, '')
    || 'jpg';
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;
  const body = Platform.OS === 'web'
    ? await (await fetch(uri)).blob()
    : await new File(uri).arrayBuffer();

  const { data, error } = await getSupabaseClient()
    .storage
    .from(EVIDENCE_BUCKET)
    .upload(path, body, { contentType, upsert: false });
  if (error) throw new Error(`No se pudo subir la evidencia a Supabase: ${error.message}`);
  return data.path;
}

export async function deleteEvidence(path: string): Promise<void> {
  const { error } = await getSupabaseClient().storage.from(EVIDENCE_BUCKET).remove([path]);
  if (error) throw new Error(`No se pudo eliminar la evidencia de Supabase: ${error.message}`);
}

export async function getEvidenceUrl(path: string): Promise<string> {
  const { data, error } = await getSupabaseClient()
    .storage
    .from(EVIDENCE_BUCKET)
    .createSignedUrl(path, 60 * 60);
  if (error) throw new Error(`No se pudo abrir la evidencia: ${error.message}`);
  return data.signedUrl;
}
