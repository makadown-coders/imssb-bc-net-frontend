import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { APP_CONFIG, AppConfig } from '../../core/config/app-config';
import {
  CatalogoSiciliaPage,
  CatalogoSiciliaQuery,
  OncoClase,
  OncoClasePayload,
  OncoSubclase,
  OncoSubclasePayload,
} from '../../models/ib-onco/catalogo-sicilia.model';

@Injectable({ providedIn: 'root' })
export class CatalogoSiciliaApiService {
  private readonly http = inject(HttpClient);
  private readonly config = inject<AppConfig>(APP_CONFIG);
  private readonly basePath = '/api/ib-onco/catalogo-sicilia';

  listClases(query: CatalogoSiciliaQuery): Observable<CatalogoSiciliaPage<OncoClase>> {
    return this.http.get<CatalogoSiciliaPage<OncoClase>>(this.url('/clases'), {
      params: this.params(query),
    });
  }

  createClase(payload: OncoClasePayload): Observable<OncoClase> {
    return this.http.post<OncoClase>(this.url('/clases'), payload);
  }

  updateClase(id: number, payload: OncoClasePayload): Observable<OncoClase> {
    return this.http.put<OncoClase>(this.url(`/clases/${id}`), payload);
  }

  deactivateClase(id: number): Observable<void> {
    return this.http.delete<void>(this.url(`/clases/${id}`));
  }

  listSubclases(query: CatalogoSiciliaQuery): Observable<CatalogoSiciliaPage<OncoSubclase>> {
    return this.http.get<CatalogoSiciliaPage<OncoSubclase>>(this.url('/subclases'), {
      params: this.params(query),
    });
  }

  createSubclase(payload: OncoSubclasePayload): Observable<OncoSubclase> {
    return this.http.post<OncoSubclase>(this.url('/subclases'), payload);
  }

  updateSubclase(id: number, payload: OncoSubclasePayload): Observable<OncoSubclase> {
    return this.http.put<OncoSubclase>(this.url(`/subclases/${id}`), payload);
  }

  deactivateSubclase(id: number): Observable<void> {
    return this.http.delete<void>(this.url(`/subclases/${id}`));
  }

  private params(query: CatalogoSiciliaQuery): HttpParams {
    let params = new HttpParams()
      .set('page', query.page)
      .set('pageSize', query.pageSize);

    if (query.q?.trim()) {
      params = params.set('q', query.q.trim());
    }
    if (query.activo !== undefined) {
      params = params.set('activo', query.activo);
    }

    return params;
  }

  private url(path: string): string {
    return `${this.config.apiBaseUrl}${this.basePath}${path}`;
  }
}
