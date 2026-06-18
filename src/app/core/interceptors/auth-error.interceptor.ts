import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { API_ENDPOINTS } from '../config/app-config';
import { RefreshTokenUseCase } from '../../application/auth/use-cases/refresh-token.use-case';
import { TokenStoragePort } from '../../infrastructure/auth/storage/token-storage.port';

export const authErrorInterceptor: HttpInterceptorFn = (request, next) => {
  const tokenStorage = inject(TokenStoragePort);
  const refreshTokenUseCase = inject(RefreshTokenUseCase);
  const router = inject(Router);

  return next(request).pipe(
    catchError((error: unknown) => {
      if (!shouldRefresh(error, request.url)) {
        return throwError(() => error);
      }

      const refreshToken = tokenStorage.getRefreshToken();

      if (!refreshToken) {
        tokenStorage.clear();
        void router.navigate(['/login']);
        return throwError(() => error);
      }

      return refreshTokenUseCase.execute(refreshToken).pipe(
        switchMap((session) =>
          next(
            request.clone({
              setHeaders: {
                Authorization: `Bearer ${session.accessToken}`,
              },
            }),
          ),
        ),
        catchError((refreshError: unknown) => {
          tokenStorage.clear();
          void router.navigate(['/login']);
          return throwError(() => refreshError);
        }),
      );
    }),
  );
};

function shouldRefresh(error: unknown, url: string): boolean {
  return (
    error instanceof HttpErrorResponse &&
    error.status === 401 &&
    !url.includes(API_ENDPOINTS.auth.login) &&
    !url.includes(API_ENDPOINTS.auth.refresh) &&
    !url.includes(API_ENDPOINTS.ping)
  );
}
