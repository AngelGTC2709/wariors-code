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

1. En Supabase, abre **SQL Editor** y ejecuta [`supabase/setup.sql`](./supabase/setup.sql). Esto enlaza cada cuenta de Supabase Auth con una fila de `padres`, agrega `datos_app` para el estado actual de la app y configura políticas de acceso privado.
2. En la autenticación del proyecto, habilita **Email**. Si está activa la confirmación de correo, cada persona debe confirmar su dirección antes de iniciar sesión.
3. La raíz del proyecto debe tener `.env.local` con `EXPO_PUBLIC_SUPABASE_URL` y `EXPO_PUBLIC_SUPABASE_ANON_KEY`. No uses una clave `service_role` o `sb_secret_` en la app; estas variables públicas terminan incluidas en el bundle.
4. Ejecuta `npx expo start` para volver a cargar la configuración.

La app usa Supabase Auth para las cuentas de tutor. Los perfiles infantiles no tienen credenciales propias: cada tutor inicia sesión y cambia entre los perfiles de su familia. Por privacidad, la sesión no se conserva al cerrar la app. La app guarda el estado actual de la experiencia en `padres.datos_app`; las demás tablas del esquema se mantienen sin acceso desde el cliente hasta que se conecten a funciones específicas. La columna antigua `padres.contrasena` no se usa y queda fuera de los permisos del cliente.

Los cambios se sincronizan en tiempo real. Si dos dispositivos guardan cambios al mismo tiempo, la app detecta el conflicto y evita sobrescribir silenciosamente los datos. Las fotos de evidencia se guardan en el bucket privado `activity-evidence` y se restringen a la cuenta propietaria.

En el primer inicio de sesión correcto, se crea un espacio vacío para esa cuenta y se eliminan del dispositivo las claves locales antiguas de NutriBot y Warrior Kids. No se importan los datos locales anteriores. Los datos de otras cuentas de Supabase no se modifican.

Las recetas y el plan son ideas educativas, no indicaciones médicas ni menús personalizados. Revisa ingredientes, etiquetas y posibles contaminaciones cruzadas; consulta a profesionales de salud ante alergias o dudas. Las actividades físicas son recreativas y deben contar con supervisión adulta. NutriBot utiliza respuestas predefinidas, no es un servicio de IA ni brinda diagnósticos.
