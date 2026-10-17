import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Estado {
  ok: boolean;
  db: boolean;
  ia: boolean;
}

// El token de sesión lo agrega el interceptor (core/auth.interceptor.ts).
@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly url = environment.apiUrl;

  estado(): Observable<Estado> {
    return this.http.get<Estado>(`${this.url}/health`);
  }

  preguntarIA(pregunta: string): Observable<{ respuesta: string }> {
    return this.http.post<{ respuesta: string }>(`${this.url}/ia`, { pregunta });
  }
}
