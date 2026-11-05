export function cleanText(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase('es-MX')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function unique(values: string[]): string[] {
  return [...new Set(values)];
}
