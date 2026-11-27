import AsyncStorage from '@react-native-async-storage/async-storage';
import { AESEncryptionKey, AESSealedData, aesDecryptAsync, aesEncryptAsync } from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

import { utf8Decode, utf8Encode } from '@/lib/utf8';

// Almacenamiento cifrado del teléfono (Android/iOS). Los datos van cifrados con AES-256-GCM en
// AsyncStorage; la llave se genera en el dispositivo y vive en el almacén seguro del sistema
// (Keystore en Android, Keychain en iOS). En web no existe: ver encrypted-storage.web.ts.

export type EncryptedStorage = {
  getItem: (name: string) => Promise<string | null>;
  setItem: (name: string, value: string) => Promise<void>;
  removeItem: (name: string) => Promise<void>;
};

const KEY_NAME = 'wk_local_data_key';
const PREFIX = 'wkenc1:';
let keyPromise: Promise<AESEncryptionKey> | null = null;

async function loadKey(): Promise<AESEncryptionKey> {
  const stored = await SecureStore.getItemAsync(KEY_NAME);
  if (stored) return (await AESEncryptionKey.import(stored, 'hex')) as AESEncryptionKey;
  // Solo se crea una llave nueva si no había ninguna; un error al leerla nunca la reemplaza.
  const key = (await AESEncryptionKey.generate()) as AESEncryptionKey;
  await SecureStore.setItemAsync(KEY_NAME, await key.encoded('hex'));
  return key;
}

function getKey(): Promise<AESEncryptionKey> {
  keyPromise ??= loadKey().catch(error => {
    keyPromise = null;
    throw error;
  });
  return keyPromise;
}

export const encryptedStorage: EncryptedStorage | null = {
  async getItem(name) {
    const raw = await AsyncStorage.getItem(name);
    if (!raw) return null;
    // Nunca se acepta un valor sin cifrar.
    if (!raw.startsWith(PREFIX)) {
      await AsyncStorage.removeItem(name);
      return null;
    }
    const key = await getKey();
    try {
      const sealed = AESSealedData.fromCombined(raw.slice(PREFIX.length));
      return utf8Decode(await aesDecryptAsync(sealed, key, { output: 'bytes' }));
    } catch {
      // Datos alterados o cifrados con otra llave: no se pueden leer, así que se descartan.
      await AsyncStorage.removeItem(name);
      return null;
    }
  },
  async setItem(name, value) {
    const sealed = await aesEncryptAsync(utf8Encode(value), await getKey());
    await AsyncStorage.setItem(name, PREFIX + await sealed.combined('base64'));
  },
  removeItem: name => AsyncStorage.removeItem(name),
};
