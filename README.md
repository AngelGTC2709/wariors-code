# Warrior Kids

Aplicación móvil en español de México para acompañar hábitos saludables en familia. Usa Expo SDK 58, React Native y Expo Router. La ruta principal `/` y el alias `/familiar` muestran la misma experiencia; `/reset-password` atiende la recuperación de contraseña.

## Ejecutar

```bash
npm install
npx expo start
```

Los iconos de aplicación se configuran para iOS y Android en `app.json`; sus recursos están en `assets/images/` (icono cuadrado para iOS, capas adaptativas para Android y logo transparente para la pantalla de inicio).

Para generar builds de prueba de distribución interna (APK para Android e IPA para iOS):

```bash
npm install --global eas-cli
eas login
eas whoami
npm run build:android:apk
npm run build:ios:ipa
```

También puedes iniciar ambas compilaciones juntas con `npm run build:preview`. El perfil `preview` genera un APK instalable para Android y una IPA de distribución interna para iOS. EAS puede administrar la firma de Android; para iOS necesitarás iniciar sesión con una cuenta del Apple Developer Program y seguir los pasos de firma que solicite EAS. Para instalar la IPA en dispositivos físicos, sigue el registro de dispositivos que indique EAS.

Antes de compilar, configura `EXPO_PUBLIC_SUPABASE_URL` y `EXPO_PUBLIC_SUPABASE_ANON_KEY` en **expo.dev → proyecto → Settings → Environment variables**, con entorno `preview` y visibilidad **Plain text**. `.env.local` solo sirve para desarrollo local y no se incluye en builds remotas.

## Experiencia

- Perfiles infantiles privados por cuenta tutora, con sincronización entre dispositivos.
- Alta y edición de perfiles infantiles en seis fases, con avatar, datos (fecha de nacimiento con edad calculada) y dictamen del especialista, selección por grupos de alimentos y confirmación.
- Navegación por rol: el menú semanal aparece en el espacio tutor y la niñez tiene un apartado dedicado a sus logros; las personas tutoras pueden revisar puntos e insignias.
- Registro de agua, grupos de alimentos, ánimo, descanso, movimiento y evidencia fotográfica.
- Inicio infantil con secciones plegables y gráfica semanal de agua, alimentación y descanso.
- Actividades de movimiento con escenas animadas del jaguar, pasos y consejos de seguridad; las animaciones respetan la preferencia de movimiento reducido.
- Aprobación de actividades, puntos, retos y personalización de avatar con iconos vectoriales.
- Preferencia de sonido y música sincronizada; por ahora no reproduce audio.
- Catálogo de recetas, búsqueda y filtros, menú semanal de desayuno, comida y cena, y plan educativo del Plato del Buen Comer.
- Buscador y filtros al asignar recetas al menú; los ingredientes relacionados con alergias registradas se destacan de forma orientativa.
- Avisos orientativos de alergias y alimentos que gustan o se prefieren evitar, preguntas frecuentes y chat de NutriBot con Gemini. El dictamen no asigna planes automáticamente.
- Vinculación manual de perfiles de NutriBot Familiar y Warrior Kids. Los valores diferentes y sus fuentes se conservan.

## Configuración de Supabase

1. En Supabase, abre **SQL Editor** y ejecuta [`supabase/setup.sql`](./supabase/setup.sql). Se asume que `public.padres` ya existe con `id_padre uuid` como PK/FK a `auth.users(id)`. El script agrega `datos_app` y `datos_app_version`, crea por trigger las filas de tutores nuevos y hace backfill de cuentas existentes.
2. En la autenticación del proyecto, habilita **Email**. Si está activa la confirmación de correo, cada persona debe confirmar su dirección antes de iniciar sesión.
3. La raíz del proyecto debe tener `.env.local` con `EXPO_PUBLIC_SUPABASE_URL` y `EXPO_PUBLIC_SUPABASE_ANON_KEY`. No uses una clave `service_role` o `sb_secret_` en la app; estas variables públicas terminan incluidas en el bundle.
   Para generar el APK con EAS, agrega también ambas variables en **expo.dev → proyecto → Settings → Environment variables**, selecciona el entorno `preview` y usa visibilidad **Plain text**. `.env.local` está excluido de Git y no se envía a las compilaciones remotas; por eso tenerlo configurado localmente no basta para una APK. Después vuelve a generar el APK con `npm run build:android:apk`.
4. En **Authentication → URL Configuration → Redirect URLs**, agrega `warriorkids://reset-password` para las builds instaladas de la app. Para Expo Go, agrega la URL de desarrollo que construye Expo, con el segmento `--/reset-password` (por ejemplo, `exp://<host>:<puerto>/--/reset-password`); la dirección cambia según el servidor. En web, agrega también el callback de desarrollo o el dominio publicado que uses.
5. En **Authentication → Email Templates → Reset Password**, ajusta el enlace para entregar a la app el token hash de recuperación:

   ```html
   <a href="{{ .RedirectTo }}?token_hash={{ .TokenHash }}&amp;type=recovery"
     >Restablecer contraseña</a
   >
   ```

   El flujo de la app verifica ese token como tipo `recovery` antes de permitir el cambio de contraseña. El callback enviado por la app es `warriorkids://reset-password`; para builds instaladas, el esquema `warriorkids` ya está configurado en `app.json`.

6. Ejecuta `npx expo start` para volver a cargar la configuración.

### Configurar NutriBot con Gemini

NutriBot llama a Gemini desde la función autenticada `supabase/functions/nutribot-chat/index.ts`; la app no recibe la clave de Gemini.

1. En Supabase, abre **Edge Functions → Secrets** y agrega `GEMINI_API_KEY` con la clave creada en Google AI Studio. No la pongas en una variable `EXPO_PUBLIC_*`, en variables de EAS ni en archivos que se suban al repositorio.
2. Despliega la función `nutribot-chat` desde Supabase CLI o desde el editor de Edge Functions del Dashboard. Mantén activada la verificación JWT: la función solo acepta solicitudes de una sesión iniciada.
3. Quita la clave de Gemini de `.env.local`; la app solo necesita `EXPO_PUBLIC_SUPABASE_URL` y `EXPO_PUBLIC_SUPABASE_ANON_KEY`. Reinicia Expo después de cambiar `.env.local`. Cambiar el secreto del backend no requiere generar otro APK.

El chat envía a Google el texto escrito y el contexto reciente de esa conversación para generar cada respuesta. No se guarda el historial en la app y las solicitudes usan `store: false` para no guardar interacciones en Gemini. Aun así, evita compartir datos personales; el bot es una herramienta educativa, no un servicio médico.

La app usa Supabase Auth para las cuentas de tutor. Los perfiles infantiles no tienen credenciales propias: cada tutor inicia sesión y cambia entre los perfiles de su familia. Por privacidad, la sesión no se conserva al cerrar la app. Los hábitos, avances, puntos, menús semanales y preferencias de la experiencia siguen en `padres.datos_app`, con control de versión y sincronización en tiempo real.

Los cambios se sincronizan en tiempo real. Si dos dispositivos guardan cambios al mismo tiempo, la app detecta el conflicto y evita sobrescribir silenciosamente los datos. Las fotos de evidencia se guardan en el bucket privado `activity-evidence` y se restringen a la cuenta propietaria.

En el primer inicio de sesión correcto, se crea un espacio vacío para esa cuenta y se eliminan del dispositivo las claves locales antiguas de NutriBot y Warrior Kids. No se importan los datos locales anteriores. Los datos de otras cuentas de Supabase no se modifican.

La fila de cada tutor se identifica con `padres.id_padre = auth.uid()`. RLS permite al cliente leer los campos de perfil y actualizar únicamente `datos_app`; el trigger de Auth crea filas nuevas y el trigger de versión incrementa `datos_app_version` cuando cambia el JSONB. `supabase/setup.sql` mantiene el bucket privado `activity-evidence`, con acceso a objetos limitado a carpetas cuyo primer segmento es el UUID del usuario.

La pantalla de perfiles lee y guarda `hijos`, la medición más reciente en `mediciones_hijo`, la valoración más reciente en `valoraciones_salud` y las preferencias de `hijo_ingrediente`/`ingredientes`. Un perfil infantil que ya estaba en `datos_app` no se asocia por coincidencia de nombre: la persona tutora debe autorizar expresamente la sincronización. La eliminación del perfil sincronizado elimina su fila; las relaciones dependientes siguen las cascadas definidas por el esquema.

Al sincronizar por primera vez un perfil con las tablas de salud se requieren fecha de nacimiento, peso, estatura y una valoración explícita: un dictamen dado por una persona especialista o la indicación de que no se acudió a una. El alta inicial de perfil, medición y valoración se realiza en una sola transacción con `crear_perfil_infantil`. Los perfiles sin esa sincronización pueden seguir omitiendo las mediciones y el dictamen. Para una base existente aplica [`20261124011330_create_child_profile_atomic.sql`](./supabase/migrations/20261124011330_create_child_profile_atomic.sql) antes de usar la versión actualizada de la app; el mismo cambio está en `supabase/setup.sql` para instalaciones nuevas.

Recetas consulta el catálogo de solo lectura `catalogo_recetas_warrior_kids` y conserva las recetas normalizadas existentes mediante `recetas`, `receta_ingrediente` e `ingredientes`. La migración [`20261117063642_create_recipe_catalog_warrior_kids.sql`](./supabase/migrations/20261117063642_create_recipe_catalog_warrior_kids.sql) crea el catálogo e importa de forma repetible los 78 registros de `recetas_warrior_kids.csv`, con `codigo` único y una relación `id_receta` hacia `recetas`. Para mantener la clave foránea existente, también crea en `recetas` solo los registros base cuyo título normalizado aún no existe; no duplica títulos existentes ni modifica sus datos. `plan_receta` conserva su esquema y solo recibe relaciones cuando se asigna una receta a un plan real. Las recetas se pueden buscar, consultar y seleccionar al asignar planes, sin asignarlas automáticamente a un plan, hijo o fecha. El menú semanal familiar sigue guardado en `datos_app`, ya que no contiene una meta calórica ni un rango de fechas con los que crear un `planes_alimenticios` sin inventar datos. Movimiento lee `catalogo_actividades_fisicas`, una tabla de solo lectura que [`supabase/setup.sql`](./supabase/setup.sql) crea y llena con los 20 registros de `actividades_fisicas_segmentos.csv`; cada campo del catálogo se muestra en su ficha y no se escriben valores derivados al catálogo.

La pestaña **Gestión** usa las tablas existentes para crear, editar y eliminar `retos`. Las asignaciones por perfil, los pedidos de premios y los planes se guardan en `datos_app` (`familyAssignments`, `rewardRequests` y `mealPlans`), así funcionan para todos los perfiles aunque no tengan datos de salud sincronizados. La app ya no lee `hijo_reto`, `canjes_recompensa`, `planes_alimenticios` ni `plan_receta`; esas tablas y sus datos se conservan sin cambios. Al verificar un reto, el perfil recibe los puntos definidos en ese reto. También administra actividades físicas y didácticas vinculadas a retos mediante `actividades_fisicas` y `actividades_didacticas`. Los catálogos `cat_tipo_deporte`, `cat_intensidad` y `cat_materia` se consultan como opciones de solo lectura y las políticas RLS existentes limitan las actividades a retos de la cuenta. La misma pestaña administra `recompensas`, sus pedidos y los planes por perfil. Las recetas del plan se eligen del catálogo normalizado y su fecha debe quedar dentro de la vigencia del plan.

Los planes requieren un perfil de `hijos` ya sincronizado con consentimiento, una meta calórica y fechas que la persona tutora captura porque no se pueden derivar del esquema. La app no calcula ni asigna metas. `puntos_gastados` del canje y el inventario de `cantidad_disponible` se administran como campos de sus tablas; no modifican automáticamente los puntos que permanecen en `padres.datos_app`. No se amplían políticas RLS ni se migran datos de `datos_app` a estos esquemas.

Las recetas y el plan son ideas educativas, no indicaciones médicas ni menús personalizados. Revisa ingredientes, etiquetas y posibles contaminaciones cruzadas; consulta a profesionales de salud ante alergias o dudas. Las actividades físicas son recreativas y deben contar con supervisión adulta. NutriBot usa Gemini para generar respuestas, no brinda diagnósticos y recomienda hablar con una persona adulta de confianza ante una preocupación.
