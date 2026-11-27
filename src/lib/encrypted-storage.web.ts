import type { EncryptedStorage } from '@/lib/encrypted-storage';

// En web no hay almacén seguro para la llave, así que no se guarda la sesión ni una copia de los
// datos: la app sigue funcionando durante un corte solo mientras la pestaña siga abierta.
export const encryptedStorage: EncryptedStorage | null = null;
