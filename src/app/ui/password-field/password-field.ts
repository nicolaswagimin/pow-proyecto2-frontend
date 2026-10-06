import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  booleanAttribute,
  computed,
  forwardRef,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { Icon } from '../icon/icon';
import { StrengthMeter } from '../strength-meter/strength-meter';

let contador = 0;

@Component({
  selector: 'ui-password-field',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon, StrengthMeter],
  templateUrl: './password-field.html',
  styleUrls: ['../text-field/campo.css', './password-field.css'],
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => PasswordField), multi: true },
  ],
})
export class PasswordField implements ControlValueAccessor {
  readonly label = input('Contraseña');
  readonly autocomplete = input<'current-password' | 'new-password'>('current-password');
  readonly ayuda = input<string | null>(null);
  readonly error = input<string | null>(null);
  readonly conMedidor = input(false, { transform: booleanAttribute });

  protected readonly id = `clave-${++contador}`;
  protected readonly valor = signal('');
  protected readonly enfocado = signal(false);
  protected readonly deshabilitado = signal(false);
  protected readonly visible = signal(false);
  protected readonly mayusculas = signal(false);
  protected readonly flotante = computed(() => this.enfocado() || this.valor() !== '');
  protected readonly describedBy = computed(() => {
    const ids = [this.error() ? `${this.id}-error` : this.ayuda() ? `${this.id}-ayuda` : null];
    if (this.mayusculas()) ids.push(`${this.id}-mayus`);
    if (this.conMedidor() && this.valor()) ids.push(`${this.id}-medidor`);
    return ids.filter(Boolean).join(' ') || null;
  });

  private readonly control = viewChild.required<ElementRef<HTMLInputElement>>('control');
  private alCambiar: (valor: string) => void = () => {};
  private alTocar: () => void = () => {};

  // Cambia el tipo directamente en el DOM para conservar el foco y la posición del cursor.
  protected alternarVisible(): void {
    const campo = this.control().nativeElement;
    const { selectionStart, selectionEnd } = campo;
    const enfocado = document.activeElement === campo;
    this.visible.update((v) => !v);
    campo.type = this.visible() ? 'text' : 'password';
    if (enfocado && selectionStart !== null) campo.setSelectionRange(selectionStart, selectionEnd);
  }

  protected revisarMayusculas(evento: KeyboardEvent): void {
    if (typeof evento.getModifierState === 'function') {
      this.mayusculas.set(evento.getModifierState('CapsLock'));
    }
  }

  protected escribir(evento: Event): void {
    const valor = (evento.target as HTMLInputElement).value;
    this.valor.set(valor);
    this.alCambiar(valor);
  }

  protected salir(): void {
    this.enfocado.set(false);
    this.mayusculas.set(false);
    this.alTocar();
  }

  enfocar(): void {
    this.control().nativeElement.focus();
  }

  writeValue(valor: string | null): void {
    this.valor.set(valor ?? '');
  }

  registerOnChange(fn: (valor: string) => void): void {
    this.alCambiar = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.alTocar = fn;
  }

  setDisabledState(deshabilitado: boolean): void {
    this.deshabilitado.set(deshabilitado);
  }
}
