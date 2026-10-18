# Family Wellness App

Aplicación móvil creada con Expo + React Native para acompañar hábitos saludables de una persona y su familia.

## Propósito

La app centraliza una experiencia de bienestar con:

- avatar personalizado
- registro de ánimo diario
- progreso de salud y hábitos (agua, pasos, sueño, frutas)
- misiones del día con XP
- dieta familiar semanal
- asistente NutriBot con apoyo emocional y respuestas sobre salud

## Stack

- Expo SDK 57
- React Native 0.86
- TypeScript
- Expo Router

## Estructura principal

- [src/app](./src/app): pantallas y enrutamiento
- [src/components](./src/components): componentes visuales reutilizables
- [src/constants](./src/constants): datos estáticos y configuración del dominio
- [src/hooks](./src/hooks): hooks compartidos

## Cómo correrla

1. Instala dependencias:

   ```bash
   npm install
   ```

2. Inicia la app:

   ```bash
   npx expo start
   ```

3. Desde la terminal selecciona una opción:
   - Android emulator
   - iOS simulator
   - Expo Go
   - navegador web

## Crear un APK para Android

El perfil `preview` de [eas.json](./eas.json) genera un APK instalable directamente en un dispositivo Android.

1. Inicia sesión o crea una cuenta gratuita en [Expo](https://expo.dev/signup):

   ```bash
   npx eas-cli@latest login
   ```

2. Configura el proyecto con EAS la primera vez:

   ```bash
   npx eas-cli@latest build:configure
   ```

3. Inicia la compilación del APK:

   ```bash
   npm run build:android:apk
   ```

EAS compila la app en la nube. Cuando termine, abre el enlace que muestra la terminal para descargar el APK e instalarlo en Android. Este proceso requiere conexión a internet y una cuenta de Expo.

El identificador Android configurado para esta aplicación es `com.familywellnessapp.mobile`. Conviene mantenerlo estable después de publicar la app, ya que Google Play lo utiliza para identificarla.

## Desarrollo

- La lógica de negocio y los datos iniciales de la app se mantienen en [src/constants/family-wellness.ts](./src/constants/family-wellness.ts) para facilitar la documentación y reutilización.
- La pantalla principal en [src/app/index.tsx](./src/app/index.tsx) contiene la UI y los modales del flujo principal.
- Si quieres mantener el proyecto fácil de documentar, conviene seguir separando:
  - datos
  - componentes visuales
  - lógica de pantalla
  - utilidades compartidas

## Scripts

```bash
npm start
npm run android
npm run ios
npm run web
npm run lint
```

## Nota

El proyecto usa Expo Router y está orientado a una app móvil con enfoque de UX clara y experiencia emocional. La estructura actual ya está preparada para crecer sin mezclar demasiada lógica en una sola pantalla.
