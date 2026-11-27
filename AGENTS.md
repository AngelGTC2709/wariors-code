# FamilyWellnessApp (Warrior Kids / NutriBot Familiar)

Aplicación móvil con Expo SDK 58 + React Native 0.88 + Expo Router. Todo el texto visible está en español (México); mantén las cadenas nuevas en español y con el mismo tono. `README.md` es la descripción del producto y la configuración de Supabase.

## Expo ha cambiado — no confíes en tus datos de entrenamiento

Antes de escribir código que use APIs de Expo, EAS o React Native:

1. Lee la versión mayor de `expo` en `package.json` (ahora 58).
2. Consulta la documentación correspondiente: `https://docs.expo.dev/versions/v58.0.0/`.
3. Para lo demás, empieza en https://docs.expo.dev/llms.txt y sigue la página específica. Nunca respondas de memoria.

## Comandos

npm es el gestor de paquetes (`package-lock.json`; no hay `bun.lock`/`yarn.lock`).

```bash
npm install                 # instala dependencias
npm start                   # expo start; también regenera .expo/types
npm run android|ios|web     # inicia en una plataforma
npm run lint                # expo lint; lento la primera vez (minutos)
npx tsc --noEmit            # verificación de tipos (modo estricto)
npx tsc --noEmit -p tests   # verificación de tipos de las pruebas
npm test                    # pruebas con node --test (Node 24, sin dependencias nuevas)
npx expo install <pkg>      # USA SIEMPRE esto en vez de npm install para dependencias de Expo/RN
npx expo-doctor             # diagnóstico de dependencias/configuración
npm run build:android:apk   # compilación EAS preview -> APK interno
```

- **Las pruebas viven en `tests/` y cubren lógica pura** (validación de perfil infantil, reglas de progreso y contraste); no hay pruebas de componentes, end-to-end ni CI. No afirmes que se ejecutaron sin correrlas; verifica con `npm run lint`, `npx tsc --noEmit`, `npx tsc --noEmit -p tests` y `npm test`. La línea base es 0 errores y 2 advertencias (variables sin usar en `use-color-scheme.web.ts`); no las corrijas salvo que la tarea toque ese archivo.
- **Nunca ejecutes `npm run reset-project`**: el script de plantilla mueve/reemplaza `src` y `scripts`.
- EAS no es una dependencia del repo. Haz login con `npx eas-cli@latest login` y luego `npm run build:android:apk`; ese script llama directamente a `eas`, así que tenlo en PATH o ejecuta `npx eas-cli@latest build --platform android --profile preview`. `eas.json` solo tiene el perfil `preview` (no hay producción).

## Supabase (obligatorio)

- Antes de `npm start`, ejecuta `supabase/setup.sql` en el SQL Editor. El script asume que `public.padres` ya existe con `id_padre uuid` como FK a `auth.users(id)`; agrega `datos_app` y `datos_app_version`, crea perfiles de tutor con un trigger al registrar usuarios y completa los perfiles faltantes. También configura RLS y grants de `padres`, agrega `padres` a Realtime y crea el bucket privado `activity-evidence` con políticas por carpeta de usuario.
- Crea `.env.local` en la raíz con `EXPO_PUBLIC_SUPABASE_URL` y `EXPO_PUBLIC_SUPABASE_ANON_KEY`. Nunca uses una `service_role`/`sb_secret_` en la app: las variables `EXPO_PUBLIC_*` terminan en el bundle. `.env.local` ya está ignorado por git; reinicia `npm start` después de cambiarlo.
- Habilita Email en Supabase Auth. Si la confirmación de correo está activa, el registro no inicia sesión hasta confirmar la dirección.
- El cliente solo puede leer y actualizar su propia fila de `padres`, identificada por `id_padre = auth.uid()`. Gestión y los perfiles también usan `hijos`, `cat_tipo_deporte`, `cat_intensidad`, `cat_materia`, `retos`, `actividades_fisicas`, `actividades_didacticas`, `recompensas` y `recetas`. `hijo_reto`, `canjes_recompensa`, `planes_alimenticios` y `plan_receta` se conservan, pero la app no las lee: sus equivalentes viven en `datos_app` (`familyAssignments`, `rewardRequests`, `mealPlans`). Sus políticas RLS existentes se conservan; no amplíes su acceso sin revisar la propiedad por tutor. Si cambias el esquema, actualiza `supabase/setup.sql` y el tipo `Database` de `src/lib/supabase.ts`.
- Sin `.env.local` la app no carga datos. Sin red, en Android/iOS abre con la copia cifrada del teléfono si ya se había iniciado sesión (ver "Modo sin conexión"); en web solo aguanta cortes con la pestaña abierta.

## Arquitectura

- **App activa**: tanto `/` (`src/app/index.tsx`) como `/familiar` (`src/app/familiar.tsx`) renderizan `<UnifiedApp />` desde `src/features/unified/screen.tsx` (~3k líneas). Ahí viven la UI actual, las pestañas, formularios, modales y el estado de sesión.
- `src/app/index.tsx` y `src/app/familiar.tsx` solo hacen `export { default } from '@/features/unified/screen'`. No vuelvas a poner lógica de pantalla en los archivos de ruta.
- En `src/features/unified/`: `screen.tsx` es la UI/estado; `cloud-data.ts` concentra lecturas, escrituras, Realtime y Storage de Supabase; `evidence-photo.tsx` resuelve URLs firmadas; `model.ts` define tipos, validación y datos iniciales; `ui.tsx` tiene primitivas/iconos/estilos; `constants.ts` tiene catálogos estáticos.
- `src/lib/supabase.ts` es el único cliente Supabase (singleton), lee las variables `EXPO_PUBLIC_*` y define el tipo `Database`. Importa `react-native-url-polyfill/auto`; no lo quites.
- Catálogos de contenido: `src/constants/warrior-kids.ts` (actividades, recetas, avatares) y `src/constants/family-wellness.ts` (opciones de avatar, plan de dieta).
- `src/app/_layout.tsx` es un `Stack` sin encabezado con `ThemeProvider`; las rutas activas son `/`, `/familiar` y `/reset-password`. No hay pestañas montadas. `src/components/app-tabs*.tsx` son restos de plantilla sin usar que referencian una ruta `explore` inexistente; no los conectes sin crear esas rutas.
- Alias de rutas: `@/*` → `src/*`, `@/assets/*` → `assets/*`.
- No hay NativeWind/Tailwind. La UI activa usa `StyleSheet.create` con `COLORS`/`TYPE` en el módulo unificado; el patrón legacy `crearEstilos(T)`/`TemaContext` solo aplica al código legacy muerto. `src/global.css` solo define variables de fuentes para web y se importa desde `src/constants/theme.ts`.
- Las variantes por plataforma usan archivos `.web.tsx` (`animated-icon`, `app-tabs`, `use-color-scheme`); sigue ese patrón para comportamiento específico de web.
- `interfas/` contiene PDFs de referencia de UI en español (inicio de sesión, paneles, avatar, espacio de tutores, recetas, menú, ajustes).

## Datos y sincronización (fácil de romper)

- Los datos viven en `public.padres.datos_app` (JSONB), una fila por usuario de Supabase Auth; `padres.id_padre` es el UUID de `auth.users.id` y RLS permite leer/actualizar solo cuando `id_padre = (select auth.uid())`. Es la fuente de verdad; el teléfono guarda solo una copia de trabajo cifrada.
- `loadCloudData()` carga la fila; si `datos_app` es `null`, crea el espacio vacío con `createEmptyUnifiedData()` y lo guarda. Después de cargar, `clearLegacyLocalData()` borra las claves locales antiguas (NutriBot, Warrior Kids y la unificada); no se importan datos locales.
- `UnifiedData` + `isUnifiedData` en `model.ts` son el esquema. Cualquier campo nuevo debe agregarse a ambos; `saveCloudData()` valida antes de escribir y `createEmptyUnifiedData()` debe inicializarlo. `loadUnifiedData()`/`saveUnifiedData()` siguen en `model.ts` pero ya no los usa la app activa.
- Todas las escrituras pasan por `updateData`: actualiza `dataRef` de forma optimista, marca `dirtyRef` y, con internet, encola `syncPending()` en `writeQueue`, que guarda con la versión de `baseRef` (última versión confirmada por la nube). No escribas directo en Supabase ni en `dataRef`.
- `datos_app_version` lo incrementa un trigger; no lo modifiques a mano. Si otro dispositivo guardó antes, `saveCloudData()` lanza un error con `isVersionConflict()`; `syncPending()` recarga, combina con `mergeThreeWay(base, local, remoto)` (`offline-merge.ts`) y reintenta. Solo un error que no sea de red ni de versión bloquea escrituras (`writesBlocked`).
- `subscribeToCloudData()` mantiene Realtime: ignora snapshots mientras hay cambios locales pendientes (`dirtyRef`) o si la versión es vieja, y actualiza `baseRef` al aceptar uno.
- **Modo sin conexión** (Android/iOS): la sesión de Supabase y una copia del espacio (`offline-cache.ts`) se guardan en AsyncStorage cifradas con AES-256-GCM (`src/lib/encrypted-storage.ts`, `expo-crypto`); la llave se crea en el teléfono y vive en `expo-secure-store`. En web `encrypted-storage.web.ts` exporta `null`: no se guarda nada y `persistSession` queda en `false`. Al abrir sin red se usa la cuenta guardada (solo existe si no se cerró sesión) y se restaura el último modo y perfil; al volver la red se confirma la sesión, se recarga y se combinan los cambios. Sin red no funcionan Gestión, fotos, NutriBot, guardar datos de salud ni volver de Niñez a Tutor (la contraseña se verifica en línea). Cerrar sesión borra la copia y se bloquea si hay cambios sin subir.
- La autenticación es Supabase Auth con correo y contraseña, solo para tutores; los perfiles infantiles no tienen credenciales. Cambiar de Niñez a Tutor exige verificar la contraseña de la cuenta actual; cambiar a Niñez es libre y fija un único perfil elegido por el tutor. En modo Niñez no se puede cambiar de perfil; si deja de existir por una actualización remota, no selecciones otro automáticamente ni permitas registrar actividad. La verificación usa `signInWithPassword`; el evento de autenticación con el mismo `user.id` no debe reiniciar `loadData` ni Realtime. La contraseña del modal se limpia al cerrar o terminar la verificación y no se persiste. En Android/iOS la sesión se conserva cifrada al cerrar la app; al reabrirla se vuelve al último modo (si estaba en Niñez, sigue en Niñez). Iniciar sesión con contraseña siempre entra a Tutor. En web, al cerrar se cierra la sesión.
- Los perfiles se derivan con `buildProfiles()` a partir de ambos arreglos fuente más los `profileLinks` manuales. `dailyLogs`, `childProgress` y `missionClaims` usan `progressKey` (`nutribot:<id>`, `warrior-kids:<id>`; los vinculados usan la clave de Warrior Kids); `avatarSelections` usa `profile.key`.
- La evidencia fotográfica se sube al bucket privado `activity-evidence` en una ruta `${userId}/...`; en `datos_app` solo se guarda la ruta. Se muestra con URL firmada y al rechazar una actividad se borra el objeto remoto.
- `recompensas.cantidad_disponible` es el total de unidades. Lo que queda se deriva con `rewardStockLeft()`: cada pedido no cancelado de `rewardRequests` aparta una unidad. No lo descuentes también en Supabase.
- NutriBot usa la Edge Function `supabase/functions/nutribot-chat`, que envía los últimos mensajes del chat a la API de Google Gemini (`GEMINI_API_KEY` solo en el servidor). Es un servicio externo que recibe texto escrito por menores: no amplíes los datos enviados ni afirmes que el chat es local.

## Configuración y nativo

- `ios/` y `android/` están en `.gitignore` y se generan (CNG). Configura el comportamiento nativo en `app.json` y los config plugins; nunca los crees ni edites a mano.
- `experiments.typedRoutes` y `experiments.reactCompiler` están habilitados. Las rutas nuevas deben existir antes de que las cadenas de ruta pasen la verificación de tipos; `npm start` regenera `.expo/types`.
- `SplashScreen.preventAutoHideAsync()` se ejecuta en `_layout.tsx` y `AnimatedSplashOverlay` lo oculta. No agregues una segunda llamada para ocultarlo.
- `react-native-reanimated.d.ts` es un stub intencional sin tipos — no lo borres.
- Expo Go solo incluye sus propios módulos nativos. Después de agregar una librería nativa, usa un dev build: `npx expo run:ios|android` (o agrega primero un perfil de desarrollo a `eas.json`).
- Prefiere módulos oficiales de Expo sobre librerías de terceros; revisa las skills disponibles antes de agregar dependencias. Docs: https://docs.expo.dev/versions/latest/index.md
