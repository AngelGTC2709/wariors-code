import { createContext, useCallback, useContext, useEffect, type ReactNode } from 'react';
import { useAudioPlayer, type AudioPlayer } from 'expo-audio';

export type SoundCueName = 'sesion' | 'rol' | 'celebracion';

type SoundEffects = {
  playTap: () => void;
  playCelebration: () => void;
  playSessionStart: () => void;
  playRoleSwitch: () => void;
};

const SoundEffectsContext = createContext<SoundEffects | null>(null);
const noSound = () => undefined;
const NO_SOUND_EFFECTS: SoundEffects = {
  playTap: noSound,
  playCelebration: noSound,
  playSessionStart: noSound,
  playRoleSwitch: noSound,
};

function playFromStart(player: AudioPlayer, cue: string) {
  void player.seekTo(0).then(() => player.play()).catch(error => {
    if (__DEV__) console.warn(`No se pudo reproducir el efecto de sonido "${cue}".`, error);
  });
}

export function SoundEffectsProvider({ enabled, children }: { enabled: boolean; children: ReactNode }) {
  const tapPlayer = useAudioPlayer(require('@/assets/audio/tap.wav'));
  const celebrationPlayer = useAudioPlayer(require('@/assets/audio/celebration.wav'));

  const sessionPlayer = useAudioPlayer(require('@/assets/audio/session-start.wav'));
  const rolePlayer = useAudioPlayer(require('@/assets/audio/role-switch.wav'));

  useEffect(() => {
    if (!enabled) {
      tapPlayer.pause();
      celebrationPlayer.pause();
      sessionPlayer.pause();
      rolePlayer.pause();
    }
  }, [celebrationPlayer, enabled, rolePlayer, sessionPlayer, tapPlayer]);

  const playTap = useCallback(() => {
    if (!enabled) return;
    playFromStart(tapPlayer, 'toque');
  }, [enabled, tapPlayer]);

  const playCelebration = useCallback(() => {
    if (!enabled) return;
    playFromStart(celebrationPlayer, 'celebración');
  }, [celebrationPlayer, enabled]);

  const playSessionStart = useCallback(() => {
    if (!enabled) return;
    playFromStart(sessionPlayer, 'inicio de sesión');
  }, [enabled, sessionPlayer]);

  const playRoleSwitch = useCallback(() => {
    if (!enabled) return;
    playFromStart(rolePlayer, 'cambio de rol');
  }, [enabled, rolePlayer]);

  return (
    <SoundEffectsContext.Provider value={{ playTap, playCelebration, playSessionStart, playRoleSwitch }}>
      {children}
    </SoundEffectsContext.Provider>
  );
}

export function useSoundEffects(): SoundEffects {
  return useContext(SoundEffectsContext) ?? NO_SOUND_EFFECTS;
}

// Reproduce una señal solicitada desde fuera del proveedor y la consume.
export function SoundCue({ cue, onPlayed }: { cue: { name: SoundCueName; id: number } | null; onPlayed: () => void }) {
  const { playCelebration, playSessionStart, playRoleSwitch } = useSoundEffects();
  useEffect(() => {
    if (!cue) return;
    if (cue.name === 'sesion') playSessionStart();
    else if (cue.name === 'rol') playRoleSwitch();
    else playCelebration();
    onPlayed();
  }, [cue, onPlayed, playCelebration, playRoleSwitch, playSessionStart]);
  return null;
}
