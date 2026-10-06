// Preferencias del dispositivo que deciden cuánto se anima.

export function prefiereMenosMovimiento(): boolean {
  return matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// Táctil o sin puntero fino: se desactivan inclinación, magnetismo y luces que siguen al cursor.
export function esTactil(): boolean {
  return matchMedia('(hover: none), (pointer: coarse)').matches;
}

export function esperar(ms: number): Promise<void> {
  return new Promise((resolver) => setTimeout(resolver, ms));
}

// Lee un token CSS ya resuelto (por ejemplo --color-brillo) del documento.
export function leerToken(nombre: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(nombre).trim();
}
