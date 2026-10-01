import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, provideRouter, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { AuthSession } from '../../domain/auth/models/auth-session.model';
import { TokenStoragePort } from '../../infrastructure/auth/storage/token-storage.port';
import { authGuard, solicitudesGuard } from './auth.guard';
import { routes } from '../../app.routes';

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

describe('solicitudesGuard', () => {
  it.each(['IB_ONCO', 'SOLICITUDES_ABASTO', 'ADMIN_TIC', 'COORDINACION', 'ABASTO', 'UNIDAD_MEDICA', 'ENFERMERIA'])(
    'permite el rol %s',
    (role) => {
      const tokenStorage = new FakeTokenStorage(createToken({ role }));
      TestBed.configureTestingModule({
        providers: [provideRouter([]), { provide: TokenStoragePort, useValue: tokenStorage }],
      });

      const result = TestBed.runInInjectionContext(() =>
        solicitudesGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
      );

      expect(result).toBe(true);
    },
  );

  it('redirige los roles no autorizados', () => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: TokenStoragePort, useValue: new FakeTokenStorage(createToken({ role: 'OTRO' })) }],
    });

    const result = TestBed.runInInjectionContext(() =>
      solicitudesGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
    );

    expect(TestBed.inject(Router).serializeUrl(result as UrlTree)).toBe('/dashboard');
  });
});

describe('rutas de solicitudes', () => {
  it('mantiene los flujos de primer y segundo nivel con el mismo guard', () => {
    const segundoNivel = routes.find((route) => route.path === 'solicitudes');
    const primerNivel = routes.find((route) => route.path === 'solicitud-unidad');
    const aliasPrimerNivel = routes.find((route) => route.path === 'solicitudes/primer-nivel');

    expect(segundoNivel?.canActivate).toEqual([authGuard, solicitudesGuard]);
    expect(primerNivel?.canActivate).toEqual([authGuard, solicitudesGuard]);
    expect(segundoNivel?.loadComponent).toBeDefined();
    expect(primerNivel?.loadComponent).toBeDefined();
    expect(aliasPrimerNivel).toMatchObject({ redirectTo: 'solicitud-unidad', pathMatch: 'full' });
  });
});

function createToken(payload: Record<string, unknown>): string {
  return `test.${btoa(JSON.stringify(payload))}.test`;
}

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
