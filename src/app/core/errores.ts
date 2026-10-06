import { HttpErrorResponse } from '@angular/common/http';

export type CampoAuth = 'nombre' | 'email' | 'password';
export type ContextoError = 'login' | 'registro' | 'general';

export interface ErrorInterfaz {
  mensaje: string;
  // Campo al que pertenece el error (se muestra junto a él en lugar de arriba).
  campo?: CampoAuth;
  // Acción sugerida que la interfaz ofrece como enlace.
  accion?: 'ir-a-login';
}

// Único lugar donde las respuestas del backend se traducen a mensajes de interfaz.
export function mapearError(err: unknown, contexto: ContextoError = 'general'): ErrorInterfaz {
  if (!(err instanceof HttpErrorResponse)) {
    return { mensaje: 'Algo falló de nuestro lado. Inténtalo de nuevo en unos segundos.' };
  }

  const delServidor: string | undefined = err.error?.error;
  const campo: CampoAuth | undefined = esCampo(err.error?.campo) ? err.error.campo : undefined;

  switch (err.status) {
    case 0:
      return {
        mensaje: 'No pudimos conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.',
      };
    case 400:
      return { mensaje: delServidor ?? 'Revisa los datos del formulario.', campo };
    case 401:
      return contexto === 'login'
        ? { mensaje: 'El correo o la contraseña no coinciden.' }
        : { mensaje: 'Tu sesión expiró. Inicia sesión de nuevo.' };
    case 409:
      return { mensaje: 'Ese correo ya tiene una cuenta.', campo: 'email', accion: 'ir-a-login' };
    case 429:
      return {
        mensaje: delServidor ?? 'Demasiados intentos. Espera unos minutos y vuelve a intentarlo.',
      };
    case 502:
      return { mensaje: delServidor ?? 'El servicio externo no respondió. Inténtalo de nuevo.' };
    default:
      if (err.status >= 500) {
        return { mensaje: 'Algo falló de nuestro lado. Inténtalo de nuevo en unos segundos.' };
      }
      return { mensaje: delServidor ?? 'No se pudo completar la acción.' };
  }
}

function esCampo(valor: unknown): valor is CampoAuth {
  return valor === 'nombre' || valor === 'email' || valor === 'password';
}
