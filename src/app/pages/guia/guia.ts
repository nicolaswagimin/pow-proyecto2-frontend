import { ChangeDetectionStrategy, Component, afterNextRender, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { APP_NOMBRE } from '../../config';
import { leerToken } from '../../core/movimiento';
import { Auditoria } from '../../lente/auditoria';
import { contrasteEntre } from '../../lente/inspeccion';
import { Margen } from '../../lente/margen';
import { Alert } from '../../ui/alert/alert';
import { Avatar } from '../../ui/avatar/avatar';
import { Button } from '../../ui/button/button';
import { Icon, NombreIcono } from '../../ui/icon/icon';
import { PasswordField } from '../../ui/password-field/password-field';
import { TextField } from '../../ui/text-field/text-field';
import { ThemeToggle } from '../../ui/theme-toggle/theme-toggle';

// Colores de texto y de estado: cada uno se mide contra el fondo y la superficie.
const COLORES = [
  '--color-texto',
  '--color-texto-suave',
  '--color-primario',
  '--color-enlace',
  '--color-error',
  '--color-exito',
  '--color-aviso',
  '--color-borde',
  '--color-foco',
];

// Colores de superficie: no llevan texto encima salvo su par indicado.
const FONDOS = [
  '--color-fondo',
  '--color-superficie',
  '--color-marcador',
  '--color-regla',
  '--color-linea-margen',
];

interface Muestra {
  nombre: string;
  valor: string;
  sobreFondo: number | null;
  sobreSuperficie: number | null;
}

// Guía de estilo viva: tokens con su contraste medido en vivo y cada componente en todos sus
// estados. Sus controles también se anotan en el margen. No se enlaza desde la app.
@Component({
  selector: 'app-guia',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    Auditoria,
    Margen,
    Alert,
    Avatar,
    Button,
    Icon,
    PasswordField,
    TextField,
    ThemeToggle,
  ],
  templateUrl: './guia.html',
  styleUrl: './guia.css',
})
export class Guia {
  protected readonly nombreApp = APP_NOMBRE;
  protected readonly colores = signal<Muestra[]>([]);
  protected readonly fondos = signal<{ nombre: string; valor: string }[]>([]);
  protected readonly escala = [
    '--text-3xl',
    '--text-2xl',
    '--text-xl',
    '--text-lg',
    '--text-base',
    '--text-sm',
    '--text-xs',
  ];
  protected readonly iconos: NombreIcono[] = [
    'correo',
    'candado',
    'usuario',
    'alerta',
    'check',
    'info',
    'salir',
    'chispa',
    'papelera',
    'recargar',
    'mas',
    'mayus',
  ];

  protected readonly vacio = new FormControl('', { nonNullable: true });
  protected readonly conValor = new FormControl('ana@ejemplo.com', { nonNullable: true });
  protected readonly conError = new FormControl('ana@', { nonNullable: true });
  protected readonly deshabilitado = new FormControl(
    { value: 'No editable', disabled: true },
    { nonNullable: true },
  );
  protected readonly clave = new FormControl('Lente2026!', { nonNullable: true });
  protected readonly cargando = signal(false);

  constructor() {
    inject(Title).setTitle(`Guía de diseño · ${APP_NOMBRE}`);
    afterNextRender(() => this.leerColores());
  }

  // El tema cambia dentro de una View Transition: se espera un momento antes de releer los tokens.
  protected releerColores(): void {
    setTimeout(() => this.leerColores(), 300);
  }

  private leerColores(): void {
    const fondo = leerToken('--color-fondo');
    const superficie = leerToken('--color-superficie');
    this.colores.set(
      COLORES.map((nombre) => {
        const valor = leerToken(nombre);
        return {
          nombre,
          valor,
          sobreFondo: contrasteEntre(valor, fondo),
          sobreSuperficie: contrasteEntre(valor, superficie),
        };
      }),
    );
    this.fondos.set(FONDOS.map((nombre) => ({ nombre, valor: leerToken(nombre) })));
  }

  protected nivel(ratio: number | null, minimo = 4.5): string {
    if (ratio === null) return '';
    if (ratio >= 7) return 'AAA';
    if (ratio >= minimo) return 'AA';
    return ratio >= 3 ? 'Solo controles' : 'No cumple';
  }

  protected demoCarga(): void {
    this.cargando.set(true);
    setTimeout(() => this.cargando.set(false), 2200);
  }
}
