import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Gravedad, Problema } from '../auditor/modelo';

export type Origen = 'pegado' | 'archivo' | 'url';

export interface NuevaAuditoria {
  pagina: string;
  origen: Origen;
  html: string;
  puntaje: number;
  resumen: Record<Gravedad, number>;
  problemas: Problema[];
  htmlCorregido?: string | null;
  puntajeCorregido?: number | null;
}

export interface AuditoriaResumen {
  id: number;
  pagina: string;
  origen: Origen;
  puntaje: number;
  resumen: Record<Gravedad, number>;
  puntaje_corregido: number | null;
  creado_en: string;
}

export interface AuditoriaGuardada extends AuditoriaResumen {
  html: string;
  problemas: Problema[];
  html_corregido: string | null;
}

// Historial de auditorías del usuario.
@Injectable({ providedIn: 'root' })
export class AuditoriasService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/auditorias`;

  listar(): Observable<AuditoriaResumen[]> {
    return this.http.get<AuditoriaResumen[]>(this.url);
  }

  obtener(id: number): Observable<AuditoriaGuardada> {
    return this.http.get<AuditoriaGuardada>(`${this.url}/${id}`);
  }

  guardar(auditoria: NuevaAuditoria): Observable<AuditoriaGuardada> {
    return this.http.post<AuditoriaGuardada>(this.url, auditoria);
  }

  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}
