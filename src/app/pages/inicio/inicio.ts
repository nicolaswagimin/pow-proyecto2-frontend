import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { Router, RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment';
import { APP_NOMBRE } from '../../config';
import { AuthService } from '../../core/auth.service';
import { Auditoria } from '../../lente/auditoria';
import { Margen } from '../../lente/margen';
import { ApiService, Estado } from '../../services/api.service';
import { Alert } from '../../ui/alert/alert';
import { Avatar } from '../../ui/avatar/avatar';
import { Button } from '../../ui/button/button';
import { Icon } from '../../ui/icon/icon';
import { ThemeToggle } from '../../ui/theme-toggle/theme-toggle';

@Component({
  selector: 'app-inicio',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    Auditoria,
    Margen,
    Alert,
    Avatar,
    Button,
    Icon,
    ThemeToggle,
  ],
  templateUrl: './inicio.html',
  styleUrl: './inicio.css',
})
export class Inicio {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  protected readonly auth = inject(AuthService);

  protected readonly nombreApp = APP_NOMBRE;
  protected readonly apiUrl = environment.apiUrl;
  protected readonly usuario = this.auth.usuario;
  protected readonly primerNombre = computed(
    () => (this.usuario()?.nombre ?? '').trim().split(/\s+/)[0] || 'de nuevo',
  );

  // Estado de conexión
  protected readonly estado = signal<Estado | null>(null);
  protected readonly cargandoEstado = signal(true);
  // El estado se presenta como una lista de verificación: cada punto dice su resultado en texto.
  protected readonly verificacion = computed(() => {
    const estado = this.estado();
    const revisando = this.cargandoEstado();
    const punto = (nombre: string, ok: boolean | undefined, falla: string) => ({
      nombre,
      estado: revisando ? 'revisando' : ok ? 'cumple' : 'falla',
      resultado: revisando ? 'Revisando…' : ok ? 'Responde' : falla,
    });
    return [
      punto('Backend', estado?.ok, 'No responde'),
      punto('Base de datos', estado?.db, estado ? 'No responde' : 'Sin datos'),
      punto('IA', estado?.ia, estado ? 'Sin configurar' : 'Sin datos'),
    ];
  });

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
      },
      error: () => {
        this.estado.set(null);
        this.cargandoEstado.set(false);
      },
    });
  }

  protected salir(): void {
    this.auth.cerrarSesion();
    this.router.navigateByUrl('/login');
  }
}
