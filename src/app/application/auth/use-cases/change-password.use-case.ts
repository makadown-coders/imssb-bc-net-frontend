import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { AuthRepository } from '../../../domain/auth/repositories/auth.repository';

@Injectable({ providedIn: 'root' })
export class ChangePasswordUseCase {
  constructor(private readonly authRepository: AuthRepository) {}

  execute(currentPassword: string, newPassword: string): Observable<void> {
    return this.authRepository.changePassword(currentPassword, newPassword);
  }
}
