// Modelo de una auditoría de accesibilidad, independiente de axe-core.

export type Gravedad = 'critico' | 'serio' | 'moderado' | 'menor';

export const GRAVEDADES: Gravedad[] = ['critico', 'serio', 'moderado', 'menor'];

export const NOMBRE_GRAVEDAD: Record<Gravedad, string> = {
  critico: 'Crítico',
  serio: 'Serio',
  moderado: 'Moderado',
  menor: 'Menor',
};

export interface CriterioWcag {
  id: string; // "1.1.1"
  nombre: string; // "Contenido no textual"
  nivel: 'A' | 'AA' | 'AAA' | '';
}

export interface NodoProblema {
  selector: string; // ubicación: el selector CSS que da axe
  html: string; // fragmento del elemento (recortado)
}

export interface Problema {
  regla: string; // id de la regla de axe, por ejemplo "image-alt"
  gravedad: Gravedad;
  descripcion: string; // en español
  ayudaUrl: string;
  criterios: CriterioWcag[];
  nodos: NodoProblema[];
}

export interface ResultadoAuditoria {
  problemas: Problema[];
  reglasAprobadas: number;
  fecha: string;
}
