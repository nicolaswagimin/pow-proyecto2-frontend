import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { APP_NOMBRE } from '../../config';
import { mapearError } from '../../core/errores';
import { BarraApp } from '../../layouts/barra-app/barra-app';
import { AuditoriaResumen, AuditoriasService } from '../../services/auditorias.service';
import { Alert } from '../../ui/alert/alert';
import { Button } from '../../ui/button/button';
import { agruparPorPagina, puntosEvolucion } from './agrupar';

const ANCHO = 160;
const ALTO = 40;

// /historial: auditorías guardadas, agrupadas por página, con la evolución del puntaje.
@Component({
  selector: 'app-historial',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, RouterLink, Alert, BarraApp, Button],
  templateUrl: './historial.html',
  styleUrl: './historial.css',
})
export class Historial {
  private readonly servicio = inject(AuditoriasService);
  private readonly router = inject(Router);

  protected readonly ANCHO = ANCHO;
  protected readonly ALTO = ALTO;
  protected readonly auditorias = signal<AuditoriaResumen[]>([]);
  protected readonly grupos = computed(() => agruparPorPagina(this.auditorias()));
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly confirmando = signal<number | null>(null);

  constructor() {
    inject(Title).setTitle(`Historial · ${APP_NOMBRE}`);
    void this.cargar();
  }

  protected async cargar(): Promise<void> {
    this.cargando.set(true);
    this.error.set(null);
    try {
      this.auditorias.set(await firstValueFrom(this.servicio.listar()));
    } catch (err) {
      this.error.set(mapearError(err).mensaje);
    } finally {
      this.cargando.set(false);
    }
  }

  protected puntos(puntajes: number[]): string {
    return puntosEvolucion(puntajes, ANCHO, ALTO);
  }

  protected evolucion(puntajes: number[]): string {
    return puntajes.join(' → ');
  }

  protected abrir(id: number): void {
    void this.router.navigate(['/app'], { queryParams: { auditoria: id } });
  }

  protected async eliminar(id: number): Promise<void> {
    try {
      await firstValueFrom(this.servicio.eliminar(id));
      this.auditorias.update((lista) => lista.filter((a) => a.id !== id));
      this.confirmando.set(null);
    } catch (err) {
      this.error.set(mapearError(err).mensaje);
    }
  }
}
