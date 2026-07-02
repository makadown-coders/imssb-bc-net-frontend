import { Observable, of, throwError } from 'rxjs';
import { AuthSession } from '../../../domain/auth/models/auth-session.model';
import { PingResponse } from '../../../domain/auth/models/ping.model';
import { User } from '../../../domain/auth/models/user.model';
import { AuthRepository } from '../../../domain/auth/repositories/auth.repository';
import { TokenStoragePort } from '../../../infrastructure/auth/storage/token-storage.port';
import { LoginUseCase } from './login.use-case';

const validSession: AuthSession = {
  accessToken: 'access-token',
  refreshToken: 'refresh-token',
  accessTokenExpiresUtc: '2026-06-18T12:00:00Z',
  refreshTokenExpiresUtc: '2026-06-25T00:00:00Z',
};

describe('LoginUseCase', () => {
  it('LoginUseCase_Should_SaveSession_When_CredentialsAreValid', () => {
    const repository = new FakeAuthRepository(of(validSession));
    const storage = new FakeTokenStorage();
    const useCase = new LoginUseCase(repository, storage);

    useCase.execute('admin@imssb-bc.test', 'Password123!').subscribe();

    expect(storage.savedSession).toEqual(validSession);
  });

  it('LoginUseCase_Should_PropagateError_When_CredentialsAreInvalid', () => {
    const expectedError = new Error('invalid credentials');
    const repository = new FakeAuthRepository(throwError(() => expectedError));
    const storage = new FakeTokenStorage();
    const useCase = new LoginUseCase(repository, storage);

    useCase.execute('admin@imssb-bc.test', 'bad-password').subscribe({
      error: (error: unknown) => expect(error).toBe(expectedError),
    });

    expect(storage.savedSession).toBeNull();
  });
});

class FakeAuthRepository implements AuthRepository {
  constructor(private readonly loginResult: Observable<AuthSession>) {}

  login(): Observable<AuthSession> {
    return this.loginResult;
  }

  refreshSession(): Observable<AuthSession> {
    return of(validSession);
  }

  logout(): Observable<void> {
    return of(void 0);
  }

  getCurrentUser(): Observable<User> {
    return of({ id: 'user-id', email: 'admin@imssb-bc.test', createdAt: '2026-06-18T00:00:00Z' });
  }

  changePassword(): Observable<void> {
    return of(void 0);
  }

  ping(): Observable<PingResponse> {
    return of({ message: 'pong', timestamp: '2026-06-18T00:00:00Z' });
  }
}

class FakeTokenStorage implements TokenStoragePort {
  savedSession: AuthSession | null = null;

  getAccessToken(): string | null {
    return null;
  }

  getRefreshToken(): string | null {
    return null;
  }

  getSession(): AuthSession | null {
    return this.savedSession;
  }

  saveSession(session: AuthSession): void {
    this.savedSession = session;
  }

  clear(): void {
    this.savedSession = null;
  }
}
