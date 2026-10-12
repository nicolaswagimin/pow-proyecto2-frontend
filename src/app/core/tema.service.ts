import { Injectable, signal } from '@angular/core';
import { prefiereMenosMovimiento } from './movimiento';

export type Tema = 'claro' | 'oscuro';

const CLAVE = 'tema';

// Tema claro/oscuro: la primera vez sigue al sistema; después recuerda la elección.
@Injectable({ providedIn: 'root' })
export class TemaService {
  private readonly consultaOscuro = matchMedia('(prefers-color-scheme: dark)');
  private elegido = leerGuardado();

  readonly tema = signal<Tema>(this.elegido ?? this.temaDelSistema());

  constructor() {
    // Mientras la persona no elija, el tema acompaña los cambios del sistema.
    this.consultaOscuro.addEventListener('change', () => {
      if (!this.elegido) this.tema.set(this.temaDelSistema());
    });
  }

  alternar(): void {
    const nuevo: Tema = this.tema() === 'oscuro' ? 'claro' : 'oscuro';
    const aplicar = () => {
      this.elegido = nuevo;
      guardar(nuevo);
      document.documentElement.dataset['theme'] = nuevo === 'oscuro' ? 'dark' : 'light';
      this.tema.set(nuevo);
    };

    if (!document.startViewTransition || prefiereMenosMovimiento()) {
      aplicar();
      return;
    }
    document.startViewTransition(aplicar);
  }

  private temaDelSistema(): Tema {
    return this.consultaOscuro.matches ? 'oscuro' : 'claro';
  }
}

function leerGuardado(): Tema | null {
  try {
    const valor = localStorage.getItem(CLAVE);
    return valor === 'claro' || valor === 'oscuro' ? valor : null;
  } catch {
    return null;
  }
}

function guardar(tema: Tema): void {
  try {
    localStorage.setItem(CLAVE, tema);
  } catch {
    // Sin almacenamiento (modo privado): el tema solo dura esta visita.
  }
}
