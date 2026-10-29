#

Prototipo móvil en español de México para acompañar hábitos saludables en familia. Se ejecuta con Expo SDK 57, React Native y Expo Router; el chat de NutriBot responde localmente y no usa una API externa.

## Ejecutar en Expo Go

1. Instala Node.js y las dependencias desde la raíz del proyecto:

   ```bash
   npm install
   ```

2. Inicia Expo:

   ```bash
   npx expo start
   ```

3. Escanea el código QR con Expo Go en Android. Ambos dispositivos deben estar en una red que permita la conexión.

## Generar APK para Android

Instala EAS CLI, inicia sesión con tu cuenta de Expo y ejecuta el perfil de distribución interna:

```bash
npm install --global eas-cli
eas login
npm run build:android:apk
```

El APK se genera en EAS Build y el comando muestra un enlace para descargarlo. La compilación en la nube carga el código del proyecto a Expo.

## Flujos disponibles

- La pantalla principal reproduce el diseño de NutriBot Familiar: acceso y registro local, tema rosa o azul, panel infantil y panel de padre/tutor.
- El tutor puede crear y editar fichas con nombre, género, peso, altura, alergias y alimentos que no gustan; el plan semanal muestra alertas relacionadas con esas fichas.
- El panel infantil incluye avatar personalizable, ánimo, XP, estadísticas, historial semanal, misiones y logros.
- Incluye un plan semanal basado en el Plato del Buen Comer, rutinas de ejercicios para niños y un chat local con respuestas guiadas.
- La versión anterior Warrior Kids permanece disponible desde la pantalla de acceso y en la ruta `/familiar`.

## Datos, privacidad y límites

Las cuentas locales y las fichas familiares de NutriBot Familiar se guardan en este dispositivo mediante AsyncStorage. La sesión no permanece abierta al cerrar la app. La versión anterior conserva sus propios datos locales.

No hay sincronización en la nube, cuentas verificadas, contraseñas, recuperación de acceso, notificaciones del sistema ni administración remota. El correo solo identifica la cuenta local y no es una barrera de seguridad. Los datos de fichas infantiles pueden incluir información sensible y quedan legibles para quien tenga acceso al dispositivo; usa datos ficticios durante las pruebas.

NutriBot ofrece respuestas predefinidas en el dispositivo; no es un servicio de IA ni brinda diagnósticos o consejos médicos. La actividad física es recreativa y debe contar con supervisión adulta. Los menús son ideas educativas, no dietas médicas; revisa siempre los ingredientes y las etiquetas para confirmar alergias. Las pruebas con menores requieren las autorizaciones y el consentimiento del tutor, además del asentimiento del menor cuando corresponda.
