import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { TokenStoragePort } from '../../infrastructure/auth/storage/token-storage.port';
import { hasTokenRole } from '../auth/jwt-claims';

export const authGuard: CanActivateFn = (): boolean | UrlTree => {
  const tokenStorage = inject(TokenStoragePort);
  const router = inject(Router);

  return tokenStorage.getAccessToken() ? true : router.createUrlTree(['/login']);
};

export const guestGuard: CanActivateFn = (): boolean | UrlTree => {
  const tokenStorage = inject(TokenStoragePort);
  const router = inject(Router);

  return tokenStorage.getAccessToken() ? router.createUrlTree(['/dashboard']) : true;
};

export const adminTicGuard: CanActivateFn = (): boolean | UrlTree => {
  const tokenStorage = inject(TokenStoragePort);
  const router = inject(Router);
  // Ocultar una liga no protege una ruta; este guard evita también la navegación manual por URL.
  return hasTokenRole(tokenStorage.getAccessToken(), 'ADMIN_TIC')
    ? true
    : router.createUrlTree(['/dashboard']);
};

const solicitudesRoles = ['SOLICITUDES_ABASTO', 'ADMIN_TIC', 'COORDINACION', 'ABASTO'] as const;

export const solicitudesGuard: CanActivateFn = (): boolean | UrlTree => {
  const tokenStorage = inject(TokenStoragePort);
  const router = inject(Router);
  const token = tokenStorage.getAccessToken();
  return solicitudesRoles.some((role) => hasTokenRole(token, role))
    ? true
    : router.createUrlTree(['/dashboard']);
};

const proyectosSaludRoles = ['IB_ONCO', 'UNIDAD_MEDICA', 'ADMIN_TIC', 'COORDINACION', 'ENFERMERIA'] as const;

export const proyectosSaludGuard: CanActivateFn = (): boolean | UrlTree => {
  const tokenStorage = inject(TokenStoragePort);
  const router = inject(Router);
  const token = tokenStorage.getAccessToken();
  return proyectosSaludRoles.some((role) => hasTokenRole(token, role))
    ? true
    : router.createUrlTree(['/dashboard']);
}

const ibOncoRoles = ['IB_ONCO', 'ADMIN_TIC'] as const;

export const ibOncoGuard: CanActivateFn = (): boolean | UrlTree => {
  const tokenStorage = inject(TokenStoragePort);
  const router = inject(Router);
  const token = tokenStorage.getAccessToken();
  return ibOncoRoles.some((role) => hasTokenRole(token, role))
    ? true
    : router.createUrlTree(['/dashboard']);
}
