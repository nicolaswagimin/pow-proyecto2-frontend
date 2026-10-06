import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ApiService, Estado, Item } from './services/api.service';
import { environment } from '../environments/environment';

@Component({
  selector: 'app-root',
  imports: [DatePipe],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit {
  private readonly api = inject(ApiService);

  // Cambia este nombre al adaptar el tema del proyecto.
  protected readonly nombre = 'Proyecto 2';
  protected readonly apiUrl = environment.apiUrl;

  // Estado de conexión
  protected readonly estado = signal<Estado | null>(null);
  protected readonly cargandoEstado = signal(true);

  // Registros
  protected readonly items = signal<Item[]>([]);
  protected readonly titulo = signal('');
  protected readonly descripcion = signal('');
  protected readonly guardando = signal(false);
  protected readonly errorItems = signal('');

  // IA
  protected readonly pregunta = signal('');
  protected readonly respuesta = signal('');
  protected readonly pensando = signal(false);
  protected readonly errorIA = signal('');

  ngOnInit(): void {
    this.revisarEstado();
  }

  revisarEstado(): void {
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

  cargarItems(): void {
    this.api.listar().subscribe({
      next: (items) => {
        this.items.set(items);
        this.errorItems.set('');
      },
      error: (err) => this.errorItems.set(this.mensajeError(err)),
    });
  }

  crear(evento: Event): void {
    evento.preventDefault();
    const titulo = this.titulo().trim();
    if (!titulo || this.guardando()) return;

    this.guardando.set(true);
    this.api.crear({ titulo, descripcion: this.descripcion().trim() }).subscribe({
      next: (item) => {
        this.items.update((lista) => [item, ...lista]);
        this.titulo.set('');
        this.descripcion.set('');
        this.errorItems.set('');
        this.guardando.set(false);
      },
      error: (err) => {
        this.errorItems.set(this.mensajeError(err));
        this.guardando.set(false);
      },
    });
  }

  eliminar(item: Item): void {
    this.api.eliminar(item.id).subscribe({
      next: () => this.items.update((lista) => lista.filter((i) => i.id !== item.id)),
      error: (err) => this.errorItems.set(this.mensajeError(err)),
    });
  }

  preguntar(evento: Event): void {
    evento.preventDefault();
    const pregunta = this.pregunta().trim();
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
        this.errorIA.set(this.mensajeError(err));
        this.pensando.set(false);
      },
    });
  }

  protected valor(evento: Event): string {
    return (evento.target as HTMLInputElement | HTMLTextAreaElement).value;
  }

  private mensajeError(err: HttpErrorResponse): string {
    if (err.status === 0) return 'No hay conexión con el backend.';
    return err.error?.error ?? 'Ocurrió un error inesperado.';
  }
}
