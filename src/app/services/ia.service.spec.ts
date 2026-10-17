import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { IaService } from './ia.service';

describe('IaService', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }),
  );

  it('corregirFragmentos manda la página y los fragmentos a /ia/fragmentos', async () => {
    const ia = TestBed.inject(IaService);
    const http = TestBed.inject(HttpTestingController);
    const pagina = { idioma: 'es', titulo: 'Tienda' };
    const fragmentos = [
      { id: 'f1', regla: 'image-alt', ayuda: 'a', html: '<img>', padre: '<a>', resumen: '' },
    ];
    const respuesta = firstValueFrom(ia.corregirFragmentos(pagina, fragmentos));
    const pedido = http.expectOne(`${environment.apiUrl}/ia/fragmentos`);
    expect(pedido.request.method).toBe('POST');
    expect(pedido.request.body).toEqual({ pagina, fragmentos });
    pedido.flush({
      fragmentos: [{ id: 'f1', explicacion: 'e', corregido: '<img alt="x">', desdeCache: false }],
      sinRespuesta: [],
    });
    expect((await respuesta).fragmentos[0].corregido).toBe('<img alt="x">');
    http.verify();
  });
});
