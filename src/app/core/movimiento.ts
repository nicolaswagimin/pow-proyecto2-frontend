// Preferencias del dispositivo que deciden cuánto se anima.

export function prefiereMenosMovimiento(): boolean {
  return matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// Lee un token CSS ya resuelto (por ejemplo --color-primario) del documento.
export function leerToken(nombre: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(nombre).trim();
}
