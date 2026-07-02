import { HttpClient, HttpParams } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_ENDPOINTS, APP_CONFIG, AppConfig } from '../../../core/config/app-config';
import { ManagedUser, ManagedUserRole } from '../../../domain/users/models/managed-user.model';

export interface UserFilters {
  q?: string;
  isActive?: boolean | null;
  unidadId?: number | null;
  roleCode?: string | null;
}

@Injectable({ providedIn: 'root' })
export class UsersApiService {
  constructor(private readonly http: HttpClient, @Inject(APP_CONFIG) private readonly config: AppConfig) {}

  getUsers(filters: UserFilters = {}): Observable<ManagedUser[]> {
    let params = new HttpParams().set('pageSize', 200);
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') params = params.set(key, String(value));
    });
    return this.http.get<ManagedUser[]>(this.url(API_ENDPOINTS.users), { params });
  }

  getRoles(userId: string): Observable<ManagedUserRole[]> {
    return this.http.get<ManagedUserRole[]>(this.url(`${API_ENDPOINTS.users}/${userId}/roles`));
  }

  assignRole(userId: string, roleCode: string): Observable<void> {
    return this.http.post<void>(this.url(`${API_ENDPOINTS.users}/${userId}/roles/${encodeURIComponent(roleCode)}`), null);
  }

  revokeRole(userId: string, roleCode: string): Observable<void> {
    return this.http.delete<void>(this.url(`${API_ENDPOINTS.users}/${userId}/roles/${encodeURIComponent(roleCode)}`));
  }

  resetPassword(userId: string, newPassword: string): Observable<void> {
    return this.http.put<void>(this.url(`${API_ENDPOINTS.users}/${userId}/password`), { newPassword });
  }

  private url(endpoint: string): string {
    return `${this.config.apiBaseUrl}${endpoint}`;
  }
}
