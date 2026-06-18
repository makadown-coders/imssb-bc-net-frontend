import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { User } from '../../../domain/auth/models/user.model';
import { AuthRepository } from '../../../domain/auth/repositories/auth.repository';

@Injectable({ providedIn: 'root' })
export class GetCurrentUserUseCase {
  constructor(private readonly authRepository: AuthRepository) {}

  execute(): Observable<User> {
    return this.authRepository.getCurrentUser();
  }
}
