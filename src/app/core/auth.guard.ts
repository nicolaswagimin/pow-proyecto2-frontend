import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

// Solo deja pasar con sesión válida.
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.estaAutenticado() || inject(Router).createUrlTree(['/login']);
};

// Login y registro son solo para quien no tiene sesión.
export const invitadoGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return !auth.estaAutenticado() || inject(Router).createUrlTree(['/app']);
};
