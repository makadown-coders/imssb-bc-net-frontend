import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AuthSession } from '../../domain/auth/models/auth-session.model';
import { TokenStoragePort } from '../../infrastructure/auth/storage/token-storage.port';
import { authTokenInterceptor } from './auth-token.interceptor';

describe('authTokenInterceptor', () => {
  it('AuthTokenInterceptor_Should_AddBearerToken_When_AccessTokenExists', () => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authTokenInterceptor])),
        provideHttpClientTesting(),
        { provide: TokenStoragePort, useValue: new FakeTokenStorage('jwt-token') },
      ],
    });

    const http = TestBed.inject(HttpClient);
    const httpTesting = TestBed.inject(HttpTestingController);

    http.get('/api/user/me').subscribe();

    const request = httpTesting.expectOne('/api/user/me');
    expect(request.request.headers.get('Authorization')).toBe('Bearer jwt-token');
    request.flush({});
    httpTesting.verify();
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
