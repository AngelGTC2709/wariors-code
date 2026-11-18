import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { FOOD_OPTIONS } from '@/features/unified/constants';
import { FoodChip } from '@/features/unified/design';
import { FOOD_GROUP_COLORS, RADIUS, SPACE, type useAppTheme, sharedFor, type ThemeMode, useFoodGroupColors, useShared, useThemeMode } from '@/features/unified/tokens';
import { Button, Field, Icon, type AppIconName, useUiStyles } from '@/features/unified/ui';

type FoodGroup = keyof typeof FOOD_GROUP_COLORS;
type Theme = ReturnType<typeof useAppTheme>;

const GROUPS: { id: FoodGroup; label: string; icon: AppIconName; start: number; end: number; position: { left: `${number}%`; top: `${number}%` } }[] = [
  { id: 'frutas', label: 'Frutas y verduras', icon: 'produce', start: -90, end: 36, position: { left: '65%', top: '25%' } },
  { id: 'cereales', label: 'Cereales', icon: 'cereal', start: 36, end: 144, position: { left: '34%', top: '72%' } },
  { id: 'leguminosas', label: 'Leguminosas', icon: 'legume', start: 144, end: 216, position: { left: '1%', top: '40%' } },
  { id: 'animal', label: 'Origen animal', icon: 'animal', start: 216, end: 270, position: { left: '18%', top: '8%' } },
];

function sectorPath(start: number, end: number): string {
  const point = (radius: number, angle: number) => {
    const radians = angle * Math.PI / 180;
    return `${150 + radius * Math.cos(radians)} ${150 + radius * Math.sin(radians)}`;
  };
  return `M ${point(148, start)} A 148 148 0 0 1 ${point(148, end)} L ${point(56, end)} A 56 56 0 0 0 ${point(56, start)} Z`;
}

export function SelectedFoodPills({
  values, other, onRemove,
}: {
  values: string[];
  other?: string;
  onRemove?: (id: string) => void;
}) {
  const plateStyles = PLATE_STYLES[useThemeMode()];
  const styles = useUiStyles();
  const SHARED = useShared();
  const FOOD_GROUP_COLORS = useFoodGroupColors();
  if (!values.length && !other?.trim()) return <Text style={styles.muted}>Ninguno registrado.</Text>;
  return (
    <View style={plateStyles.wrap}>
      {values.map(id => {
        const food = FOOD_OPTIONS.find(option => option.id === id);
        const colors = food ? FOOD_GROUP_COLORS[food.group] : { fondo: SHARED.apagada, texto: SHARED.textoSecundario };
        return (
          <Pressable
            key={id}
            accessibilityRole={onRemove ? 'button' : undefined}
            accessibilityLabel={onRemove ? `Quitar ${food?.name ?? id}` : undefined}
            disabled={!onRemove}
            onPress={() => onRemove?.(id)}
            style={[plateStyles.selectedPill, { backgroundColor: colors.fondo }]}
          >
            <Text style={[styles.inputLabel, { color: colors.texto }]}>{food?.name ?? id}{onRemove ? '  ×' : ''}</Text>
          </Pressable>
        );
      })}
      {other?.trim() ? (
        <View style={[plateStyles.selectedPill, { backgroundColor: SHARED.apagada }]}>
          <Text style={styles.inputLabel}>{other.trim()}</Text>
        </View>
      ) : null}
    </View>
  );
}

export function PlatoDelBuenComer({
  theme, values, onToggle, other, onChangeOther,
}: {
  theme: Theme;
  values: string[];
  onToggle: (id: string) => void;
  other: string;
  onChangeOther: (value: string) => void;
}) {
  const plateStyles = PLATE_STYLES[useThemeMode()];
  const styles = useUiStyles();
  const SHARED = useShared();
  const FOOD_GROUP_COLORS = useFoodGroupColors();
  const [group, setGroup] = useState<FoodGroup | null>(null);
  const currentGroup = GROUPS.find(item => item.id === group);

  return (
    <View style={plateStyles.content}>
      {currentGroup ? (
        <>
          <Button title="‹ Volver al plato" variant="outline" onPress={() => setGroup(null)} />
          <Text style={[theme.type.h3, { color: theme.colors.texto }]}>{currentGroup.label}</Text>
          <View style={plateStyles.wrap}>
            {FOOD_OPTIONS.filter(food => food.group === currentGroup.id).map(food => (
              <FoodChip key={food.id} theme={theme} group={food.group} label={food.name}
                selected={values.includes(food.id)} onPress={() => onToggle(food.id)} />
            ))}
          </View>
          <Button title="Listo · volver al plato" variant="secondary" onPress={() => setGroup(null)} />
        </>
      ) : (
        <View style={plateStyles.plate}>
          <Svg width="100%" height="100%" viewBox="0 0 300 300">
            {GROUPS.map(item => (
              <Path key={item.id} d={sectorPath(item.start, item.end)} fill={FOOD_GROUP_COLORS[item.id].fondo}
                stroke={SHARED.tarjeta} strokeWidth={2} onPress={() => setGroup(item.id)} />
            ))}
            <Circle cx={150} cy={150} r={55} fill={SHARED.tarjeta} pointerEvents="none" />
          </Svg>
          {GROUPS.map(item => {
            const count = FOOD_OPTIONS.filter(food => food.group === item.id && values.includes(food.id)).length;
            return (
              <Pressable key={item.id} accessibilityRole="button"
                accessibilityLabel={`${item.label}, ${count} seleccionados`}
                onPress={() => setGroup(item.id)} style={[plateStyles.groupLabel, item.position]}>
                <Icon name={item.icon} size={20} color={FOOD_GROUP_COLORS[item.id].texto} />
                <Text style={[plateStyles.groupText, { color: FOOD_GROUP_COLORS[item.id].texto }]}>{item.label}</Text>
                {count ? <Text style={[plateStyles.badge, { backgroundColor: FOOD_GROUP_COLORS[item.id].texto }]}>{count}</Text> : null}
              </Pressable>
            );
          })}
          <View pointerEvents="none" style={plateStyles.center}>
            <Text style={plateStyles.centerText}>Toca un grupo</Text>
          </View>
        </View>
      )}
      <Text style={styles.inputLabel}>Seleccionados</Text>
      <SelectedFoodPills values={values} onRemove={onToggle} />
      <Field label="Otro alimento o ingrediente" value={other} onChangeText={onChangeOther} placeholder="Escribe otro ingrediente" />
    </View>
  );
}

// Estilos en versión clara y oscura; los componentes toman la del modo actual.
function createPlateStyles(mode: ThemeMode) {
  const SHARED = sharedFor(mode);
  return StyleSheet.create({
  content: { gap: SPACE[12] },
  plate: { width: '100%', maxWidth: 300, aspectRatio: 1, alignSelf: 'center' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE[8] },
  selectedPill: { minHeight: 44, borderRadius: RADIUS.pildora, justifyContent: 'center', paddingHorizontal: SPACE[12] },
  groupLabel: { position: 'absolute', width: '32%', minHeight: 44, alignItems: 'center', justifyContent: 'center', gap: SPACE[4] },
  groupText: { fontSize: 10, fontWeight: '700', textAlign: 'center' },
  badge: { color: SHARED.tarjeta, overflow: 'hidden', minWidth: 20, textAlign: 'center', borderRadius: RADIUS.pildora, fontSize: 11 },
  center: { position: 'absolute', left: '32%', top: '40%', width: '36%', alignItems: 'center' },
  centerText: { color: SHARED.textoSecundario, fontSize: 11, fontWeight: '700', textAlign: 'center' },
  });
}
const PLATE_STYLES = { light: createPlateStyles('light'), dark: createPlateStyles('dark') };
