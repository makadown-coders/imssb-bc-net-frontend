import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, provideRouter, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { AuthSession } from '../../domain/auth/models/auth-session.model';
import { TokenStoragePort } from '../../infrastructure/auth/storage/token-storage.port';
import { authGuard } from './auth.guard';

describe('authGuard', () => {
  it('AuthGuard_Should_RedirectToLogin_When_NoAccessToken', () => {
    const tokenStorage = new FakeTokenStorage(null);

    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: TokenStoragePort, useValue: tokenStorage }],
    });

    const result = TestBed.runInInjectionContext(() =>
      authGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
    );
    const router = TestBed.inject(Router);

    expect(router.serializeUrl(result as UrlTree)).toBe('/login');
  });
});

class FakeTokenStorage implements TokenStoragePort {
  constructor(private readonly accessToken: string | null) {}

  getAccessToken(): string | null {
    return this.accessToken;
  }

  getRefreshToken(): string | null {
    return null;
  }

  getSession(): AuthSession | null {
    return null;
  }

  saveSession(): void {}

  clear(): void {}
}
