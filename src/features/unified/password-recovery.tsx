import { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Field, Icon, styles } from '@/features/unified/ui';
import { COLORS } from '@/features/unified/constants';
import { friendlyError } from '@/features/unified/utils';
import { getSupabaseClient } from '@/lib/supabase';

export default function PasswordRecoveryScreen() {
  const { token_hash: tokenHashParam, type: typeParam } = useLocalSearchParams<{
    token_hash?: string | string[];
    type?: string | string[];
  }>();
  const tokenHash = Array.isArray(tokenHashParam) ? tokenHashParam[0] : tokenHashParam;
  const recoveryType = Array.isArray(typeParam) ? typeParam[0] : typeParam;
  const [recoveryReady, setRecoveryReady] = useState(false);
  const [recoveryError, setRecoveryError] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const [complete, setComplete] = useState(false);
  const invalidLinkMessage = !tokenHash || recoveryType !== 'recovery'
    ? 'El enlace no es válido o ya venció. Solicita uno nuevo desde el inicio de sesión.'
    : '';

  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;

    const initializeRecovery = async () => {
      const supabase = getSupabaseClient();
      const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
        if (active && event === 'PASSWORD_RECOVERY' && session) {
          setRecoveryReady(true);
          setRecoveryError('');
        }
      });
      unsubscribe = () => authListener.subscription.unsubscribe();

      if (tokenHash && recoveryType === 'recovery') {
        const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'recovery' });
        if (active && error) {
          setRecoveryError('El enlace no es válido o ya venció. Solicita uno nuevo desde el inicio de sesión.');
        }
      }
    };

    void initializeRecovery().catch(error => {
      if (!active) return;
      setRecoveryError(friendlyError(error, 'No se pudo configurar Supabase.'));
    });

    return () => {
      active = false;
      unsubscribe?.();
    };
  }, [recoveryType, tokenHash]);

  const updatePassword = async () => {
    setFormError('');
    if (newPassword.length < 6) {
      setFormError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setFormError('Las contraseñas no coinciden.');
      return;
    }

    setBusy(true);
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) {
        setFormError('La contraseña se actualizó, pero no se pudo cerrar la sesión de recuperación. Cierra y vuelve a abrir la app antes de iniciar sesión.');
        return;
      }
      setNewPassword('');
      setConfirmPassword('');
      setComplete(true);
    } catch (error) {
      setFormError(friendlyError(error, 'No se pudo actualizar la contraseña.'));
    } finally {
      setBusy(false);
    }
  };

  const returnToLogin = () => router.replace('/');

  return (
    <SafeAreaView style={styles.authRoot}>
      <KeyboardAvoidingView
        style={[styles.shell, { backgroundColor: COLORS.navy }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.authScroll} keyboardShouldPersistTaps="handled">
          <View style={styles.brandLockup}>
            <View style={styles.brandMark}><Icon name="child" size={29} color={COLORS.white} /></View>
            <View>
              <Text style={styles.brandTitle}>Warrior Kids</Text>
              <Text style={styles.brandCaption}>CRECEMOS EN FAMILIA</Text>
            </View>
          </View>
          <Text style={styles.authTitle}>Restablece tu contraseña</Text>
          <Text style={styles.authSubtitle}>
            {complete
              ? 'Tu contraseña se actualizó correctamente.'
              : 'Elige una contraseña nueva para tu cuenta de tutor.'}
          </Text>
          <View style={styles.authCard}>
            {complete ? (
              <Button title="Volver al inicio de sesión" onPress={returnToLogin} />
            ) : invalidLinkMessage || recoveryError ? (
              <>
                <Text accessibilityRole="alert" style={styles.errorText}>{invalidLinkMessage || recoveryError}</Text>
                <Button title="Volver al inicio de sesión" variant="outline" onPress={returnToLogin} />
              </>
            ) : !recoveryReady ? (
              <View style={{ alignItems: 'center', gap: 12 }}>
                <ActivityIndicator color={COLORS.blue} />
                <Text style={styles.authNotice}>Validando el enlace…</Text>
              </View>
            ) : (
              <>
                <Field
                  autoCapitalize="none"
                  autoComplete="new-password"
                  label="Nueva contraseña"
                  onChangeText={setNewPassword}
                  onSubmitEditing={updatePassword}
                  returnKeyType="next"
                  secureTextEntry
                  value={newPassword}
                />
                <Field
                  autoCapitalize="none"
                  autoComplete="new-password"
                  label="Confirma tu nueva contraseña"
                  onChangeText={setConfirmPassword}
                  onSubmitEditing={updatePassword}
                  returnKeyType="done"
                  secureTextEntry
                  value={confirmPassword}
                />
                {formError ? <Text accessibilityRole="alert" style={styles.errorText}>{formError}</Text> : null}
                <Button
                  title={busy ? 'Actualizando…' : 'Actualizar contraseña'}
                  disabled={busy}
                  onPress={updatePassword}
                />
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
