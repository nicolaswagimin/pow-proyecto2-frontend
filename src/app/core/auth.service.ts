import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Usuario {
  id: number;
  nombre: string;
  email: string;
  avatar_url: string | null;
  proveedor: string;
  creado_en: string;
}

interface RespuestaAuth {
  token: string;
  usuario: Usuario;
}

const CLAVE_TOKEN = 'sesion.token';
const CLAVE_USUARIO = 'sesion.usuario';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/auth`;

  readonly token = signal<string | null>(leer(CLAVE_TOKEN));
  readonly usuario = signal<Usuario | null>(leerUsuario());

  readonly iniciales = computed(() => {
    const partes = (this.usuario()?.nombre ?? '').trim().split(/\s+/).filter(Boolean);
    const letras =
      partes.length > 1
        ? partes[0][0] + partes[partes.length - 1][0]
        : (partes[0] ?? '?').slice(0, 2);
    return letras.toUpperCase();
  });

  // Se consulta en cada navegación (no es computed) porque el token puede expirar con el tiempo.
  estaAutenticado(): boolean {
    const token = this.token();
    if (!token) return false;
    if (tokenExpirado(token)) {
      this.cerrarSesion();
      return false;
    }
    return true;
  }

  login(email: string, password: string): Observable<RespuestaAuth> {
    return this.http
      .post<RespuestaAuth>(`${this.url}/login`, { email, password })
      .pipe(tap((respuesta) => this.guardarSesion(respuesta)));
  }

  registrar(nombre: string, email: string, password: string): Observable<RespuestaAuth> {
    return this.http
      .post<RespuestaAuth>(`${this.url}/registro`, { nombre, email, password })
      .pipe(tap((respuesta) => this.guardarSesion(respuesta)));
  }

  // Trae los datos frescos del usuario; si el token ya no vale, el interceptor cierra la sesión.
  refrescarUsuario(): void {
    this.http.get<{ usuario: Usuario }>(`${this.url}/yo`).subscribe({
      next: ({ usuario }) => {
        this.usuario.set(usuario);
        escribir(CLAVE_USUARIO, JSON.stringify(usuario));
      },
      error: () => {
        // 401 lo maneja el interceptor; sin conexión se conserva la sesión guardada.
      },
    });
  }

  cerrarSesion(): void {
    this.token.set(null);
    this.usuario.set(null);
    borrar(CLAVE_TOKEN);
    borrar(CLAVE_USUARIO);
  }

  private guardarSesion({ token, usuario }: RespuestaAuth): void {
    this.token.set(token);
    this.usuario.set(usuario);
    escribir(CLAVE_TOKEN, token);
    escribir(CLAVE_USUARIO, JSON.stringify(usuario));
  }
}

function tokenExpirado(token: string): boolean {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const { exp } = JSON.parse(atob(base64)) as { exp?: number };
    return typeof exp === 'number' && exp * 1000 <= Date.now();
  } catch {
    return true;
  }
}

// localStorage puede fallar (modo privado, almacenamiento bloqueado): la sesión sigue en memoria.
function leer(clave: string): string | null {
  try {
    return localStorage.getItem(clave);
  } catch {
    return null;
  }
}

function leerUsuario(): Usuario | null {
  try {
    return JSON.parse(leer(CLAVE_USUARIO) ?? 'null') as Usuario | null;
  } catch {
    return null;
  }
}

function escribir(clave: string, valor: string): void {
  try {
    localStorage.setItem(clave, valor);
  } catch {
    // Sin almacenamiento la sesión dura solo esta pestaña.
  }
}

function borrar(clave: string): void {
  try {
    localStorage.removeItem(clave);
  } catch {
    // Nada que borrar.
  }
}
