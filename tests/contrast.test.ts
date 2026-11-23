import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { sharedFor, themesFor, type ThemeMode } from '../src/features/unified/tokens.ts';

function luminance(hex: string): number {
  const value = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map(start => {
    const channel = Number.parseInt(value.slice(start, start + 2), 16) / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

const AA_TEXT = 4.5;

for (const mode of ['light', 'dark', 'darkNina'] as ThemeMode[]) {
  describe(`contraste en modo ${mode}`, () => {
    const shared = sharedFor(mode);
    for (const [name, theme] of Object.entries(themesFor(mode))) {
      const pairs: [string, string, string][] = [
        ['texto sobre fondo', theme.texto, theme.fondoInicio],
        ['texto sobre tarjeta', theme.texto, shared.tarjeta],
        ['texto secundario sobre fondo', shared.textoSecundario, theme.fondoInicio],
        ['texto secundario sobre tarjeta', shared.textoSecundario, shared.tarjeta],
        ['texto sobre botón', shared.sobreAcento, theme.acento],
        ['texto sobre acento suave', theme.texto, theme.acentoSuave],
      ];
      for (const [label, foreground, background] of pairs) {
        it(`${name}: ${label}`, () => {
          const ratio = contrast(foreground, background);
          assert.ok(ratio >= AA_TEXT, `${foreground} sobre ${background} = ${ratio.toFixed(2)}`);
        });
      }
    }
  });
}
