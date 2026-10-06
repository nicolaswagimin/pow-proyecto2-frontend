// Fortaleza de una contraseña en niveles de 0 (vacía) a 4 (muy fuerte).
export type NivelFuerza = 0 | 1 | 2 | 3 | 4;

export const ETIQUETAS_FUERZA: Record<NivelFuerza, string> = {
  0: '',
  1: 'Débil',
  2: 'Aceptable',
  3: 'Fuerte',
  4: 'Muy fuerte',
};

export function calcularFuerza(password: string): NivelFuerza {
  if (!password) return 0;
  const variedad = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((regla) =>
    regla.test(password),
  ).length;
  if (password.length < 8 || variedad <= 1) return 1;
  if (password.length >= 12 && variedad >= 3) return 4;
  if (variedad >= 3 || password.length >= 12) return 3;
  return 2;
}

export function pistaFuerza(password: string, nivel: NivelFuerza): string {
  if (nivel === 0) return '';
  if (password.length < 8) return 'Usa al menos 8 caracteres.';
  if (nivel === 2) return 'Mezcla mayúsculas, números o símbolos para hacerla más fuerte.';
  if (nivel === 3) return 'Bien. Con 12 caracteres o más será muy fuerte.';
  if (nivel === 1) return 'Mezcla letras con números o símbolos.';
  return '¡Excelente!';
}
