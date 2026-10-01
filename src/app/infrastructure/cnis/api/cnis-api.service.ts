import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_ENDPOINTS, APP_CONFIG } from '../../../core/config/app-config';
import { ArticuloGrupoTerapeutico, GrupoTerapeutico } from '../../../domain/cnis/models/grupo-terapeutico.model';

@Injectable({ providedIn: 'root' })
export class CnisApiService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(APP_CONFIG);

  getGrupos(): Observable<GrupoTerapeutico[]> {
    return this.http.get<GrupoTerapeutico[]>(this.config.apiBaseUrl + API_ENDPOINTS.cnis.grupos);
  }

  getArticulos(numero: number): Observable<ArticuloGrupoTerapeutico[]> {
    return this.http.get<ArticuloGrupoTerapeutico[]>(this.config.apiBaseUrl + API_ENDPOINTS.cnis.articulosPorGrupo(numero));
  }
}
