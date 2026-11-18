import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';

import { getEvidenceUrl } from '@/features/unified/cloud-data';
import { colorsFor, useColors } from '@/features/unified/constants';
import { RADIUS, SPACE, type ThemeMode, useThemeMode } from '@/features/unified/tokens';
import { friendlyError } from '@/features/unified/utils';

type EvidencePhotoProps = {
  path: string;
};

export function EvidencePhoto({ path }: EvidencePhotoProps) {
  const styles = EVIDENCE_STYLES[useThemeMode()];
  const COLORS = useColors();
  const [result, setResult] = useState<{ path: string; uri: string } | { path: string; error: string } | null>(null);

  useEffect(() => {
    let active = true;
    void getEvidenceUrl(path).then(
      url => {
        if (active) setResult({ path, uri: url });
      },
      loadError => {
        if (active) {
          setResult({
            path,
            error: friendlyError(loadError, 'No se pudo abrir la evidencia.'),
          });
        }
      },
    );
    return () => {
      active = false;
    };
  }, [path]);

  if (result?.path === path && 'error' in result) {
    return (
      <View style={styles.placeholder}>
        <Text accessibilityRole="alert" style={styles.error}>{result.error}</Text>
      </View>
    );
  }
  if (!result || result.path !== path || !('uri' in result)) {
    return (
      <View style={styles.placeholder}>
        <ActivityIndicator color={COLORS.blue} />
      </View>
    );
  }
  return (
    <Image
      accessible
      accessibilityLabel="Foto de evidencia"
      onError={() => setResult({ path, error: 'No se pudo mostrar la foto.' })}
      source={{ uri: result.uri }}
      style={styles.image}
      resizeMode="cover"
    />
  );
}

// Estilos en versión clara y oscura; los componentes toman la del modo actual.
function createEvidenceStyles(mode: ThemeMode) {
  const COLORS = colorsFor(mode);
  return StyleSheet.create({
  image: { width: '100%', height: 150, borderRadius: RADIUS.sm },
  placeholder: {
    width: '100%',
    minHeight: 72,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.paleBlue,
    padding: SPACE[8],
  },
  error: { color: COLORS.orange, textAlign: 'center' },
  });
}
const EVIDENCE_STYLES = { light: createEvidenceStyles('light'), dark: createEvidenceStyles('dark') };
