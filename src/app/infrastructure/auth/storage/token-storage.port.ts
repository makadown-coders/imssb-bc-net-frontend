import { AuthSession } from '../../../domain/auth/models/auth-session.model';

export abstract class TokenStoragePort {
  abstract getAccessToken(): string | null;
  abstract getRefreshToken(): string | null;
  abstract getSession(): AuthSession | null;
  abstract saveSession(session: AuthSession): void;
  abstract clear(): void;
}
