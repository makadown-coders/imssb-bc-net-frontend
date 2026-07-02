import { HttpClient, HttpParams } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_ENDPOINTS, APP_CONFIG, AppConfig } from '../../../core/config/app-config';
import { Persona, Role } from '../../../domain/personas/models/persona.model';

export interface PersonaRequest {
  nombres: string;
  apellidos: string;
  cargo: string | null;
  unidadMedicaId: number | null;
  rfc: string | null;
  curp: string | null;
  correoPrincipal: string | null;
  username: string | null;
  activo: boolean;
}

export interface ProvisionarUsuarioRequest {
  password: string;
  roleCode: string;
}

@Injectable({ providedIn: 'root' })
export class PersonasApiService {
  constructor(
    private readonly http: HttpClient,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  getPersonas(filters: { q?: string; activo?: boolean | null; unidadMedicaId?: number | null } = {}): Observable<Persona[]> {
    return this.http.get<Persona[]>(this.url(API_ENDPOINTS.personas), { params: this.query({ ...filters, pageSize: 200 }) });
  }

  createPersona(body: PersonaRequest): Observable<Persona> {
    return this.http.post<Persona>(this.url(API_ENDPOINTS.personas), body);
  }

  updatePersona(id: number, body: PersonaRequest): Observable<void> {
    return this.http.put<void>(this.url(`${API_ENDPOINTS.personas}/${id}`), body);
  }

  deactivatePersona(id: number): Observable<void> {
    return this.http.delete<void>(this.url(`${API_ENDPOINTS.personas}/${id}`));
  }

  provisionarUsuario(id: number, body: ProvisionarUsuarioRequest): Observable<void> {
    return this.http.post<void>(this.url(`${API_ENDPOINTS.personas}/${id}/usuario`), body);
  }

  resetPassword(userId: string, newPassword: string): Observable<void> {
    return this.http.put<void>(this.url(`/api/user/${userId}/password`), { newPassword });
  }

  getRoles(): Observable<Role[]> {
    return this.http.get<Role[]>(this.url(API_ENDPOINTS.roles));
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
