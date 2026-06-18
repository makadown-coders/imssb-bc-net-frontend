import { HttpClient, HttpParams } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_ENDPOINTS, APP_CONFIG, AppConfig } from '../../../core/config/app-config';
import {
  Localidad,
  Municipio,
  TipoUnidad,
  Tipologia,
  TipologiaUnidad,
  UnidadMedica,
} from '../../../domain/catalogos/models/catalogo.model';

export interface TipoUnidadRequest {
  nombreTipo: string;
}

export interface MunicipioRequest {
  nombreMunicipio: string;
}

export interface LocalidadRequest {
  nombreLocalidad: string;
  municipioId: number | null;
}

export interface UnidadMedicaRequest {
  cluessa: string | null;
  cluesimb: string | null;
  nombre: string;
  direccion: string | null;
  latitud: number | null;
  longitud: number | null;
  estratoUnidad: string | null;
  nivelAtencion: string | null;
  tipoUnidadId: number | null;
  localidadId: number | null;
  activo: boolean;
}

export interface TipologiaRequest {
  nombre: string;
  esSegundoNivel: boolean | null;
}

export interface TipologiaUnidadRequest {
  unidadMedicaId: number;
  tipologiaId: number;
  fuente: string | null;
}

@Injectable({ providedIn: 'root' })
export class CatalogosApiService {
  constructor(
    private readonly http: HttpClient,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  getTiposUnidad(q?: string): Observable<TipoUnidad[]> {
    return this.http.get<TipoUnidad[]>(this.url(API_ENDPOINTS.catalogos.tipoUnidad), { params: this.query({ q }) });
  }

  createTipoUnidad(body: TipoUnidadRequest): Observable<TipoUnidad> {
    return this.http.post<TipoUnidad>(this.url(API_ENDPOINTS.catalogos.tipoUnidad), body);
  }

  updateTipoUnidad(id: number, body: TipoUnidadRequest): Observable<void> {
    return this.http.put<void>(this.url(`${API_ENDPOINTS.catalogos.tipoUnidad}/${id}`), body);
  }

  deleteTipoUnidad(id: number): Observable<void> {
    return this.http.delete<void>(this.url(`${API_ENDPOINTS.catalogos.tipoUnidad}/${id}`));
  }

  getMunicipios(q?: string): Observable<Municipio[]> {
    return this.http.get<Municipio[]>(this.url(API_ENDPOINTS.catalogos.municipios), { params: this.query({ q }) });
  }

  createMunicipio(body: MunicipioRequest): Observable<Municipio> {
    return this.http.post<Municipio>(this.url(API_ENDPOINTS.catalogos.municipios), body);
  }

  updateMunicipio(id: number, body: MunicipioRequest): Observable<void> {
    return this.http.put<void>(this.url(`${API_ENDPOINTS.catalogos.municipios}/${id}`), body);
  }

  deleteMunicipio(id: number): Observable<void> {
    return this.http.delete<void>(this.url(`${API_ENDPOINTS.catalogos.municipios}/${id}`));
  }

  getLocalidades(filters: { municipioId?: number | null; q?: string } = {}): Observable<Localidad[]> {
    return this.http.get<Localidad[]>(this.url(API_ENDPOINTS.catalogos.localidades), {
      params: this.query(filters),
    });
  }

  createLocalidad(body: LocalidadRequest): Observable<Localidad> {
    return this.http.post<Localidad>(this.url(API_ENDPOINTS.catalogos.localidades), body);
  }

  updateLocalidad(id: number, body: LocalidadRequest): Observable<void> {
    return this.http.put<void>(this.url(`${API_ENDPOINTS.catalogos.localidades}/${id}`), body);
  }

  deleteLocalidad(id: number): Observable<void> {
    return this.http.delete<void>(this.url(`${API_ENDPOINTS.catalogos.localidades}/${id}`));
  }

  getUnidadesMedicas(
    filters: { tipoUnidadId?: number | null; localidadId?: number | null; activo?: boolean | null; q?: string } = {},
  ): Observable<UnidadMedica[]> {
    return this.http.get<UnidadMedica[]>(this.url(API_ENDPOINTS.catalogos.unidadesMedicas), {
      params: this.query({ ...filters, pageSize: 200 }),
    });
  }

  createUnidadMedica(body: UnidadMedicaRequest): Observable<UnidadMedica> {
    return this.http.post<UnidadMedica>(this.url(API_ENDPOINTS.catalogos.unidadesMedicas), body);
  }

  updateUnidadMedica(id: number, body: UnidadMedicaRequest): Observable<void> {
    return this.http.put<void>(this.url(`${API_ENDPOINTS.catalogos.unidadesMedicas}/${id}`), body);
  }

  deleteUnidadMedica(id: number): Observable<void> {
    return this.http.delete<void>(this.url(`${API_ENDPOINTS.catalogos.unidadesMedicas}/${id}`));
  }

  getTipologias(q?: string): Observable<Tipologia[]> {
    return this.http.get<Tipologia[]>(this.url(API_ENDPOINTS.catalogos.tipologias), { params: this.query({ q }) });
  }

  createTipologia(body: TipologiaRequest): Observable<Tipologia> {
    return this.http.post<Tipologia>(this.url(API_ENDPOINTS.catalogos.tipologias), body);
  }

  updateTipologia(id: number, body: TipologiaRequest): Observable<void> {
    return this.http.put<void>(this.url(`${API_ENDPOINTS.catalogos.tipologias}/${id}`), body);
  }

  deleteTipologia(id: number): Observable<void> {
    return this.http.delete<void>(this.url(`${API_ENDPOINTS.catalogos.tipologias}/${id}`));
  }

  getTipologiasUnidad(filters: { unidadMedicaId?: number | null; tipologiaId?: number | null } = {}): Observable<TipologiaUnidad[]> {
    return this.http.get<TipologiaUnidad[]>(this.url(API_ENDPOINTS.catalogos.tipologiasUnidad), {
      params: this.query(filters),
    });
  }

  createTipologiaUnidad(body: TipologiaUnidadRequest): Observable<TipologiaUnidad> {
    return this.http.post<TipologiaUnidad>(this.url(API_ENDPOINTS.catalogos.tipologiasUnidad), body);
  }

  updateTipologiaUnidad(id: number, body: TipologiaUnidadRequest): Observable<void> {
    return this.http.put<void>(this.url(`${API_ENDPOINTS.catalogos.tipologiasUnidad}/${id}`), body);
  }

  deleteTipologiaUnidad(id: number): Observable<void> {
    return this.http.delete<void>(this.url(`${API_ENDPOINTS.catalogos.tipologiasUnidad}/${id}`));
  }

  private url(endpoint: string): string {
    return `${this.config.apiBaseUrl}${endpoint}`;
  }

  private query(values: Record<string, string | number | boolean | null | undefined>): HttpParams {
    let params = new HttpParams();
    Object.entries(values).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        params = params.set(key, String(value));
      }
    });
    return params;
  }
}
