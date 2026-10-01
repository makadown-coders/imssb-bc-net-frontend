import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, RouterStateSnapshot, provideRouter } from '@angular/router';
import { TokenStoragePort } from '../../infrastructure/auth/storage/token-storage.port';
import { authGuard, cnisGuard } from './auth.guard';
import { canReadCnis } from '../auth/cnis-access';
import { routes } from '../../app.routes';

describe('Acceso CNIS', () => {
  it.each([
    ['ADMIN_TIC', true], ['IB_ONCO', true], ['UNIDAD_MEDICA', true], ['ENFERMERIA', true],
    ['COORDINACION', false], ['ABASTO', false], ['SOLICITUDES_ABASTO', false], ['OTRO', false],
  ])('evalúa el rol %s para menú y guard', (role, expected) => {
    const token = 'test.' + btoa(JSON.stringify({ role })) + '.test';
    TestBed.configureTestingModule({ providers: [
      provideRouter([]), { provide: TokenStoragePort, useValue: { getAccessToken: () => token } },
    ] });
    expect(canReadCnis(token)).toBe(expected);
    const result = TestBed.runInInjectionContext(() => cnisGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot));
    expect(result === true).toBe(expected);
  });

  it('rechaza tokens ausentes o inválidos y acepta uno de varios roles autorizados', () => {
    expect(canReadCnis(null)).toBe(false);
    expect(canReadCnis('invalido')).toBe(false);
    expect(canReadCnis('test.' + btoa(JSON.stringify({ roles: ['COORDINACION', 'ENFERMERIA'] })) + '.test')).toBe(true);
  });

  it('protege la ruta con autenticación y la política de CNIS', () => {
    const route = routes.find((r) => r.path === 'cnis/grupos-terapeuticos');
    expect(route?.canActivate).toEqual([authGuard, cnisGuard]);
    expect(route?.loadComponent).toBeDefined();
  });
});
