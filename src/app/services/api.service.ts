import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Estado {
  ok: boolean;
  db: boolean;
  ia: boolean;
}

export interface Item {
  id: number;
  titulo: string;
  descripcion: string;
  creado_en: string;
}

export interface NuevoItem {
  titulo: string;
  descripcion?: string;
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly url = environment.apiUrl;

  estado(): Observable<Estado> {
    return this.http.get<Estado>(`${this.url}/health`);
  }

  listar(): Observable<Item[]> {
    return this.http.get<Item[]>(`${this.url}/items`);
  }

  crear(item: NuevoItem): Observable<Item> {
    return this.http.post<Item>(`${this.url}/items`, item);
  }

  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/items/${id}`);
  }

  preguntarIA(pregunta: string): Observable<{ respuesta: string }> {
    return this.http.post<{ respuesta: string }>(`${this.url}/ia`, { pregunta });
  }
}
