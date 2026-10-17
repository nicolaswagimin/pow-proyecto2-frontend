import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface PaginaDescargada {
  html: string;
  urlFinal: string;
}

// Descarga de páginas por URL. El backend la hace con protección contra SSRF; la auditoría
// ocurre después en el navegador.
@Injectable({ providedIn: 'root' })
export class PaginasService {
  private readonly http = inject(HttpClient);

  descargar(url: string): Observable<PaginaDescargada> {
    return this.http.post<PaginaDescargada>(`${environment.apiUrl}/paginas/descargar`, { url });
  }
}
