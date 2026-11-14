# Prompts para GitHub Copilot (modo Agente)

Cómo usarlos:

1. En VS Code abre Copilot Chat y elige el modo **Agent**.
2. Haz un commit antes de cada fase (`git add -A && git commit -m "antes de fase N"`).
3. Pega **un prompt a la vez**, en orden. No pases al siguiente hasta que `npm run lint` y `npx tsc --noEmit` terminen sin errores y hayas probado la app.
4. Si algo sale mal, regresa con `git restore .` y vuelve a intentarlo.

---

## Fase 1 · Tokens y tema

```
Lee AGENTS.md y docs/diseno/GUIA_IMPLEMENTACION.md (secciones 0 y 1).
Crea src/features/unified/tokens.ts con THEMES, SHARED, FOOD_GROUP_COLORS, SPACE, RADIUS, BORDER y SHADOW tal como están en la guía, un helper tint(hex, alpha) y un hook useAppTheme(role, childTheme) que devuelva los colores y los estilos de texto de la tabla de tipografía (niños = Fredoka, tutor = Plus Jakarta Sans).
Carga también Fredoka_400Regular y Fredoka_500Medium en el useFonts de screen.tsx.
No cambies todavía ninguna pantalla ni borres COLORS/TYPE existentes.
Al terminar ejecuta npm run lint y npx tsc --noEmit y corrige lo que falle.
```

## Fase 2 · Componentes base

```
Lee AGENTS.md y docs/diseno/GUIA_IMPLEMENTACION.md (secciones 0, 2 y 6).
Instala lo necesario con npx expo install (react-native-svg; expo-linear-gradient solo si lo usas para el fondo).
Crea src/features/unified/design.tsx con los componentes de la tabla de la sección 2: PillButton, AvatarButton, WaterCounter, FoodChip, RoleSwitch, TopBar, BottomBar, HeroCard, HabitCard, SectionCard, ListRow, BarChart, ProgressRing, LoadingDots y BottomSheet. Usa los tokens de tokens.ts, StyleSheet.create y Reanimated para el movimiento de la sección 6, respetando "reducir movimiento".
Agrega a AppIconName e ICON_SYMBOLS de ui.tsx los íconos nuevos de la guía (el de agua debe ser un vaso); valida los nombres contra los tipos de expo-symbols.
Copia docs/diseno/wk-logo.png a assets/images/wk-logo.png.
No conectes todavía los componentes a screen.tsx.
Verifica con npm run lint y npx tsc --noEmit.
```

## Fase 3 · Navegación, barra superior y acceso

```
Lee AGENTS.md y docs/diseno/GUIA_IMPLEMENTACION.md (secciones 3 y 5, "Acceso").
En src/features/unified/screen.tsx:
- Usa useAppTheme para elegir el tema según role y el perfil seleccionado, y aplica el fondo de pantalla.
- Reemplaza renderHeader por TopBar y la barra inferior por BottomBar.
- Tutor: 4 pestañas (Familia, Recetas, Menú, Ajustes). Niñez: 5 pestañas (Familia, Recetas, Logros, Ajustes, Ayuda). Ajusta NAV_ITEMS y renderTabContent; al cambiar de rol vuelve a Familia.
- Rediseña renderLogin según la guía.
No cambies la lógica de sesión, de verificación de contraseña del tutor ni de datos.
Verifica con npm run lint y npx tsc --noEmit.
```

## Fase 4 · Espacio Niñez

```
Lee AGENTS.md y docs/diseno/GUIA_IMPLEMENTACION.md (sección 5, "Niñez").
Rediseña renderChildHome, renderAchievements, renderChildAvatarSettings, renderAvatarEditor y renderHelp (modo niño) usando design.tsx.
- El agua se muestra en vasos con WaterCounter dentro de HabitCard.
- Ajustes del niño: solo "Sonido y música" y "Cambiar de personaje". Agrega soundEnabled?: boolean como campo opcional en model.ts (tipo, isUnifiedData) y guárdalo con updateData; no reproduzcas audio.
- Personalizar avatar: pestañas Piel/Cabello/Ropa/Accesorios, círculos de color, "Guardar avatar" y "Sorpréndeme". Conserva AvatarSelection.
Conserva toda la lógica de registro de hábitos, retos, puntos y actividades.
Verifica con npm run lint y npx tsc --noEmit.
```

## Fase 5 · Espacio Tutor

```
Lee AGENTS.md y docs/diseno/GUIA_IMPLEMENTACION.md (sección 5, "Tutor").
Rediseña renderTutorHome, renderRecipes, renderDietPlan, renderWeeklyMenu y los modales de receta y de menú usando design.tsx y BottomSheet.
Ajustes del tutor: solo tres mosaicos (Control parental, Notificaciones de hábitos, Ayuda) más "Tu cuenta" con Cerrar sesión. Reparte el contenido actual de renderTutorSettings y renderHelp en esas tres subpantallas como indica la guía, con un estado local settingsSection y botón de regreso.
No cambies qué datos se guardan ni cómo.
Verifica con npm run lint y npx tsc --noEmit.
```

## Fase 6 · Registro con el plato del buen comer

```
Lee AGENTS.md y docs/diseno/GUIA_IMPLEMENTACION.md (sección 4 completa).
- constants.ts: agrega group a cada FOOD_OPTIONS sin cambiar los id.
- model.ts: agrega a NutriChild los campos opcionales gusta, otrosGusta y dictamen; actualiza isUnifiedData para aceptarlos si existen. Los datos ya guardados sin esos campos deben seguir validando.
- Crea src/features/unified/plato.tsx con PlatoDelBuenComer (react-native-svg) y la subventana de alimentos por grupo con "Volver al plato".
- renderProfileModal pasa a 6 fases: avatar; datos con sexo y dictamen; alergias; no le gustan; le gustan; resumen. Las tres fases de alimentos usan el plato.
- Actualiza ProfileDraft, emptyProfileDraft y el guardado/edición del perfil.
- En Recetas y Menú, el aviso del perfil muestra alergias, no le gustan y le gustan.
Verifica con npm run lint y npx tsc --noEmit, y prueba crear un perfil nuevo y editar uno existente.
```

## Fase 7 · Actividades con animación

```
Lee AGENTS.md y docs/diseno/GUIA_IMPLEMENTACION.md (sección 7).
Copia docs/diseno/animaciones/ a src/features/unified/animations/ y conviértelo a TypeScript sin modificar los dibujos ni las poses. Agrega el mapeo por id de actividad (dance, animals, walk, stretch).
En Inicio de niños, cada actividad de "Movimiento a tu manera" muestra una miniatura fija de su escena.
Al tocar una actividad abre una pantalla con: la escena animada grande con Pausa y Repetir, minutos y puntos, "Así se hace" con los pasos de la tabla, el consejo de seguridad, "¡Empezar!" y "Ya la hice · Registrar". Este último abre el formulario actual de minutos y foto sin cambiar su lógica.
Verifica con npm run lint y npx tsc --noEmit.
```

## Fase 8 · Pantallas de carga

```
Lee AGENTS.md y docs/diseno/GUIA_IMPLEMENTACION.md (sección 8).
Crea src/features/unified/loading.tsx con LoadingScreen y sus cuatro variantes (entrada, sesión, perfil, actividad), con las frases que rotan de la guía y LoadingDots.
Conéctalas en screen.tsx donde indica la tabla. No toques AnimatedSplashOverlay ni agregues otra llamada para ocultar el splash. Las variantes perfil y actividad son transiciones cortas: no deben retrasar cargas reales y se omiten con "reducir movimiento".
Verifica con npm run lint y npx tsc --noEmit.
```

## Fase 9 · Revisión final

```
Lee AGENTS.md y docs/diseno/GUIA_IMPLEMENTACION.md completos.
Revisa src/features/unified/ y lista, sin corregir todavía: colores, radios o espacios escritos a mano que deberían venir de tokens.ts; íconos de gota que debieron ser vaso; textos que no estén en español; estilos de COLORS/TYPE antiguos que ya nadie usa; y cualquier punto de la guía que falte.
Después corrige lo encontrado, ejecuta npm run lint y npx tsc --noEmit, y dame un resumen de lo que cambiaste y lo que quedó pendiente.
```
