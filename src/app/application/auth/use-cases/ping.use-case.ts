import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { PingResponse } from '../../../domain/auth/models/ping.model';
import { AuthRepository } from '../../../domain/auth/repositories/auth.repository';

@Injectable({ providedIn: 'root' })
export class PingUseCase {
  constructor(private readonly authRepository: AuthRepository) {}

  execute(): Observable<PingResponse> {
    return this.authRepository.ping();
  }
}
