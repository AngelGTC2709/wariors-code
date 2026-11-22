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
npx expo install <pkg>      # USA SIEMPRE esto en vez de npm install para dependencias de Expo/RN
npx expo-doctor             # diagnóstico de dependencias/configuración
npm run build:android:apk   # compilación EAS preview -> APK interno
```

- **No hay script de pruebas, framework de pruebas ni CI**. No inventes pruebas ni afirmes que se ejecutaron; verifica con `npm run lint` + `npx tsc --noEmit`. La línea base es 0 errores y 2 advertencias (variables sin usar en `use-color-scheme.web.ts`); no las corrijas salvo que la tarea toque ese archivo.
- **Nunca ejecutes `npm run reset-project`**: el script de plantilla mueve/reemplaza `src` y `scripts`.
- EAS no es una dependencia del repo. Haz login con `npx eas-cli@latest login` y luego `npm run build:android:apk`; ese script llama directamente a `eas`, así que tenlo en PATH o ejecuta `npx eas-cli@latest build --platform android --profile preview`. `eas.json` solo tiene el perfil `preview` (no hay producción).

## Supabase (obligatorio)

- Antes de `npm start`, ejecuta `supabase/setup.sql` en el SQL Editor. El script asume que `public.padres` ya existe con `id_padre uuid` como FK a `auth.users(id)`; agrega `datos_app` y `datos_app_version`, crea perfiles de tutor con un trigger al registrar usuarios y completa los perfiles faltantes. También configura RLS y grants de `padres`, agrega `padres` a Realtime y crea el bucket privado `activity-evidence` con políticas por carpeta de usuario.
- Crea `.env.local` en la raíz con `EXPO_PUBLIC_SUPABASE_URL` y `EXPO_PUBLIC_SUPABASE_ANON_KEY`. Nunca uses una `service_role`/`sb_secret_` en la app: las variables `EXPO_PUBLIC_*` terminan en el bundle. `.env.local` ya está ignorado por git; reinicia `npm start` después de cambiarlo.
- Habilita Email en Supabase Auth. Si la confirmación de correo está activa, el registro no inicia sesión hasta confirmar la dirección.
- El cliente solo puede leer y actualizar su propia fila de `padres`, identificada por `id_padre = auth.uid()`. El esquema también contiene `hijos`, `cat_tipo_deporte`, `cat_intensidad`, `cat_materia`, `retos`, `actividades_fisicas`, `actividades_didacticas`, `hijo_reto`, `recompensas`, `canjes_recompensa`, `planes_alimenticios`, `recetas` y `plan_receta`; todavía no se usan desde la app cliente. Sus políticas RLS existentes se conservan; no amplíes su acceso sin revisar la propiedad por tutor. Si cambias el esquema, actualiza `supabase/setup.sql` y el tipo `Database` de `src/lib/supabase.ts`.
- Sin `.env.local` o sin red, la app no carga datos: no hay modo offline ni respaldo local activo.

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

- Los datos viven en `public.padres.datos_app` (JSONB), una fila por usuario de Supabase Auth; `padres.id_padre` es el UUID de `auth.users.id` y RLS permite leer/actualizar solo cuando `id_padre = (select auth.uid())`. No hay persistencia local activa.
- `loadCloudData()` carga la fila; si `datos_app` es `null`, crea el espacio vacío con `createEmptyUnifiedData()` y lo guarda. Después de cargar, `clearLegacyLocalData()` borra las claves locales antiguas (NutriBot, Warrior Kids y la unificada); no se importan datos locales.
- `UnifiedData` + `isUnifiedData` en `model.ts` son el esquema. Cualquier campo nuevo debe agregarse a ambos; `saveCloudData()` valida antes de escribir y `createEmptyUnifiedData()` debe inicializarlo. `loadUnifiedData()`/`saveUnifiedData()` siguen en `model.ts` pero ya no los usa la app activa.
- Todas las escrituras pasan por `updateData`: actualiza `dataRef` de forma optimista, serializa con `writeQueue` y llama a `saveCloudData()` con la versión esperada. No escribas directo en Supabase ni en `dataRef`.
- `datos_app_version` lo incrementa un trigger; no lo modifiques a mano. Si la versión cambió en otro dispositivo, `saveCloudData()` falla, la UI bloquea escrituras (`writesBlocked`) y hay que recargar para evitar sobrescribir.
- `subscribeToCloudData()` mantiene Realtime: ignora snapshots mientras hay escrituras pendientes o si la versión es vieja. Si agregas otra ruta de escritura, respeta `pendingWrites`/`dataVersion`.
- La autenticación es Supabase Auth con correo y contraseña, solo para tutores; los perfiles infantiles no tienen credenciales. Cambiar de Niñez a Tutor exige verificar la contraseña de la cuenta actual; cambiar a Niñez es libre y fija un único perfil elegido por el tutor. En modo Niñez no se puede cambiar de perfil; si deja de existir por una actualización remota, no selecciones otro automáticamente ni permitas registrar actividad. La verificación usa `signInWithPassword`; el evento de autenticación con el mismo `user.id` no debe reiniciar `loadData` ni Realtime. La contraseña del modal se limpia al cerrar o terminar la verificación y no se persiste. `persistSession: false`: al cerrar la app se cierra la sesión.
- Los perfiles se derivan con `buildProfiles()` a partir de ambos arreglos fuente más los `profileLinks` manuales. `dailyLogs`, `childProgress` y `missionClaims` usan `progressKey` (`nutribot:<id>`, `warrior-kids:<id>`; los vinculados usan la clave de Warrior Kids); `avatarSelections` usa `profile.key`.
- La evidencia fotográfica se sube al bucket privado `activity-evidence` en una ruta `${userId}/...`; en `datos_app` solo se guarda la ruta. Se muestra con URL firmada y al rechazar una actividad se borra el objeto remoto.
- Las respuestas del chat son locales/predefinidas — no hay IA ni API externa.

## Configuración y nativo

- `ios/` y `android/` están en `.gitignore` y se generan (CNG). Configura el comportamiento nativo en `app.json` y los config plugins; nunca los crees ni edites a mano.
- `experiments.typedRoutes` y `experiments.reactCompiler` están habilitados. Las rutas nuevas deben existir antes de que las cadenas de ruta pasen la verificación de tipos; `npm start` regenera `.expo/types`.
- `SplashScreen.preventAutoHideAsync()` se ejecuta en `_layout.tsx` y `AnimatedSplashOverlay` lo oculta. No agregues una segunda llamada para ocultarlo.
- `react-native-reanimated.d.ts` es un stub intencional sin tipos — no lo borres.
- Expo Go solo incluye sus propios módulos nativos. Después de agregar una librería nativa, usa un dev build: `npx expo run:ios|android` (o agrega primero un perfil de desarrollo a `eas.json`).
- Prefiere módulos oficiales de Expo sobre librerías de terceros; revisa las skills disponibles antes de agregar dependencias. Docs: https://docs.expo.dev/versions/latest/index.md
