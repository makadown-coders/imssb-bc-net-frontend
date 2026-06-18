import { HttpClient } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { APP_CONFIG, API_ENDPOINTS, AppConfig } from '../../../core/config/app-config';
import { AuthSession } from '../../../domain/auth/models/auth-session.model';
import { PingResponse } from '../../../domain/auth/models/ping.model';
import { User } from '../../../domain/auth/models/user.model';
import { AuthRepository } from '../../../domain/auth/repositories/auth.repository';
import {
  AuthSessionResponseDto,
  LoginRequestDto,
  LogoutRequestDto,
  PingResponseDto,
  RefreshTokenRequestDto,
  UserResponseDto,
} from './auth-api.contracts';
import { mapAuthSession, mapPingResponse, mapUser } from '../mappers/auth.mapper';

@Injectable({ providedIn: 'root' })
export class AuthApiService implements AuthRepository {
  constructor(
    private readonly http: HttpClient,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  login(email: string, password: string): Observable<AuthSession> {
    const body: LoginRequestDto = { email, password };
    return this.http
      .post<AuthSessionResponseDto>(this.url(API_ENDPOINTS.auth.login), body)
      .pipe(map(mapAuthSession));
  }

  refreshSession(refreshToken: string): Observable<AuthSession> {
    const body: RefreshTokenRequestDto = { refreshToken };
    return this.http
      .post<AuthSessionResponseDto>(this.url(API_ENDPOINTS.auth.refresh), body)
      .pipe(map(mapAuthSession));
  }

  logout(refreshToken: string): Observable<void> {
    const body: LogoutRequestDto = { refreshToken };
    return this.http.post<void>(this.url(API_ENDPOINTS.auth.logout), body);
  }

  getCurrentUser(): Observable<User> {
    return this.http.get<UserResponseDto>(this.url(API_ENDPOINTS.user.me)).pipe(map(mapUser));
  }

  ping(): Observable<PingResponse> {
    return this.http.get<PingResponseDto>(this.url(API_ENDPOINTS.ping)).pipe(map(mapPingResponse));
  }

  private url(endpoint: string): string {
    return `${this.config.apiBaseUrl}${endpoint}`;
  }
}
