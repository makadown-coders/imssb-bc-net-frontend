import { InjectionToken } from '@angular/core';
import { environment } from '../../../environments/environment';

export interface AppConfig {
  apiBaseUrl: string;
}

export const APP_CONFIG = new InjectionToken<AppConfig>('APP_CONFIG', {
  providedIn: 'root',
  factory: () => environment,
});

export const API_ENDPOINTS = {
  ping: '/api/ping',
  auth: {
    login: '/api/auth/login',
    refresh: '/api/auth/refresh',
    logout: '/api/auth/logout',
  },
  user: {
    me: '/api/user/me',
  },
  catalogos: {
    tipoUnidad: '/api/catalogos/tipo-unidad',
    municipios: '/api/catalogos/municipios',
    localidades: '/api/catalogos/localidades',
    unidadesMedicas: '/api/catalogos/unidades-medicas',
    tipologias: '/api/catalogos/tipologias',
    tipologiasUnidad: '/api/catalogos/tipologias-unidad',
  },
} as const;
