import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Title } from '@angular/platform-browser';
import { Router, RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment';
import { APP_NOMBRE } from '../../config';
import { AuthService } from '../../core/auth.service';
import { mapearError } from '../../core/errores';
import { Formas } from '../../fx/formas/formas';
import { ApiService, Estado, Item } from '../../services/api.service';
import { Alert } from '../../ui/alert/alert';
import { Avatar } from '../../ui/avatar/avatar';
import { Button } from '../../ui/button/button';
import { Icon } from '../../ui/icon/icon';
import { TextField } from '../../ui/text-field/text-field';
import { ThemeToggle } from '../../ui/theme-toggle/theme-toggle';

@Component({
  selector: 'app-inicio',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    ReactiveFormsModule,
    RouterLink,
    Formas,
    Alert,
    Avatar,
    Button,
    Icon,
    TextField,
    ThemeToggle,
  ],
  templateUrl: './inicio.html',
  styleUrl: './inicio.css',
})
export class Inicio {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly fb = inject(NonNullableFormBuilder);
  protected readonly auth = inject(AuthService);

  protected readonly nombreApp = APP_NOMBRE;
  protected readonly apiUrl = environment.apiUrl;
  protected readonly usuario = this.auth.usuario;
  protected readonly primerNombre = computed(
    () => (this.usuario()?.nombre ?? '').trim().split(/\s+/)[0] || 'de nuevo',
  );
  protected readonly letrasSaludo = computed(() => [...`Hola, ${this.primerNombre()}`]);

  // Estado de conexión
  protected readonly estado = signal<Estado | null>(null);
  protected readonly cargandoEstado = signal(true);

  // Registros
  protected readonly items = signal<Item[]>([]);
  protected readonly cargandoItems = signal(false);
  protected readonly guardando = signal(false);
  protected readonly errorItems = signal('');
  protected readonly formItem = this.fb.group({
    titulo: ['', [Validators.required, Validators.maxLength(200)]],
    descripcion: [''],
  });

  // IA
  protected readonly formIA = this.fb.group({ pregunta: ['', Validators.required] });
  protected readonly respuesta = signal('');
  protected readonly pensando = signal(false);
  protected readonly errorIA = signal('');

  constructor() {
    inject(Title).setTitle(`Inicio · ${APP_NOMBRE}`);
    this.auth.refrescarUsuario();
    this.revisarEstado();
  }

  protected revisarEstado(): void {
    this.cargandoEstado.set(true);
    this.api.estado().subscribe({
      next: (estado) => {
        this.estado.set(estado);
        this.cargandoEstado.set(false);
        if (estado.db) this.cargarItems();
      },
      error: () => {
        this.estado.set(null);
        this.cargandoEstado.set(false);
      },
    });
  }

  private cargarItems(): void {
    this.cargandoItems.set(true);
    this.api.listar().subscribe({
      next: (items) => {
        this.items.set(items);
        this.errorItems.set('');
        this.cargandoItems.set(false);
      },
      error: (err) => {
        this.errorItems.set(mapearError(err).mensaje);
        this.cargandoItems.set(false);
      },
    });
  }

  protected crear(): void {
    const { titulo, descripcion } = this.formItem.getRawValue();
    if (!titulo.trim() || this.guardando()) return;

    this.guardando.set(true);
    this.api.crear({ titulo: titulo.trim(), descripcion: descripcion.trim() }).subscribe({
      next: (item) => {
        this.items.update((lista) => [item, ...lista]);
        this.formItem.reset();
        this.errorItems.set('');
        this.guardando.set(false);
      },
      error: (err) => {
        this.errorItems.set(mapearError(err).mensaje);
        this.guardando.set(false);
      },
    });
  }

  protected eliminar(item: Item): void {
    this.api.eliminar(item.id).subscribe({
      next: () => this.items.update((lista) => lista.filter((i) => i.id !== item.id)),
      error: (err) => this.errorItems.set(mapearError(err).mensaje),
    });
  }

  protected preguntar(): void {
    const pregunta = this.formIA.getRawValue().pregunta.trim();
    if (!pregunta || this.pensando()) return;

    this.pensando.set(true);
    this.respuesta.set('');
    this.errorIA.set('');
    this.api.preguntarIA(pregunta).subscribe({
      next: ({ respuesta }) => {
        this.respuesta.set(respuesta);
        this.pensando.set(false);
      },
      error: (err) => {
        this.errorIA.set(mapearError(err).mensaje);
        this.pensando.set(false);
      },
    });
  }

  protected salir(): void {
    this.auth.cerrarSesion();
    this.router.navigateByUrl('/login');
  }
}
