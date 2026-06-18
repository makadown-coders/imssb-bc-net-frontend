import { AuthSession } from '../../../domain/auth/models/auth-session.model';
import { LocalStorageTokenStorageService } from './token-storage.service';

describe('LocalStorageTokenStorageService', () => {
  const session: AuthSession = {
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
    accessTokenExpiresUtc: '2026-06-18T12:00:00Z',
    refreshTokenExpiresUtc: '2026-06-25T00:00:00Z',
  };

  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it('TokenStorage_Should_SaveAndRestoreSession', () => {
    const storage = new LocalStorageTokenStorageService();

    storage.saveSession(session);

    expect(storage.getSession()).toEqual(session);
    expect(storage.getAccessToken()).toBe(session.accessToken);
    expect(storage.getRefreshToken()).toBe(session.refreshToken);
  });
});
