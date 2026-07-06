import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize } from 'rxjs';
import { GlobalLoadingService } from '../loading/global-loading.service';

export const globalLoadingInterceptor: HttpInterceptorFn = (request, next) => {
  const loading = inject(GlobalLoadingService);
  const finish = loading.begin(requestMessage(request.method, request.url));
  return next(request).pipe(finalize(finish));
};

function requestMessage(method: string, url: string): string {
  if (method === 'POST' && /\/personas\/\d+\/usuario(?:\?|$)/.test(url)) {
    return 'Creando la cuenta de usuario…';
  }
  if (url.includes('/auth/login')) return 'Iniciando sesión…';
  if (url.includes('/auth/refresh') || url.includes('/user/me')) return 'Verificando tu sesión…';
  if (method === 'GET') return 'Cargando información…';
  if (method === 'DELETE') return 'Aplicando cambios…';
  return 'Guardando cambios…';
}
