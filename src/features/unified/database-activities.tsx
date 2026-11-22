import { useCallback, useEffect, useMemo, useState } from 'react';
import { Text, View } from 'react-native';

import {
  deleteDidacticChallengeActivity,
  deletePhysicalChallengeActivity,
  loadActivityManagement,
  saveDidacticChallengeActivity,
  savePhysicalChallengeActivity,
  type ActivityManagementSnapshot,
  type DidacticActivityInput,
  type PhysicalActivityInput,
} from '@/features/unified/cloud-data';
import { PillButton, SectionCard } from '@/features/unified/design';
import { useAppTheme } from '@/features/unified/tokens';
import { friendlyError } from '@/features/unified/utils';
import { Button, Card, Field, SectionTitle, useUiStyles } from '@/features/unified/ui';

type ActivitySection = 'fisicas' | 'didacticas';
type DeleteTarget = { kind: ActivitySection; id: number } | null;
type PhysicalDraft = {
  id?: number;
  challengeId: string;
  sportId: string;
  intensityId: string;
  distance: string;
  minutes: string;
};
type DidacticDraft = {
  id?: number;
  challengeId: string;
  subjectId: string;
  hours: string;
  minutes: string;
};

const EMPTY_PHYSICAL: PhysicalDraft = {
  challengeId: '',
  sportId: '',
  intensityId: '',
  distance: '',
  minutes: '',
};
const EMPTY_DIDACTIC: DidacticDraft = {
  challengeId: '',
  subjectId: '',
  hours: '0',
  minutes: '0',
};

export function DatabaseActivities({ userId }: { userId: string }) {
  const styles = useUiStyles();
  const theme = useAppTheme('tutor', 'nina');
  const [section, setSection] = useState<ActivitySection>('fisicas');
  const [snapshot, setSnapshot] = useState<ActivityManagementSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null);
  const [physicalDraft, setPhysicalDraft] = useState<PhysicalDraft>(EMPTY_PHYSICAL);
  const [didacticDraft, setDidacticDraft] = useState<DidacticDraft>(EMPTY_DIDACTIC);

  const reload = useCallback(async () => {
    const data = await loadActivityManagement(userId);
    setSnapshot(data);
  }, [userId]);

  useEffect(() => {
    let active = true;
    void loadActivityManagement(userId)
      .then(data => {
        if (active) {
          setSnapshot(data);
          setError('');
        }
      })
      .catch(cause => {
        if (active) setError(friendlyError(cause, 'No se pudieron cargar las actividades.'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [userId]);

  const challengeNames = useMemo(
    () => new Map((snapshot?.challenges ?? []).map(item => [item.id_reto, item.descripcion_reto])),
    [snapshot?.challenges],
  );
  const sportNames = useMemo(
    () => new Map((snapshot?.sports ?? []).map(item => [item.id_tipo_deporte, item.nombre])),
    [snapshot?.sports],
  );
  const intensityNames = useMemo(
    () => new Map((snapshot?.intensities ?? []).map(item => [item.id_intensidad, item.nombre])),
    [snapshot?.intensities],
  );
  const subjectNames = useMemo(
    () => new Map((snapshot?.subjects ?? []).map(item => [item.id_materia, item.nombre])),
    [snapshot?.subjects],
  );

  const run = async (successMessage: string, operation: () => Promise<void>) => {
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await operation();
      await reload();
      setNotice(successMessage);
    } catch (cause) {
      setError(friendlyError(cause, 'No se pudo completar el cambio.'));
    } finally {
      setSaving(false);
    }
  };

  const renderChoices = (
    options: { id: string; label: string }[],
    value: string,
    onSelect: (id: string) => void,
  ) => options.length ? (
    <View style={styles.wrap}>
      {options.map(option => (
        <PillButton
          key={option.id}
          theme={theme}
          label={option.label}
          variant={value === option.id ? 'primary' : 'ghost'}
          onPress={() => onSelect(option.id)}
        />
      ))}
    </View>
  ) : <Text style={styles.muted}>No hay opciones disponibles en este catálogo.</Text>;

  const renderDeleteConfirmation = (target: Exclude<DeleteTarget, null>) => (
    deleteTarget?.kind === target.kind && deleteTarget.id === target.id ? (
      <Card>
        <Text style={styles.body}>¿Quieres eliminar esta actividad?</Text>
        <View style={styles.horizontal}>
          <Button title="Cancelar" variant="outline" small onPress={() => setDeleteTarget(null)} />
          <Button
            title="Confirmar eliminación"
            variant="danger"
            small
            disabled={saving}
            onPress={() => void run('Se eliminó la actividad.', async () => {
              if (target.kind === 'fisicas') await deletePhysicalChallengeActivity(target.id);
              else await deleteDidacticChallengeActivity(target.id);
              setDeleteTarget(null);
            })}
          />
        </View>
      </Card>
    ) : null
  );

  const savePhysical = () => {
    const input: PhysicalActivityInput = {
      id_reto: Number(physicalDraft.challengeId),
      id_tipo_deporte: Number(physicalDraft.sportId),
      id_intensidad: Number(physicalDraft.intensityId),
      distancia_km: physicalDraft.distance.trim() ? Number(physicalDraft.distance) : null,
      tiempo_minutos: physicalDraft.minutes.trim() ? Number(physicalDraft.minutes) : null,
    };
    void run(physicalDraft.id ? 'Se actualizó la actividad física.' : 'Se creó la actividad física.', async () => {
      await savePhysicalChallengeActivity(userId, input, physicalDraft.id);
      setPhysicalDraft(EMPTY_PHYSICAL);
    });
  };

  const editPhysical = (activity: ActivityManagementSnapshot['physicalActivities'][number]) => {
    setPhysicalDraft({
      id: activity.id_actividad_fisica,
      challengeId: String(activity.id_reto),
      sportId: String(activity.id_tipo_deporte),
      intensityId: String(activity.id_intensidad),
      distance: activity.distancia_km === null ? '' : String(activity.distancia_km),
      minutes: activity.tiempo_minutos === null ? '' : String(activity.tiempo_minutos),
    });
  };

  const saveDidactic = () => {
    const input: DidacticActivityInput = {
      id_reto: Number(didacticDraft.challengeId),
      id_materia: Number(didacticDraft.subjectId),
      duracion_horas: didacticDraft.hours.trim() ? Number(didacticDraft.hours) : 0,
      duracion_minutos: didacticDraft.minutes.trim() ? Number(didacticDraft.minutes) : 0,
    };
    void run(didacticDraft.id ? 'Se actualizó la actividad didáctica.' : 'Se creó la actividad didáctica.', async () => {
      await saveDidacticChallengeActivity(userId, input, didacticDraft.id);
      setDidacticDraft(EMPTY_DIDACTIC);
    });
  };

  const editDidactic = (activity: ActivityManagementSnapshot['didacticActivities'][number]) => {
    setDidacticDraft({
      id: activity.id_actividad_didactica,
      challengeId: String(activity.id_reto),
      subjectId: String(activity.id_materia),
      hours: String(activity.duracion_horas),
      minutes: String(activity.duracion_minutos),
    });
  };

  if (loading && !snapshot) {
    return <Card><Text style={styles.body}>Cargando actividades…</Text></Card>;
  }

  return (
    <View style={{ gap: 16 }}>
      <SectionTitle title="Actividades de retos" subtitle="Las actividades se relacionan con un reto y usan los catálogos existentes." />
      {error ? (
        <View accessibilityRole="alert" style={styles.notice}>
          <Text style={styles.errorText}>{error}</Text>
          <Button title="Reintentar" small variant="outline" onPress={() => {
            void reload().then(() => setError('')).catch(cause => setError(friendlyError(cause, 'No se pudieron recargar las actividades.')));
          }} />
        </View>
      ) : null}
      {notice ? <Text accessibilityLiveRegion="polite" style={styles.noticeText}>{notice}</Text> : null}
      <View style={styles.wrap}>
        {([
          { id: 'fisicas', label: 'Físicas' },
          { id: 'didacticas', label: 'Didácticas' },
        ] as const).map(item => (
          <PillButton
            key={item.id}
            theme={theme}
            label={item.label}
            variant={section === item.id ? 'primary' : 'ghost'}
            onPress={() => setSection(item.id)}
          />
        ))}
      </View>

      {section === 'fisicas' ? (
        <>
          <SectionCard theme={theme} role="tutor" title={physicalDraft.id ? 'Editar actividad física' : 'Crear actividad física'}>
            <Text style={styles.inputLabel}>Reto</Text>
            {renderChoices(
              (snapshot?.challenges ?? []).map(item => ({ id: String(item.id_reto), label: item.descripcion_reto })),
              physicalDraft.challengeId,
              value => setPhysicalDraft(current => ({ ...current, challengeId: value })),
            )}
            <Text style={styles.inputLabel}>Deporte o actividad</Text>
            {renderChoices(
              (snapshot?.sports ?? []).map(item => ({ id: String(item.id_tipo_deporte), label: item.nombre })),
              physicalDraft.sportId,
              value => setPhysicalDraft(current => ({ ...current, sportId: value })),
            )}
            <Text style={styles.inputLabel}>Intensidad</Text>
            {renderChoices(
              (snapshot?.intensities ?? []).map(item => ({ id: String(item.id_intensidad), label: item.nombre })),
              physicalDraft.intensityId,
              value => setPhysicalDraft(current => ({ ...current, intensityId: value })),
            )}
            <View style={styles.horizontal}>
              <Field
                label="Distancia (km), si aplica"
                keyboardType="decimal-pad"
                value={physicalDraft.distance}
                onChangeText={value => setPhysicalDraft(current => ({ ...current, distance: value }))}
                style={styles.flex}
              />
              <Field
                label="Tiempo (minutos), si aplica"
                keyboardType="number-pad"
                value={physicalDraft.minutes}
                onChangeText={value => setPhysicalDraft(current => ({ ...current, minutes: value }))}
                style={styles.flex}
              />
            </View>
            <View style={styles.horizontal}>
              <Button
                title={physicalDraft.id ? 'Guardar cambios' : 'Crear actividad'}
                disabled={saving || !physicalDraft.challengeId || !physicalDraft.sportId || !physicalDraft.intensityId}
                onPress={savePhysical}
              />
              {physicalDraft.id ? <Button title="Cancelar" variant="outline" disabled={saving} onPress={() => setPhysicalDraft(EMPTY_PHYSICAL)} /> : null}
            </View>
            {!snapshot?.challenges.length ? <Text style={styles.muted}>Primero crea un reto para poder asociarle actividades.</Text> : null}
          </SectionCard>
          {snapshot?.physicalActivities.map(activity => (
            <SectionCard
              key={activity.id_actividad_fisica}
              theme={theme}
              role="tutor"
              title={challengeNames.get(activity.id_reto) ?? 'Reto'}
              subtitle={[
                sportNames.get(activity.id_tipo_deporte),
                intensityNames.get(activity.id_intensidad),
                activity.distancia_km === null ? null : `${activity.distancia_km} km`,
                activity.tiempo_minutos === null ? null : `${activity.tiempo_minutos} min`,
              ].filter(Boolean).join(' · ')}
            >
              <View style={styles.horizontal}>
                <Button title="Editar" icon="edit" variant="outline" small onPress={() => editPhysical(activity)} />
                <Button title="Eliminar" icon="close" variant="danger" small onPress={() => setDeleteTarget({ kind: 'fisicas', id: activity.id_actividad_fisica })} />
              </View>
              {renderDeleteConfirmation({ kind: 'fisicas', id: activity.id_actividad_fisica })}
            </SectionCard>
          ))}
          {!snapshot?.physicalActivities.length ? <Card><Text style={styles.muted}>Todavía no hay actividades físicas registradas para tus retos.</Text></Card> : null}
        </>
      ) : (
        <>
          <SectionCard theme={theme} role="tutor" title={didacticDraft.id ? 'Editar actividad didáctica' : 'Crear actividad didáctica'}>
            <Text style={styles.inputLabel}>Reto</Text>
            {renderChoices(
              (snapshot?.challenges ?? []).map(item => ({ id: String(item.id_reto), label: item.descripcion_reto })),
              didacticDraft.challengeId,
              value => setDidacticDraft(current => ({ ...current, challengeId: value })),
            )}
            <Text style={styles.inputLabel}>Materia</Text>
            {renderChoices(
              (snapshot?.subjects ?? []).map(item => ({ id: String(item.id_materia), label: item.nombre })),
              didacticDraft.subjectId,
              value => setDidacticDraft(current => ({ ...current, subjectId: value })),
            )}
            <View style={styles.horizontal}>
              <Field
                label="Duración (horas)"
                keyboardType="number-pad"
                value={didacticDraft.hours}
                onChangeText={value => setDidacticDraft(current => ({ ...current, hours: value }))}
                style={styles.flex}
              />
              <Field
                label="Duración (minutos)"
                keyboardType="number-pad"
                value={didacticDraft.minutes}
                onChangeText={value => setDidacticDraft(current => ({ ...current, minutes: value }))}
                style={styles.flex}
              />
            </View>
            <View style={styles.horizontal}>
              <Button
                title={didacticDraft.id ? 'Guardar cambios' : 'Crear actividad'}
                disabled={saving || !didacticDraft.challengeId || !didacticDraft.subjectId}
                onPress={saveDidactic}
              />
              {didacticDraft.id ? <Button title="Cancelar" variant="outline" disabled={saving} onPress={() => setDidacticDraft(EMPTY_DIDACTIC)} /> : null}
            </View>
            {!snapshot?.challenges.length ? <Text style={styles.muted}>Primero crea un reto para poder asociarle actividades.</Text> : null}
          </SectionCard>
          {snapshot?.didacticActivities.map(activity => (
            <SectionCard
              key={activity.id_actividad_didactica}
              theme={theme}
              role="tutor"
              title={challengeNames.get(activity.id_reto) ?? 'Reto'}
              subtitle={`${subjectNames.get(activity.id_materia) ?? 'Materia'} · ${activity.duracion_horas} h ${activity.duracion_minutos} min`}
            >
              <View style={styles.horizontal}>
                <Button title="Editar" icon="edit" variant="outline" small onPress={() => editDidactic(activity)} />
                <Button title="Eliminar" icon="close" variant="danger" small onPress={() => setDeleteTarget({ kind: 'didacticas', id: activity.id_actividad_didactica })} />
              </View>
              {renderDeleteConfirmation({ kind: 'didacticas', id: activity.id_actividad_didactica })}
            </SectionCard>
          ))}
          {!snapshot?.didacticActivities.length ? <Card><Text style={styles.muted}>Todavía no hay actividades didácticas registradas para tus retos.</Text></Card> : null}
        </>
      )}
    </View>
  );
}
