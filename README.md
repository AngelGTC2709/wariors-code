# Warrior Kids

Aplicación móvil en español de México para acompañar hábitos saludables en familia. Usa Expo SDK 58, React Native y Expo Router. La ruta principal `/` y el alias `/familiar` muestran la misma experiencia.

## Ejecutar

```bash
npm install
npx expo start
```

Para generar un APK de distribución interna:

```bash
npx eas-cli@latest login
npm run build:android:apk
```

## Experiencia

- Perfiles infantiles privados por cuenta tutora, con sincronización entre dispositivos.
- Alta y edición de perfiles infantiles en cinco fases, con avatar ilustrado, edad, medidas, alergias, alimentos a prevenir y confirmación de datos.
- Navegación por rol: el menú semanal aparece en el espacio tutor y la niñez tiene un apartado dedicado a sus logros; las personas tutoras pueden revisar puntos e insignias.
- Registro de agua, grupos de alimentos, ánimo, descanso, movimiento y evidencia fotográfica opcional.
- Aprobación de actividades, puntos, retos y personalización de avatar con iconos vectoriales.
- Catálogo de recetas, búsqueda y filtros, menú semanal de desayuno, comida y cena, y plan educativo del Plato del Buen Comer.
- Preferencias de alergias y alimentos que se prefieren evitar, preguntas frecuentes y respuestas predefinidas de NutriBot.
- Vinculación manual de perfiles de NutriBot Familiar y Warrior Kids. Los valores diferentes y sus fuentes se conservan.

## Configuración de Supabase

1. En Supabase, abre **SQL Editor** y ejecuta [`supabase/setup.sql`](./supabase/setup.sql). Se asume que `public.padres` ya existe con `id_padre uuid` como PK/FK a `auth.users(id)`. El script agrega `datos_app` y `datos_app_version`, crea por trigger las filas de tutores nuevos y hace backfill de cuentas existentes.
2. En la autenticación del proyecto, habilita **Email**. Si está activa la confirmación de correo, cada persona debe confirmar su dirección antes de iniciar sesión.
3. La raíz del proyecto debe tener `.env.local` con `EXPO_PUBLIC_SUPABASE_URL` y `EXPO_PUBLIC_SUPABASE_ANON_KEY`. No uses una clave `service_role` o `sb_secret_` en la app; estas variables públicas terminan incluidas en el bundle.
4. En **Authentication → URL Configuration → Redirect URLs**, agrega `warriorkids://reset-password` para las builds instaladas de la app. Para Expo Go, agrega la URL de desarrollo que construye Expo, con el segmento `--/reset-password` (por ejemplo, `exp://<host>:<puerto>/--/reset-password`); la dirección cambia según el servidor. En web, agrega también el callback de desarrollo o el dominio publicado que uses.
5. En **Authentication → Email Templates → Reset Password**, ajusta el enlace para entregar a la app el token hash de recuperación:

   ```html
   <a href="{{ .RedirectTo }}?token_hash={{ .TokenHash }}&amp;type=recovery">Restablecer contraseña</a>
   ```

   El flujo de la app verifica ese token como tipo `recovery` antes de permitir el cambio de contraseña. El callback enviado por la app es `warriorkids://reset-password`; para builds instaladas, el esquema `warriorkids` ya está configurado en `app.json`.
6. Ejecuta `npx expo start` para volver a cargar la configuración.

La app usa Supabase Auth para las cuentas de tutor. Los perfiles infantiles no tienen credenciales propias: cada tutor inicia sesión y cambia entre los perfiles de su familia. Por privacidad, la sesión no se conserva al cerrar la app. La app guarda el estado actual de la experiencia en `padres.datos_app`; las demás tablas del esquema tienen RLS y políticas propias, pero todavía no se consumen desde esta app cliente.

Los cambios se sincronizan en tiempo real. Si dos dispositivos guardan cambios al mismo tiempo, la app detecta el conflicto y evita sobrescribir silenciosamente los datos. Las fotos de evidencia se guardan en el bucket privado `activity-evidence` y se restringen a la cuenta propietaria.

En el primer inicio de sesión correcto, se crea un espacio vacío para esa cuenta y se eliminan del dispositivo las claves locales antiguas de NutriBot y Warrior Kids. No se importan los datos locales anteriores. Los datos de otras cuentas de Supabase no se modifican.

La fila de cada tutor se identifica con `padres.id_padre = auth.uid()`. RLS permite al cliente leer los campos de perfil y actualizar únicamente `datos_app`; el trigger de Auth crea filas nuevas y el trigger de versión incrementa `datos_app_version` cuando cambia el JSONB. `supabase/setup.sql` mantiene el bucket privado `activity-evidence`, con acceso a objetos limitado a carpetas cuyo primer segmento es el UUID del usuario.

El esquema nuevo también incluye `hijos`, `cat_tipo_deporte`, `cat_intensidad`, `cat_materia`, `retos`, `actividades_fisicas`, `actividades_didacticas`, `hijo_reto`, `recompensas`, `canjes_recompensa`, `planes_alimenticios`, `recetas` y `plan_receta`, además de las vistas `v_padres_nombre` y `v_puntos_hijo`. Sus políticas RLS existentes se conservan y los permisos de escritura de `anon` se revocan; **la app cliente todavía no lee ni escribe esas tablas**. No se migran datos de `datos_app` a ese esquema en esta fase.

Las recetas y el plan son ideas educativas, no indicaciones médicas ni menús personalizados. Revisa ingredientes, etiquetas y posibles contaminaciones cruzadas; consulta a profesionales de salud ante alergias o dudas. Las actividades físicas son recreativas y deben contar con supervisión adulta. NutriBot utiliza respuestas predefinidas, no es un servicio de IA ni brinda diagnósticos.
