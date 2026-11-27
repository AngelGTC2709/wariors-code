// Conversión UTF-8 sin depender de TextEncoder/TextDecoder, que no existen en todos los motores.

export function utf8Encode(text: string): Uint8Array {
  const bytes: number[] = [];
  for (let index = 0; index < text.length; index += 1) {
    let code = text.charCodeAt(index);
    if (code >= 0xd800 && code <= 0xdbff && index + 1 < text.length) {
      const next = text.charCodeAt(index + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        code = 0x10000 + ((code - 0xd800) << 10) + (next - 0xdc00);
        index += 1;
      }
    }
    if (code < 0x80) {
      bytes.push(code);
    } else if (code < 0x800) {
      bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    } else if (code < 0x10000) {
      bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
    } else {
      bytes.push(
        0xf0 | (code >> 18),
        0x80 | ((code >> 12) & 0x3f),
        0x80 | ((code >> 6) & 0x3f),
        0x80 | (code & 0x3f),
      );
    }
  }
  return Uint8Array.from(bytes);
}

export function utf8Decode(bytes: Uint8Array): string {
  const units: number[] = [];
  let index = 0;
  while (index < bytes.length) {
    const first = bytes[index];
    let code: number;
    if (first < 0x80) {
      code = first;
      index += 1;
    } else if (first >= 0xf0) {
      code = ((first & 0x07) << 18) | ((bytes[index + 1] & 0x3f) << 12) | ((bytes[index + 2] & 0x3f) << 6) | (bytes[index + 3] & 0x3f);
      index += 4;
    } else if (first >= 0xe0) {
      code = ((first & 0x0f) << 12) | ((bytes[index + 1] & 0x3f) << 6) | (bytes[index + 2] & 0x3f);
      index += 3;
    } else {
      code = ((first & 0x1f) << 6) | (bytes[index + 1] & 0x3f);
      index += 2;
    }
    if (code >= 0x10000) {
      const offset = code - 0x10000;
      units.push(0xd800 + (offset >> 10), 0xdc00 + (offset & 0x3ff));
    } else {
      units.push(code);
    }
  }
  let text = '';
  for (let start = 0; start < units.length; start += 8192) {
    text += String.fromCharCode(...units.slice(start, start + 8192));
  }
  return text;
}
