import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { APP_NOMBRE } from '../../config';
import { AuthService } from '../../core/auth.service';
import { Avatar } from '../../ui/avatar/avatar';
import { Button } from '../../ui/button/button';
import { Icon } from '../../ui/icon/icon';
import { ThemeToggle } from '../../ui/theme-toggle/theme-toggle';

// Barra superior de las páginas con sesión (/app y /historial): marca, tema, perfil y salir.
@Component({
  selector: 'app-barra',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive, Avatar, Button, Icon, ThemeToggle],
  templateUrl: './barra-app.html',
  styleUrl: './barra-app.css',
})
export class BarraApp {
  private readonly router = inject(Router);
  protected readonly auth = inject(AuthService);
  protected readonly nombreApp = APP_NOMBRE;
  protected readonly usuario = this.auth.usuario;

  protected salir(): void {
    this.auth.cerrarSesion();
    this.router.navigateByUrl('/login');
  }
}
