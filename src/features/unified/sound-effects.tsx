import { createContext, useCallback, useContext, useEffect, type ReactNode } from 'react';
import { useAudioPlayer, type AudioPlayer } from 'expo-audio';

type SoundEffects = {
  playTap: () => void;
  playCelebration: () => void;
};

const SoundEffectsContext = createContext<SoundEffects | null>(null);
const noSound = () => undefined;
const NO_SOUND_EFFECTS: SoundEffects = { playTap: noSound, playCelebration: noSound };

function playFromStart(player: AudioPlayer, cue: string) {
  void player.seekTo(0).then(() => player.play()).catch(error => {
    if (__DEV__) console.warn(`No se pudo reproducir el efecto de sonido "${cue}".`, error);
  });
}

export function SoundEffectsProvider({ enabled, children }: { enabled: boolean; children: ReactNode }) {
  const tapPlayer = useAudioPlayer(require('@/assets/audio/tap.wav'));
  const celebrationPlayer = useAudioPlayer(require('@/assets/audio/celebration.wav'));

  useEffect(() => {
    if (!enabled) {
      tapPlayer.pause();
      celebrationPlayer.pause();
    }
  }, [celebrationPlayer, enabled, tapPlayer]);

  const playTap = useCallback(() => {
    if (!enabled) return;
    playFromStart(tapPlayer, 'toque');
  }, [enabled, tapPlayer]);

  const playCelebration = useCallback(() => {
    if (!enabled) return;
    playFromStart(celebrationPlayer, 'celebración');
  }, [celebrationPlayer, enabled]);

  return (
    <SoundEffectsContext.Provider value={{ playTap, playCelebration }}>
      {children}
    </SoundEffectsContext.Provider>
  );
}

export function useSoundEffects(): SoundEffects {
  return useContext(SoundEffectsContext) ?? NO_SOUND_EFFECTS;
}
