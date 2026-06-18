import { Injectable } from '@angular/core';
import { catchError, Observable, of, tap } from 'rxjs';
import { AuthRepository } from '../../../domain/auth/repositories/auth.repository';
import { TokenStoragePort } from '../../../infrastructure/auth/storage/token-storage.port';

@Injectable({ providedIn: 'root' })
export class LogoutUseCase {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly tokenStorage: TokenStoragePort,
  ) {}

  execute(): Observable<void> {
    const refreshToken = this.tokenStorage.getRefreshToken();

    if (!refreshToken) {
      this.tokenStorage.clear();
      return of(void 0);
    }

    return this.authRepository.logout(refreshToken).pipe(
      catchError(() => of(void 0)),
      tap(() => this.tokenStorage.clear()),
    );
  }
}
