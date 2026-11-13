import React from 'react';
import { SceneAnimation } from './SceneAnimation';
import { SCENES } from './scenes';

const normalize = (s = '') =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();

/** Acepta la clave ('baila', 'imita-animales', 'paseo', 'estira-gigante') o el título de la actividad. */
export function getActivityScene(activity) {
  if (!activity) return null;
  if (SCENES[activity]) return SCENES[activity];
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
export function ActivityAnimation({ activity, size = 220, playing = true, style, rounded }) {
  const scene = getActivityScene(activity);
  if (!scene) return null;
  return <SceneAnimation scene={scene} size={size} playing={playing} style={style} rounded={rounded} />;
}
