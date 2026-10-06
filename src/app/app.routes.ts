import { inject } from '@angular/core';
import { Routes, UrlMatchResult, UrlSegment } from '@angular/router';
import { authGuard, invitadoGuard } from './core/auth.guard';
import { AuthService } from './core/auth.service';

// /login y /registro comparten una sola ruta (y un solo componente) para que el cambio
// entre ambos sea una animación y no una recarga de la página.
export function rutaAcceso(segmentos: UrlSegment[]): UrlMatchResult | null {
  const [primero] = segmentos;
  if (segmentos.length === 1 && (primero.path === 'login' || primero.path === 'registro')) {
    return { consumed: segmentos, posParams: { modo: primero } };
  }
  return null;
}

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: () => (inject(AuthService).estaAutenticado() ? '/app' : '/login'),
  },
  {
    matcher: rutaAcceso,
    canActivate: [invitadoGuard],
    loadComponent: () => import('./pages/acceso/acceso').then((m) => m.Acceso),
  },
  {
    path: 'app',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/inicio/inicio').then((m) => m.Inicio),
  },
  {
    path: 'design',
    loadComponent: () => import('./pages/guia/guia').then((m) => m.Guia),
  },
  { path: '**', redirectTo: '' },
];
