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

- Perfiles locales para niñas y niños y panel de acompañamiento para personas tutoras.
- Alta y edición de perfiles infantiles en cinco fases, con avatar ilustrado, edad, medidas, alergias, alimentos a prevenir y confirmación de datos.
- Navegación por rol: el menú semanal aparece en el espacio tutor y la niñez tiene un apartado dedicado a sus logros; las personas tutoras pueden revisar puntos e insignias.
- Registro de agua, grupos de alimentos, ánimo, descanso, movimiento y evidencia fotográfica opcional.
- Aprobación local de actividades, puntos, retos y personalización de avatar con iconos vectoriales.
- Catálogo de recetas, búsqueda y filtros, menú semanal de desayuno, comida y cena, y plan educativo del Plato del Buen Comer.
- Preferencias de alergias y alimentos que se prefieren evitar, preguntas frecuentes y respuestas predefinidas de NutriBot.
- Vinculación manual de perfiles de NutriBot Familiar y Warrior Kids. Los valores diferentes y sus fuentes se conservan.

## Datos y privacidad

La aplicación migra una copia de los datos existentes al espacio `familywellness-unified-local-v1`. Los almacenes `nutribot-familiar-local-v1` y `warrior-kids-local-v1` se mantienen intactos; no se vinculan perfiles por nombre. Los perfiles se pueden vincular manualmente, separar u ocultar sin borrar sus datos.

Los datos, el PIN y las fotos de evidencia se guardan en el dispositivo. No hay sincronización en la nube, cuentas verificadas, contraseñas, recuperación de acceso, administración remota ni notificaciones del sistema. El correo solo identifica el acceso local; el PIN no está cifrado y no sustituye una contraseña ni protege el almacenamiento del dispositivo.

Las recetas y el plan son ideas educativas, no indicaciones médicas ni menús personalizados. Revisa ingredientes, etiquetas y posibles contaminaciones cruzadas; consulta a profesionales de salud ante alergias o dudas. Las actividades físicas son recreativas y deben contar con supervisión adulta. NutriBot utiliza respuestas predefinidas, no es un servicio de IA ni brinda diagnósticos.
