import { Observable } from 'rxjs';
import { AuthSession } from '../models/auth-session.model';
import { PingResponse } from '../models/ping.model';
import { User } from '../models/user.model';

export abstract class AuthRepository {
  abstract login(email: string, password: string): Observable<AuthSession>;
  abstract refreshSession(refreshToken: string): Observable<AuthSession>;
  abstract logout(refreshToken: string): Observable<void>;
  abstract getCurrentUser(): Observable<User>;
  abstract changePassword(currentPassword: string, newPassword: string): Observable<void>;
  abstract ping(): Observable<PingResponse>;
}
