import React from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { SceneAnimation } from './SceneAnimation';
import { SCENES } from './scenes';

const ACTIVITY_SCENES: Record<string, keyof typeof SCENES> = {
  dance: 'baila',
  animals: 'imita-animales',
  walk: 'paseo',
  stretch: 'estira-gigante',
};

const normalize = (s = '') =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();

/** Acepta la clave ('baila', 'imita-animales', 'paseo', 'estira-gigante') o el título de la actividad. */
export function getActivityScene(activity: string) {
  if (!activity) return null;
  const sceneKey = ACTIVITY_SCENES[activity];
  if (sceneKey) return SCENES[sceneKey];
  if (Object.prototype.hasOwnProperty.call(SCENES, activity)) return SCENES[activity as keyof typeof SCENES];
  const n = normalize(activity);
  if (n.includes('baila')) return SCENES.baila;
  if (n.includes('animal')) return SCENES['imita-animales'];
  if (n.includes('paseo') || n.includes('descubrir')) return SCENES.paseo;
  if (n.includes('estira') || n.includes('gigante')) return SCENES['estira-gigante'];
  return null;
}

/**
 * <ActivityAnimation activity="Imita animales" size={220} />
 * Si la actividad no tiene animación, no muestra nada.
 */
export function ActivityAnimation({ activity, size = 220, playing = true, style, rounded, staticFrame }: {
  activity: string;
  size?: number;
  playing?: boolean;
  style?: StyleProp<ViewStyle>;
  rounded?: boolean;
  staticFrame?: boolean;
}) {
  const scene = getActivityScene(activity);
  if (!scene) return null;
  return <SceneAnimation scene={scene} size={size} playing={playing} style={style} rounded={rounded} staticFrame={staticFrame} />;
}
