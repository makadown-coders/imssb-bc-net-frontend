import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { API_ENDPOINTS } from '../config/app-config';
import { TokenStoragePort } from '../../infrastructure/auth/storage/token-storage.port';

const EXCLUDED_ENDPOINTS = [API_ENDPOINTS.auth.login, API_ENDPOINTS.auth.refresh, API_ENDPOINTS.ping];

export const authTokenInterceptor: HttpInterceptorFn = (request, next) => {
  if (EXCLUDED_ENDPOINTS.some((endpoint) => request.url.includes(endpoint))) {
    return next(request);
  }

  const accessToken = inject(TokenStoragePort).getAccessToken();

  if (!accessToken) {
    return next(request);
  }

  return next(
    request.clone({
      setHeaders: {
        Authorization: `Bearer ${accessToken}`,
      },
    }),
  );
};
