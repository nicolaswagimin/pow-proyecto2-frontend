import { ChangeDetectionStrategy, Component, ElementRef, signal, viewChild } from '@angular/core';
import { esperar, leerToken, prefiereMenosMovimiento } from '../../core/movimiento';

type TipoPieza = 'circulo' | 'cuadrado' | 'triangulo' | 'media-luna';

interface Pieza {
  x: number;
  y: number;
  vx: number;
  vy: number;
  giro: number;
  vGiro: number;
  tam: number;
  tipo: TipoPieza;
  color: string;
}

interface Punto {
  x: number;
  y: number;
}

const TIPOS: TipoPieza[] = ['circulo', 'cuadrado', 'triangulo', 'media-luna'];

// Celebración de éxito: confeti de formas geométricas primarias que salen disparadas girando,
// y un check que cae sobre la tarjeta como un sello estampado.
@Component({
  selector: 'fx-confeti',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <canvas #lienzo></canvas>
    @if (centro(); as c) {
      <div class="sello" [style.left.px]="c.x" [style.top.px]="c.y">
        <span class="impacto"></span>
        <svg viewBox="0 0 100 100">
          <circle class="sello__aro" cx="50" cy="50" r="44" />
          <circle class="sello__aro sello__aro--interno" cx="50" cy="50" r="36" />
          <path class="sello__check" d="M30 52l13 13 28-30" />
        </svg>
      </div>
    }
  `,
  styleUrl: './confeti.css',
  host: { 'aria-hidden': 'true' },
})
export class Confeti {
  protected readonly centro = signal<Punto | null>(null);
  private readonly lienzo = viewChild.required<ElementRef<HTMLCanvasElement>>('lienzo');

  async lanzar(origen: Punto, centro: Punto): Promise<void> {
    this.centro.set(centro);
    if (prefiereMenosMovimiento()) {
      await esperar(700);
      return;
    }
    await Promise.all([this.disparar(origen), esperar(1400)]);
  }

  private disparar(origen: Punto): Promise<void> {
    const lienzo = this.lienzo().nativeElement;
    const ctx = lienzo.getContext('2d');
    if (!ctx) return Promise.resolve();

    const dpr = Math.min(devicePixelRatio || 1, 1.75);
    lienzo.width = Math.round(innerWidth * dpr);
    lienzo.height = Math.round(innerHeight * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const colores = ['--color-rojo', '--color-amarillo', '--color-cobalto', '--color-tinta'].map(
      leerToken,
    );
    const piezas: Pieza[] = Array.from({ length: innerWidth < 600 ? 60 : 110 }, () => ({
      x: origen.x + (Math.random() - 0.5) * 60,
      y: origen.y,
      vx: (Math.random() - 0.5) * 18,
      vy: -8 - Math.random() * 14,
      giro: Math.random() * Math.PI * 2,
      vGiro: (Math.random() - 0.5) * 0.4,
      tam: 7 + Math.random() * 11,
      tipo: TIPOS[Math.floor(Math.random() * TIPOS.length)],
      color: colores[Math.floor(Math.random() * colores.length)],
    }));

    return new Promise((resolver) => {
      let ultimo = performance.now();
      const inicio = ultimo;
      const paso = (t: number) => {
        const dt = Math.min((t - ultimo) / 16.67, 3);
        ultimo = t;
        ctx.clearRect(0, 0, innerWidth, innerHeight);

        let vivas = 0;
        for (const p of piezas) {
          if (p.y > innerHeight + 40) continue;
          vivas++;
          p.vy += 0.42 * dt;
          p.vx *= 0.985;
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.giro += p.vGiro * dt;
          dibujarPieza(ctx, p);
        }

        if (vivas > 0 && t - inicio < 2600) {
          requestAnimationFrame(paso);
        } else {
          ctx.clearRect(0, 0, innerWidth, innerHeight);
          resolver();
        }
      };
      requestAnimationFrame(paso);
    });
  }
}

function dibujarPieza(ctx: CanvasRenderingContext2D, p: Pieza): void {
  const m = p.tam / 2;
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.giro);
  ctx.fillStyle = p.color;
  ctx.beginPath();
  switch (p.tipo) {
    case 'circulo':
      ctx.arc(0, 0, m, 0, Math.PI * 2);
      break;
    case 'cuadrado':
      ctx.rect(-m, -m, p.tam, p.tam);
      break;
    case 'triangulo':
      ctx.moveTo(0, -m);
      ctx.lineTo(m, m);
      ctx.lineTo(-m, m);
      ctx.closePath();
      break;
    case 'media-luna':
      ctx.arc(0, m / 2, m, Math.PI, 0);
      ctx.closePath();
      break;
  }
  ctx.fill();
  ctx.restore();
}
