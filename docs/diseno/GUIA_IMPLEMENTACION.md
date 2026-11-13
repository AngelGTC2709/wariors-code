# Warrior Kids · Guía de implementación del rediseño

Especificación del rediseño hecho en Figma (archivo "Sin título", páginas Fundamentos, Componentes y Pantallas) para implementarlo en esta app. Las reglas del repositorio están en `AGENTS.md`; esta guía no las reemplaza.

## 0. Reglas que no se rompen

- La UI activa vive en `src/features/unified/` (`screen.tsx`, `ui.tsx`, `constants.ts`, `model.ts`). No poner lógica en `src/app/*`.
- Estilos con `StyleSheet.create`. No agregar NativeWind, Tailwind ni librerías de UI.
- Íconos: seguir usando `Icon` de `ui.tsx` (expo-symbols). Los íconos nuevos se agregan a `AppIconName` e `ICON_SYMBOLS`; `satisfies` valida que el nombre exista.
- Todas las escrituras pasan por `updateData`. Todo campo nuevo de datos debe ser **opcional** en `model.ts` y aceptarse en `isUnifiedData` (ya hay cuentas con datos guardados sin esos campos).
- No cambiar el esquema de Supabase ni `cloud-data.ts` para este rediseño.
- Texto visible en español (México).
- Dependencias de Expo/RN solo con `npx expo install`.
- Verificar cada fase con `npm run lint` y `npx tsc --noEmit` (línea base: 0 errores, 2 advertencias).
- `screen.tsx` tiene ~3,300 líneas: los componentes nuevos van en archivos nuevos dentro de `src/features/unified/` y `screen.tsx` solo los usa.

## 1. Tokens (nuevo archivo `src/features/unified/tokens.ts`)

Tres temas con las mismas llaves. `nino` usa Oli, `nina` usa Lía, el rol `tutor` usa Tutor.

```ts
export const THEMES = {
  oli:   { fondoInicio: '#EAF4FF', fondoFin: '#F3F8FF', hero: '#0A1931', heroSecundario: '#0A1931',
           acento: '#00C2FF', acentoSuave: '#D6F3FF', texto: '#0A1931', bordeAvatar: '#00C2FF' },
  lia:   { fondoInicio: '#FFF0F5', fondoFin: '#FFF8FA', hero: '#3D0C2E', heroSecundario: '#3D0C2E',
           acento: '#FF4081', acentoSuave: '#FFD9E6', texto: '#3D0C2E', bordeAvatar: '#FF4081' },
  tutor: { fondoInicio: '#F1F5F9', fondoFin: '#F8FAFC', hero: '#0F172A', heroSecundario: '#1E293B',
           acento: '#D97706', acentoSuave: '#FEF3C7', texto: '#0F172A', bordeAvatar: '#D97706' },
} as const;

export const SHARED = {
  tarjeta: '#FFFFFF', apagada: '#EDF2F7', textoSecundario: '#64748B', textoInactivo: '#94A3B8',
  sobreAcento: '#FFFFFF', bordeSutil: 'rgba(0,0,0,0.05)', presionado: 'rgba(0,0,0,0.12)',
  puntos: '#F59E0B', completado: '#10B981', logros: '#8B5CF6',
  estrella: '#FFC107', estrellaBorde: '#FFA000', agua: '#38B6FF',
  grafica: { agua: '#38B6FF', alimentacion: '#10B981', estudio: '#14B8A6', descanso: '#F59E0B' },
} as const;

export const FOOD_GROUP_COLORS = {
  frutas:      { fondo: '#D1F4D9', texto: '#1B5E20' },
  cereales:    { fondo: '#FFE8B8', texto: '#B26A00' },
  leguminosas: { fondo: '#E8D9FF', texto: '#5E35B1' },
  animal:      { fondo: '#DCEBFF', texto: '#0277BD' },
} as const;

export const SPACE = { 4: 4, 8: 8, 12: 12, 14: 14, 16: 16, 20: 20, 24: 24 } as const;
export const RADIUS = { barra: 6, sm: 12, md: 16, habito: 22, tarjeta: 24, hero: 28, pildora: 9999 } as const;
export const BORDER = { fino: 1, tarjeta: 1.5, chip: 2, avatar: 3, anillo: 12 } as const;

export const SHADOW = {
  tarjeta: { shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 24, shadowOffset: { width: 0, height: 8 }, elevation: 3 },
  habito:  { shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 18, shadowOffset: { width: 0, height: 6 }, elevation: 2 },
  chip:    { shadowColor: '#000', shadowOpacity: 0.10, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
} as const;
```

**Tintes suaves:** fondos de ícono, insignias y avisos usan el color del ícono al 12–15 % de opacidad (por ejemplo agua `rgba(56,182,255,0.15)`), con el ícono encima en el color sólido. Crear un helper `tint(hex, alpha)`.

**Tipografía.** Las fuentes ya cargadas se conservan: Fredoka para niños y títulos, Plus Jakarta Sans para el Tutor (en Figma el Tutor está en Inter; Plus Jakarta Sans es la alternativa aprobada del documento de diseño, así no se agrega otra fuente). Falta cargar `Fredoka_400Regular` y `Fredoka_500Medium`.

| Estilo | Niños (Fredoka) | Tutor (Plus Jakarta Sans) |
|---|---|---|
| Hero | 700 · 24/30 | 700 · 24/30 |
| Hero subtítulo | 500 · 14/20 | — |
| H1 | 700 · 26/32 | 700 · 28/34 |
| H2 | 700 · 20/26 | 600 · 18/24 |
| H3 | 600 · 16/22 | 600 · 15/20 |
| Body | 400 · 14/20 | 400 · 14/20 |
| Botón | 600 · 16/20 | 600 · 15/20 |
| Contador | 400 · 13/18 | 400 · 13/18 |
| Caption | 700 · 12/16 | 700 · 12/16 |
| Pestaña | 500 · 11/14 (activa 700) | 600 · 11/14 (activa 700) |
| Métrica | — | 700 · 32/36 |

Un hook `useAppTheme(role, childTheme)` devuelve `{ colors, type }` según el rol y el perfil. Fondo de pantalla: niños usan degradado vertical `fondoInicio → fondoFin` (`expo-linear-gradient` con `npx expo install`, o color plano `fondoInicio` si no se quiere agregar); Tutor usa `fondoInicio` plano.

## 2. Componentes base (archivo nuevo `src/features/unified/design.tsx`)

Todos reciben el tema. Área táctil mínima 44 px.

| Componente | Especificación |
|---|---|
| `PillButton` | Alto 52, radio píldora, fondo `acento`, texto `sobreAcento`. Presionado: escala 0.96 + capa `presionado`. Variante `ghost`: fondo blanco, borde 1.5 `bordeSutil`. |
| `AvatarButton` | "Personalizar avatar": alto 38, píldora, ícono de paleta a la izquierda. Presionado: escala 0.94 con rebote. |
| `WaterCounter` | Cápsula con fondo `apagada` al 60 %: botón − (círculo 40 blanco), al centro ícono de **vaso** + "2 de 5", botón +1 (píldora `acento`, texto blanco). |
| `FoodChip` | 4 grupos × 2 estados. No seleccionado: fondo pastel del grupo, opacidad 0.8. Seleccionado: borde 2 px del color de texto del grupo, ícono check, sombra `chip`, escala 1.05. |
| `RoleSwitch` | Control segmentado píldora Niñez / Tutor (con candado en Tutor). Activo: fondo `acento` del tema, texto blanco. Tocar Tutor abre la verificación de contraseña que ya existe (`showTutorGate`). |
| `TopBar` | Logo (assets) + "Warrior Kids" + `RoleSwitch`. En niños, debajo: avatar circular 52 con borde 3 px `bordeAvatar` y globo con el nombre. |
| `BottomBar` | Fondo blanco al 85 %, radio superior 24, borde superior sutil. Pestaña activa: cápsula `acentoSuave` 52×32 detrás del ícono, ícono `acento`, etiqueta en negrita, sube 3 px. Inactiva: `textoInactivo`. |
| `HeroCard` | Radio 28, fondo `hero`, saludo estilo Hero blanco, subtítulo al 80 %, píldora de puntos, botón, y el logo/jaguar asomando abajo a la derecha (recortado por la tarjeta). |
| `HabitCard` | Radio 22, blanco, borde 1.5 sutil, sombra `habito`. Ícono en círculo con tinte, título H3, progreso, insignia "+10 pts", barra de progreso (alto 10, píldora) y `WaterCounter`. |
| `SectionCard` | Tarjeta blanca radio 22 (niños) o 24 (Tutor) con título H2 y subtítulo. |
| `ListRow` | Ícono en cuadro 40 (radio 16, tinte) + título H3 + subtítulo + elemento a la derecha. |
| `BarChart` | 4 series por día, barras de 6 px con radio 6 arriba, leyenda con puntos. |
| `ProgressRing` | Trazo 12 px con extremos redondeados, color `completado` sobre pista `apagada`, porcentaje al centro (estilo Métrica). Requiere `react-native-svg`. |
| `LoadingDots` | Tres puntos de 12 px; saltan en orden (ver §6). |
| `BottomSheet` | Fondo atenuado `rgba(15,23,42,0.55)`, hoja con radio superior 28 y fondo `fondoFin`. Reemplaza el contenedor de los `Modal` actuales sin cambiar su lógica. |
| `PlatoDelBuenComer` | Ver §4. |

Íconos nuevos para `ICON_SYMBOLS` (verificar el nombre exacto contra los tipos de expo-symbols): vaso (para agua, en lugar de gota), música, huella, pino/bosque, pesa, ola/estirar, balanza, cama, pausa, repetir, alerta, cámara, candado, cofre, gráfica, campana, escudo.

**Agua: en toda la app se muestran vasos, no gotas** (ícono `water` pasa a ser un vaso).

## 3. Navegación

- **Tutor: 4 pestañas** — Familia, Recetas, Menú, Ajustes. Se quita "Ayuda" de la barra; se abre desde Ajustes.
- **Niñez: 5 pestañas** — Familia, Recetas, Logros, Ajustes, Ayuda.
- `NAV_ITEMS` pasa a depender del rol. Revisar `renderTabContent` (hoy mezcla 'Menú'/'Logros' entre roles) para que cada rol solo tenga sus pestañas, y que al cambiar de rol se regrese a 'Familia'.

## 4. Registro del niño con el plato del buen comer

El asistente de `renderProfileModal` pasa de 5 a **6 fases**:

1. Avatar, nombre y color (igual que hoy).
2. Datos: **sexo** (ya existe como `theme`/`genero`), edad, peso, estatura y **dictamen del especialista** (campo nuevo): Sano, Sobrepeso, Obesidad, Prediabetes, Diabetes tipo 2. Nota visible: "Estos datos sirven para asignar el plan de alimentación y de ejercicio. No son un diagnóstico médico."
3. **Alergias** con plato.
4. **No le gustan** con plato.
5. **Le gustan** con plato (lista nueva).
6. Resumen y confirmación (mostrar las tres listas como píldoras de color por grupo).

**Componente `PlatoDelBuenComer`:** círculo de 300 px dividido en 4 sectores con hueco al centro ("Toca un grupo"): Frutas y verduras 35 %, Cereales 30 %, Leguminosas 20 %, Origen animal 15 %, cada uno con el color `fondo` de su grupo, su ícono, su nombre y una insignia con cuántos alimentos hay seleccionados en ese grupo (oculta en 0). Dibujar con `react-native-svg`.

**Subventana:** tocar un sector abre, dentro de la misma hoja, la lista de alimentos de ese grupo como `FoodChip` seleccionables, con un botón arriba **"‹ Volver al plato"** y abajo **"Listo · volver al plato"**. Al volver, las insignias del plato se actualizan. Debajo del plato se muestran los seleccionados como píldoras con ✕ y el campo "Otro alimento o ingrediente".

**Datos:**
- En `constants.ts`, agregar `group: 'frutas' | 'cereales' | 'leguminosas' | 'animal'` a cada `FOOD_OPTIONS` sin cambiar los `id` existentes (los usan `DIET_INGREDIENTS` y las alertas de recetas). Sugerencia: frutas = fresa, brócoli, espinaca, zanahoria, tomate, cebolla, champi, aguacate, picante; cereales = gluten; leguminosas = frijoles, soya, cacahuate, nueces, ajonjolí; animal = leche, huevo, pescado, mariscos, pollo, res, cerdo. Se pueden agregar alimentos nuevos con `id` nuevo.
- En `model.ts`, `NutriChild` gana campos **opcionales**: `gusta?: string[]`, `otrosGusta?: string`, `dictamen?: 'sano' | 'sobrepeso' | 'obesidad' | 'prediabetes' | 'diabetes2'`. Actualizar `isUnifiedData` para aceptarlos cuando existan, y `ProfileDraft`/`emptyProfileDraft` en `screen.tsx`.
- Alergias, no le gustan y le gustan solo generan **avisos** al tutor en Recetas y Menú; no bloquean nada. La alergia es el aviso más importante.

## 5. Pantallas

Referencia visual: página "Pantallas" del Figma. Cada `render*` de `screen.tsx` conserva su lógica y cambia su presentación.

**Acceso** (`renderLogin`): fondo `hero` del Tutor, logo + "Warrior Kids · CRECEMOS EN FAMILIA", título Fredoka blanco, tarjeta blanca con campos y `PillButton`.

**Tutor**
- **Familia** (`renderTutorHome`): fila de perfiles en píldoras, `HeroCard` "¡Hola, {nombre}!", dos tarjetas de resumen (perfiles, por revisar), tarjetas de perfil (avatar, puntos, vasos de agua en dos renglones, puntos de hábitos del día), "Actividades por revisar" con Aprobar / Pedir de nuevo, y accesos rápidos.
- **Recetas** (`renderRecipes`, `renderDietPlan`): título con antetítulo "COCINA EN FAMILIA", selector Recetas / Plan semanal, buscador, filtros en píldoras, aviso ámbar con alergias / no le gustan / le gustan del perfil, tarjetas de receta con ingredientes en píldoras de color por grupo.
- **Menú** (`renderWeeklyMenu`): días en píldoras, aviso de alergias, tarjetas Desayuno / Comida / Cena con Agregar o Cambiar.
- **Ajustes** (`renderSettings` / `renderTutorSettings`): **solo tres opciones** en mosaicos de color — Control parental, Notificaciones de hábitos, Ayuda — más la tarjeta "Tu cuenta" con Cerrar sesión. El contenido actual se reparte así:
  - *Control parental:* perfiles infantiles (editar, crear), vincular perfiles, mostrar avances (`progressSharingEnabled`), tiempo de pantalla (`screenLimitMinutes`), seguridad de la cuenta.
  - *Notificaciones de hábitos:* meta diaria de agua (`waterGoal`) y recordatorios (`remindersEnabled`).
  - *Ayuda:* el contenido de `renderHelp` (FAQ).
  Usar un estado local `settingsSection` para la subpantalla, con botón de regreso.

**Niñez**
- **Inicio** (`renderChildHome`): `TopBar`, `HeroCard`, "Mis hábitos de hoy" con `HabitCard` de agua (vasos), "Colores en mi plato" con `FoodChip`, "¿Cómo te sientes?" (íconos en círculo con tinte en lugar de emoji), "Mi descanso", "Retos para hoy", "Mi semana", "Movimiento a tu manera" (miniatura del jaguar por actividad), "Muévete con cuidado" (Cardio = corazón, Fuerza = pesa, Flexibilidad = ola, Equilibrio = balanza) y NutriBot.
- **Logros** (`renderAchievements`): tarjeta `hero` con puntos y rejilla de medallas circulares con tinte y borde 3 px.
- **Ajustes** del niño: **solo dos mosaicos** — "Sonido y música" y "Cambiar de personaje" — y el aviso "Los demás ajustes los cuida tu tutor." (La app no tiene sonido hoy: dejar el mosaico con un interruptor guardado en un campo opcional `soundEnabled?: boolean`, sin reproducir audio todavía.)
- **Ayuda** (`renderHelp` en modo niño): preguntas frecuentes sencillas y el jaguar.
- **Personalizar avatar** (`renderAvatarEditor`): vista previa grande en tarjeta `acentoSuave` con el nombre, pestañas Piel / Cabello / Ropa / Accesorios con ícono, opciones como círculos de color (la elegida con anillo `acento` y palomita), botones "Guardar avatar" y "Sorpréndeme" (aleatorio). Conservar `AvatarSelection` y `AVATAR_KEYS` como están.
- **Actividad** (`renderActivityModal`): al abrir una actividad se muestra pantalla completa con el **ejemplo animado** (§7), datos (minutos, puntos), "Así se hace" en pasos, consejo de seguridad, botón "¡Empezar!" y "Ya la hice · Registrar" (este último abre el formulario actual de minutos y foto).

## 6. Movimiento (Reanimated 4, ya instalado)

- Presionar botón: escala 0.96 (0.94 en `AvatarButton`), `withSpring`, sin retraso; nunca bloquea toques rápidos.
- Chip seleccionado: escala 1.05 con resorte.
- Pestaña activa: sube 3 px con rebote, ~150 ms.
- Barras de la gráfica: crecen desde la base, 600 ms, `Easing.out`, escalonadas 40 ms.
- Barra de progreso de hábito: ancho animado ~300 ms.
- Jaguar al tocarlo: sube 8 px y regresa.
- `LoadingDots`: cada punto sube 6 px en turno, ciclo de 900 ms.
- Respetar `AccessibilityInfo.isReduceMotionEnabled()`: sin movimiento, solo cambios de estado.
- Pendiente (no implementar ahora): confeti al cumplir una meta y contador numérico animado.

## 7. Animaciones de actividades (jaguar)

Los archivos fuente están en `docs/diseno/animaciones/` (`jaguar.js`, `scenes.js`, `SceneAnimation.js`, `ActivityAnimation.js`, `index.js`). Requieren `react-native-svg` (`npx expo install react-native-svg`).

- Copiarlos a `src/features/unified/animations/` y convertirlos a TypeScript sin cambiar los dibujos ni las poses.
- `getActivityScene` hoy busca por título; agregar el mapeo por `id` de `ACTIVITIES`: `dance → baila`, `animals → imita-animales`, `walk → paseo`, `stretch → estira-gigante`.
- En la lista de Inicio, miniatura con `playing={false}`; en la pantalla de la actividad, tamaño grande en bucle con botones Pausa y Repetir.
- Las categorías de "Muévete con cuidado" no tienen escena todavía: usar el ícono.

Pasos y consejos por actividad:

| Actividad | Pasos | Consejo |
|---|---|---|
| Baila tu canción favorita | Pon tu canción favorita y rebota con las rodillas. · Sube un brazo y luego el otro, al ritmo. · Cierra los ojos y siente la música. · Mueve la cadera de lado a lado hasta que acabe la canción. | Deja espacio libre a tu alrededor para no chocar con nada. |
| Imita animales | Camina como pingüino: brazos pegados y pasitos cortos. · Agáchate como rana, con las manos al frente. · ¡Salta como rana lo más alto que puedas! · Estírate como gato y respira despacio. | Salta sobre un piso que no resbale y con zapatos puestos. |
| Paseo para descubrir | Sal con un adulto a un lugar seguro. · Camina despacio y observa como explorador. · Busca 3 cosas de colores: una flor, una hoja y un insecto. · Al regresar, cuenta qué descubriste. | Siempre acompañado de un adulto y sin alejarte de su vista. |
| Estira como gigante | Párate derecho y respira hondo. · Abre los brazos como avión. · ¡Más alto! Sube los brazos y aguanta 5 segundos. · Baja despacio y relájate. | Si algo te duele, detente y avísale a un adulto. |

## 8. Pantallas de carga

Componente `LoadingScreen` con variantes. Reglas: mostrar solo si la espera pasa de 300 ms y mantener al menos 600 ms; las frases rotan cada 2.5 s con fundido de 200 ms.

| Momento | Dónde | Diseño | Frases |
|---|---|---|---|
| Al entrar a la app | Reemplaza el bloque `if (loading \|\| !fontsLoaded)` (no tocar `AnimatedSplashOverlay` ni agregar otra llamada para ocultar el splash) | Fondo `hero` Tutor, logo grande en halo, "Warrior Kids · CRECEMOS EN FAMILIA", `LoadingDots` | Preparando tu espacio familiar… · Despertando al jaguar… · Llenando los vasos de agua… · Acomodando los colores del plato… |
| Después de iniciar sesión | Mientras corre `loadCloudData` tras el login | Fondo claro Tutor, logo en círculo con borde ámbar, "¡Qué gusto verte, {nombre}!", lista: Cuenta verificada ✓ · Perfiles · Menú de la semana, y tarjeta "¿Sabías que…?" | Cargando los perfiles de tu familia… · Revisando el menú de la semana… · Contando los puntos de hoy… · Sincronizando con tu cuenta… |
| Al entrar al perfil del niño | Al cambiar de Tutor a Niñez (transición corta, ~900 ms) | Fondo del tema del niño, su avatar en círculo con estrellas, "¡Hola, {nombre}!", "{puntos} puntos te esperan" | Preparando tu aventura… · Buscando tus logros… · Afilando las garras del jaguar… · Cada pequeño paso cuenta. |
| Al abrir una actividad | Antes de la pantalla de la actividad (~900 ms) | Escena del jaguar, "¡Calentando motores!", cuenta 3 · 2 · 1 | ¡Calentando motores! · Busca un espacio libre a tu alrededor. · Ponte cómodo y toma un poco de agua. · El jaguar está listo, ¿y tú? |

Consejos "¿Sabías que…?": Un vaso de agua al despertar ayuda a empezar el día con energía. · Las frutas y verduras deben ocupar una buena parte del plato. · Celebrar los pequeños logros motiva más que exigir.

Las dos últimas son transiciones decorativas: no deben retrasar una carga real ni mostrarse si el usuario tiene "reducir movimiento".

## 9. Recursos

- `docs/diseno/wk-logo.png`: logo oficial. Copiarlo a `assets/images/wk-logo.png` y usarlo con `expo-image`.
- Avatar: seguir usando `AvatarIllustration` de `ui.tsx`.
