import { Injectable } from '@angular/core';
import { AuthSession } from '../../../domain/auth/models/auth-session.model';
import { TokenStoragePort } from './token-storage.port';

const STORAGE_KEYS = {
  accessToken: 'imssb.accessToken',
  refreshToken: 'imssb.refreshToken',
  accessTokenExpiresUtc: 'imssb.accessTokenExpiresUtc',
  refreshTokenExpiresUtc: 'imssb.refreshTokenExpiresUtc',
} as const;

@Injectable({ providedIn: 'root' })
export class LocalStorageTokenStorageService implements TokenStoragePort {
  getAccessToken(): string | null {
    return localStorage.getItem(STORAGE_KEYS.accessToken);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(STORAGE_KEYS.refreshToken);
  }

  getSession(): AuthSession | null {
    const accessToken = this.getAccessToken();
    const refreshToken = this.getRefreshToken();
    const accessTokenExpiresUtc = localStorage.getItem(STORAGE_KEYS.accessTokenExpiresUtc);
    const refreshTokenExpiresUtc = localStorage.getItem(STORAGE_KEYS.refreshTokenExpiresUtc);

    if (!accessToken || !refreshToken || !accessTokenExpiresUtc || !refreshTokenExpiresUtc) {
      return null;
    }

    return {
      accessToken,
      refreshToken,
      accessTokenExpiresUtc,
      refreshTokenExpiresUtc,
    };
  }

  saveSession(session: AuthSession): void {
    // Almacenamiento temporal: en producción se prefieren cookies httpOnly + SameSite cuando el backend las admita.
    localStorage.setItem(STORAGE_KEYS.accessToken, session.accessToken);
    localStorage.setItem(STORAGE_KEYS.refreshToken, session.refreshToken);
    localStorage.setItem(STORAGE_KEYS.accessTokenExpiresUtc, session.accessTokenExpiresUtc);
    localStorage.setItem(STORAGE_KEYS.refreshTokenExpiresUtc, session.refreshTokenExpiresUtc);
  }

  clear(): void {
    Object.values(STORAGE_KEYS).forEach((key) => localStorage.removeItem(key));
  }
}
