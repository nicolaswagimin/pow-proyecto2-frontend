import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { APP_NOMBRE } from '../../config';
import { Margen } from '../../lente/margen';
import { ThemeToggle } from '../../ui/theme-toggle/theme-toggle';

// Plantilla de acceso: una hoja de informe con el formulario y, a la derecha de la línea del
// margen, las anotaciones de accesibilidad del elemento enfocado. En móvil el margen va arriba.
@Component({
  selector: 'app-auth-layout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Margen, ThemeToggle],
  templateUrl: './auth-layout.html',
  styleUrl: './auth-layout.css',
})
export class AuthLayout {
  protected readonly nombreApp = APP_NOMBRE;
}
