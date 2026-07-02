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
  return hasTokenRole(tokenStorage.getAccessToken(), 'ADMIN_TIC')
    ? true
    : router.createUrlTree(['/dashboard']);
};
