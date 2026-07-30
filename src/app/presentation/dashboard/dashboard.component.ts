import { DatePipe, JsonPipe } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideKeyRound, lucideLogOut, lucideRadio } from '@ng-icons/lucide';
import { toast } from '@spartan-ng/brain/sonner';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmSpinner } from '@spartan-ng/helm/spinner';
import { finalize } from 'rxjs';
import { AuthStore } from '../../application/auth/state/auth.store';
import { PingUseCase } from '../../application/auth/use-cases/ping.use-case';
import { PingResponse } from '../../domain/auth/models/ping.model';

@Component({
  selector: 'app-dashboard',
  imports: [DatePipe, JsonPipe, RouterLink, NgIcon, HlmButton, HlmCardImports, HlmSpinner],
  providers: [provideIcons({ lucideKeyRound, lucideLogOut, lucideRadio })],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {
  readonly pingResult = signal<PingResponse | null>(null);
  readonly pingLoading = signal(false);

  constructor(
    readonly authStore: AuthStore,
    private readonly pingUseCase: PingUseCase,
  ) {}

  ngOnInit(): void {
    if (this.authStore.currentUser() || this.authStore.isLoading()) return;
    this.authStore.loadCurrentUser().subscribe({
      error: () => toast.error('No fue posible cargar el usuario'),
    });
  }

  testPing(): void {
    this.pingLoading.set(true);
    this.pingUseCase.execute().pipe(finalize(() => this.pingLoading.set(false))).subscribe({
      next: (result) => this.pingResult.set(result),
      error: () => toast.error('No fue posible probar ping'),
    });
  }

  logout(): void { this.authStore.logout().subscribe(); }
}
