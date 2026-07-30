import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { AuthRepository } from './domain/auth/repositories/auth.repository';
import { AuthApiService } from './infrastructure/auth/api/auth-api.service';
import { LocalStorageTokenStorageService } from './infrastructure/auth/storage/token-storage.service';
import { TokenStoragePort } from './infrastructure/auth/storage/token-storage.port';
import { authErrorInterceptor } from './core/interceptors/auth-error.interceptor';
import { authTokenInterceptor } from './core/interceptors/auth-token.interceptor';
import { globalLoadingInterceptor } from './core/interceptors/global-loading.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([globalLoadingInterceptor, authTokenInterceptor, authErrorInterceptor])),
    { provide: AuthRepository, useExisting: AuthApiService },
    { provide: TokenStoragePort, useExisting: LocalStorageTokenStorageService },
  ],
};
