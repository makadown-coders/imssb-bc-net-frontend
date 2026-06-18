import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { TokenStoragePort } from '../../infrastructure/auth/storage/token-storage.port';

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
