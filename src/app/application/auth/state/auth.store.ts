import { Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, finalize, Observable, switchMap, tap, throwError } from 'rxjs';
import { User } from '../../../domain/auth/models/user.model';
import { TokenStoragePort } from '../../../infrastructure/auth/storage/token-storage.port';
import { GetCurrentUserUseCase } from '../use-cases/get-current-user.use-case';
import { LoginUseCase } from '../use-cases/login.use-case';
import { LogoutUseCase } from '../use-cases/logout.use-case';

@Injectable({ providedIn: 'root' })
export class AuthStore {
  readonly isAuthenticated = signal(false);
  readonly currentUser = signal<User | null>(null);
  readonly isLoading = signal(false);
  readonly error = signal<string | null>(null);

  constructor(
    private readonly loginUseCase: LoginUseCase,
    private readonly logoutUseCase: LogoutUseCase,
    private readonly getCurrentUserUseCase: GetCurrentUserUseCase,
    private readonly tokenStorage: TokenStoragePort,
    private readonly router: Router,
  ) {}

  login(email: string, password: string): Observable<User> {
    this.isLoading.set(true);
    this.error.set(null);

    return this.loginUseCase.execute(email, password).pipe(
      tap(() => this.isAuthenticated.set(true)),
      switchMap(() => this.loadCurrentUser()),
      tap(() => void this.router.navigate(['/dashboard'])),
      catchError((error: unknown) => {
        this.error.set('Credenciales inválidas');
        return throwError(() => error);
      }),
      finalize(() => this.isLoading.set(false)),
    );
  }

  logout(): Observable<void> {
    this.isLoading.set(true);

    return this.logoutUseCase.execute().pipe(
      tap(() => this.clearSession()),
      tap(() => void this.router.navigate(['/login'])),
      finalize(() => this.isLoading.set(false)),
    );
  }

  loadCurrentUser(): Observable<User> {
    this.isLoading.set(true);
    this.error.set(null);

    return this.getCurrentUserUseCase.execute().pipe(
      tap((user) => {
        this.currentUser.set(user);
        this.isAuthenticated.set(true);
      }),
      catchError((error: unknown) => {
        this.clearSession();
        return throwError(() => error);
      }),
      finalize(() => this.isLoading.set(false)),
    );
  }

  restoreSession(): void {
    this.isAuthenticated.set(Boolean(this.tokenStorage.getAccessToken()));
  }

  clearSession(): void {
    this.tokenStorage.clear();
    this.currentUser.set(null);
    this.isAuthenticated.set(false);
    this.error.set(null);
  }
}
