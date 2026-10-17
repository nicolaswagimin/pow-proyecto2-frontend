import { Rango } from './fragmentos';

export interface Reemplazo extends Rango {
  texto: string;
}

// Aplica correcciones como reemplazos de texto: el resto del documento queda byte a byte igual
// (el DOM nunca se vuelve a serializar), así el diff solo muestra lo corregido.
export function aplicarReemplazos(html: string, reemplazos: Reemplazo[]): string {
  const orden = [...reemplazos].sort((a, b) => a.inicio - b.inicio);
  for (const [i, r] of orden.entries()) {
    if (r.inicio < 0 || r.fin > html.length || r.fin < r.inicio) {
      throw new Error('Un reemplazo queda fuera del documento.');
    }
    if (i > 0 && r.inicio < orden[i - 1].fin) throw new Error('Dos reemplazos se pisan.');
  }
  let salida = html;
  for (const r of orden.reverse())
    salida = salida.slice(0, r.inicio) + r.texto + salida.slice(r.fin);
  return salida;
}
