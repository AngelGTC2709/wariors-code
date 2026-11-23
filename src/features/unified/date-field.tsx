import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type StyleProp, type ViewStyle } from 'react-native';

import { colorsFor, useColors } from './constants';
import { BORDER, RADIUS, SPACE, sharedFor, type ThemeMode, useShared, useThemeMode } from './tokens';
import { Icon, useUiStyles } from './ui';

// Campo de fecha con calendario desplegable (lunes a domingo), sin dependencias nativas.
// El valor siempre es ISO 'AAAA-MM-DD' (o '' si no hay fecha); se muestra como DD/MM/AAAA.

const WEEKDAY_LABELS = ['LU', 'MA', 'MI', 'JU', 'VI', 'SÁ', 'DO'];

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function toIso(year: number, month: number, day: number): string {
  return `${year}-${pad(month + 1)}-${pad(day)}`;
}

function todayIso(): string {
  const now = new Date();
  return toIso(now.getFullYear(), now.getMonth(), now.getDate());
}

/** Muestra una fecha ISO como DD/MM/AAAA. */
export function isoToText(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : '';
}

function textToIso(text: string): string | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text);
  if (!match) return null;
  const [day, month, year] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day || year < 1900) return null;
  return toIso(year, month - 1, day);
}

function maskDate(text: string): string {
  const digits = text.replace(/\D/g, '').slice(0, 8);
  return [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4)].filter(Boolean).join('/');
}

function inRange(iso: string, minDate?: string, maxDate?: string): boolean {
  return (!minDate || iso >= minDate) && (!maxDate || iso <= maxDate);
}

const monthLabel = (year: number, month: number) => {
  const text = new Intl.DateTimeFormat('es-MX', { month: 'long', year: 'numeric' }).format(new Date(year, month, 1));
  return text.charAt(0).toLocaleUpperCase('es-MX') + text.slice(1);
};

const fullLabel = (iso: string) =>
  new Intl.DateTimeFormat('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(`${iso}T12:00:00`));

export function DateField({
  label,
  value,
  onChange,
  minDate,
  maxDate,
  openTo,
  hint,
  style,
}: {
  label: string;
  /** Fecha ISO 'AAAA-MM-DD' o ''. */
  value: string;
  onChange: (iso: string) => void;
  minDate?: string;
  maxDate?: string;
  /** Mes que se muestra al abrir si no hay fecha (ISO). Por defecto, hoy. */
  openTo?: string;
  hint?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const localStyles = DATE_STYLES[useThemeMode()];
  const uiStyles = useUiStyles();
  const COLORS = useColors();
  const SHARED = useShared();
  const [open, setOpen] = useState(false);
  // Texto mientras se escribe a mano; null = mostrar el valor guardado.
  const [typed, setTyped] = useState<string | null>(null);
  const start = /^\d{4}-\d{2}/.test(value) ? value : openTo ?? todayIso();
  const [view, setView] = useState({ year: Number(start.slice(0, 4)), month: Number(start.slice(5, 7)) - 1 });
  const today = todayIso();
  const text = typed ?? isoToText(value);
  const typedInvalid = typed !== null && typed.length === 10 && (!textToIso(typed) || !inRange(textToIso(typed) ?? '', minDate, maxDate));

  const openCalendar = () => {
    const base = /^\d{4}-\d{2}/.test(value) ? value : openTo ?? today;
    setView({ year: Number(base.slice(0, 4)), month: Number(base.slice(5, 7)) - 1 });
    setOpen(current => !current);
  };
  const moveMonth = (delta: number) => {
    setView(current => {
      const date = new Date(current.year, current.month + delta, 1);
      return { year: date.getFullYear(), month: date.getMonth() };
    });
  };
  const choose = (iso: string) => {
    if (!inRange(iso, minDate, maxDate)) return;
    setTyped(null);
    onChange(iso);
    setOpen(false);
  };

  // 6 semanas que empiezan en lunes, con días del mes anterior y siguiente en gris.
  const firstWeekday = (new Date(view.year, view.month, 1).getDay() + 6) % 7;
  const cells = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(view.year, view.month, index - firstWeekday + 1);
    return { iso: toIso(date.getFullYear(), date.getMonth(), date.getDate()), day: date.getDate(), current: date.getMonth() === view.month };
  });

  return (
    <View style={[uiStyles.inputGroup, style]}>
      <Text style={uiStyles.inputLabel}>{label}</Text>
      <View style={[uiStyles.input, localStyles.inputRow, typedInvalid && uiStyles.inputError]}>
        <TextInput
          accessibilityLabel={`${label}, formato día, mes y año`}
          keyboardType="number-pad"
          maxLength={10}
          placeholder="DD/MM/AAAA"
          placeholderTextColor={SHARED.textoSecundario}
          value={text}
          onChangeText={next => {
            const masked = maskDate(next);
            const iso = textToIso(masked);
            if (iso && inRange(iso, minDate, maxDate)) {
              setTyped(null);
              onChange(iso);
            } else if (!masked) {
              setTyped(null);
              onChange('');
            } else {
              setTyped(masked);
            }
          }}
          onBlur={() => { if (typed !== null && !typedInvalid) setTyped(null); }}
          style={localStyles.textInput}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={open ? 'Cerrar calendario' : 'Abrir calendario'}
          aria-expanded={open}
          hitSlop={8}
          onPress={openCalendar}
          style={localStyles.calendarButton}
        >
          <Icon name="calendar" size={22} color={open ? COLORS.blue : COLORS.ink} />
        </Pressable>
      </View>
      {typedInvalid ? <Text accessibilityRole="alert" style={uiStyles.errorText}>Revisa la fecha: usa día, mes y año (DD/MM/AAAA).</Text> : null}
      {hint && !typedInvalid ? <Text style={uiStyles.fieldHint}>{hint}</Text> : null}

      {open ? (
        <View style={localStyles.calendar}>
          <View style={localStyles.header}>
            <Pressable accessibilityRole="button" accessibilityLabel="Año anterior" onPress={() => moveMonth(-12)} style={localStyles.navButton}>
              <Icon name="chevronsLeft" size={18} color={COLORS.ink} />
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Mes anterior" onPress={() => moveMonth(-1)} style={localStyles.navButton}>
              <Icon name="chevronLeft" size={18} color={COLORS.ink} />
            </Pressable>
            <Text accessibilityLiveRegion="polite" style={localStyles.monthLabel}>{monthLabel(view.year, view.month)}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Mes siguiente" onPress={() => moveMonth(1)} style={localStyles.navButton}>
              <Icon name="chevronRight" size={18} color={COLORS.ink} />
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Año siguiente" onPress={() => moveMonth(12)} style={localStyles.navButton}>
              <Icon name="chevronsRight" size={18} color={COLORS.ink} />
            </Pressable>
          </View>
          <View style={localStyles.week}>
            {WEEKDAY_LABELS.map(day => (
              <Text key={day} style={[localStyles.cell, localStyles.weekday]}>{day}</Text>
            ))}
          </View>
          {[0, 1, 2, 3, 4, 5].map(row => (
            <View key={row} style={localStyles.week}>
              {cells.slice(row * 7, row * 7 + 7).map(cell => {
                const selected = cell.iso === value;
                const enabled = inRange(cell.iso, minDate, maxDate);
                return (
                  <Pressable
                    key={cell.iso}
                    accessibilityRole="button"
                    accessibilityLabel={fullLabel(cell.iso)}
                    aria-selected={selected}
                    aria-disabled={!enabled}
                    disabled={!enabled}
                    onPress={() => choose(cell.iso)}
                    style={[
                      localStyles.cell,
                      localStyles.day,
                      cell.iso === today && !selected && localStyles.today,
                      selected && localStyles.selected,
                    ]}
                  >
                    <Text
                      style={[
                        localStyles.dayText,
                        !cell.current && localStyles.otherMonth,
                        !enabled && localStyles.disabledDay,
                        selected && localStyles.selectedText,
                      ]}
                    >
                      {cell.day}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ))}
          <View style={localStyles.footer}>
            <Pressable accessibilityRole="button" onPress={() => { setTyped(null); onChange(''); setOpen(false); }} style={localStyles.footerButton}>
              <Text style={localStyles.footerText}>Borrar</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              aria-disabled={!inRange(today, minDate, maxDate)}
              disabled={!inRange(today, minDate, maxDate)}
              onPress={() => choose(today)}
              style={localStyles.footerButton}
            >
              <Text style={[localStyles.footerText, !inRange(today, minDate, maxDate) && localStyles.disabledDay]}>Hoy</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );
}

// Estilos en versión clara y oscura; los componentes toman la del modo actual.
function createDateStyles(mode: ThemeMode) {
  const COLORS = colorsFor(mode);
  const SHARED = sharedFor(mode);
  return StyleSheet.create({
  inputRow: { flexDirection: 'row', alignItems: 'center', paddingRight: SPACE[4] },
  textInput: { flex: 1, minHeight: 46, color: COLORS.ink, fontSize: 14 },
  calendarButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  calendar: {
    alignSelf: 'flex-start',
    width: '100%',
    maxWidth: 340,
    padding: SPACE[12],
    gap: SPACE[4],
    borderRadius: RADIUS.md,
    borderWidth: BORDER.fino,
    borderColor: COLORS.line,
    backgroundColor: SHARED.tarjeta,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: SPACE[4], marginBottom: SPACE[4] },
  navButton: { width: 36, height: 36, borderRadius: RADIUS.pildora, alignItems: 'center', justifyContent: 'center' },
  monthLabel: { flex: 1, textAlign: 'center', color: COLORS.ink, fontSize: 14, fontWeight: '700' },
  week: { flexDirection: 'row' },
  cell: { flex: 1, minHeight: 40, alignItems: 'center', justifyContent: 'center', textAlign: 'center' },
  weekday: { minHeight: 28, color: SHARED.textoSecundario, fontSize: 11, fontWeight: '700' },
  day: { borderRadius: RADIUS.sm, borderWidth: 1.5, borderColor: 'transparent' },
  today: { borderColor: COLORS.blue },
  selected: { backgroundColor: COLORS.blue },
  dayText: { color: COLORS.ink, fontSize: 13 },
  otherMonth: { color: SHARED.textoInactivo },
  disabledDay: { color: SHARED.apagada },
  selectedText: { color: SHARED.sobreAcento, fontWeight: '700' },
  footer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: SPACE[4] },
  footerButton: { minHeight: 40, paddingHorizontal: SPACE[12], justifyContent: 'center' },
  footerText: { color: COLORS.blue, fontSize: 13, fontWeight: '700' },
  });
}
const DATE_STYLES = { light: createDateStyles('light'), dark: createDateStyles('dark'), darkNina: createDateStyles('darkNina') };
