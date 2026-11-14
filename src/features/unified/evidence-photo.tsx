import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';

import { getEvidenceUrl } from '@/features/unified/cloud-data';
import { COLORS } from '@/features/unified/constants';
import { RADIUS, SPACE } from '@/features/unified/tokens';

type EvidencePhotoProps = {
  path: string;
};

export function EvidencePhoto({ path }: EvidencePhotoProps) {
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
            error: loadError instanceof Error ? loadError.message : 'No se pudo abrir la evidencia.',
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
  return <Image source={{ uri: result.uri }} style={styles.image} resizeMode="cover" />;
}

const styles = StyleSheet.create({
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
