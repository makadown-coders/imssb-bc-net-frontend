import { Injectable } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { AuthSession } from '../../../domain/auth/models/auth-session.model';
import { AuthRepository } from '../../../domain/auth/repositories/auth.repository';
import { TokenStoragePort } from '../../../infrastructure/auth/storage/token-storage.port';

@Injectable({ providedIn: 'root' })
export class RefreshTokenUseCase {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly tokenStorage: TokenStoragePort,
  ) {}

  execute(refreshToken: string): Observable<AuthSession> {
    return this.authRepository
      .refreshSession(refreshToken)
      .pipe(tap((session) => this.tokenStorage.saveSession(session)));
  }
}
