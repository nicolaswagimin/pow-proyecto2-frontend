import { HttpErrorResponse } from '@angular/common/http';
import { mapearError } from './errores';

const error = (status: number, mensaje?: string) =>
  new HttpErrorResponse({ status, error: mensaje ? { error: mensaje } : null });

describe('mapearError (auditorías e IA)', () => {
  it('413: el HTML es demasiado grande', () => {
    expect(mapearError(error(413)).mensaje).toBe('El HTML es demasiado grande para enviarlo (máximo 2 MB).');
  });
  it('429 de la IA muestra el mensaje del servidor', () => {
    expect(mapearError(error(429, 'La IA está saturada en este momento.')).mensaje).toBe('La IA está saturada en este momento.');
  });
  it('503 con mensaje del servidor lo muestra', () => {
    expect(mapearError(error(503, 'La IA no está configurada en el servidor.')).mensaje).toBe(
      'La IA no está configurada en el servidor.',
    );
  });
  it('sin conexión', () => expect(mapearError(error(0)).mensaje).toMatch(/No pudimos conectar/));
});
