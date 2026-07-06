import { DatePipe, JsonPipe } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { finalize } from 'rxjs';
import { AuthStore } from '../../application/auth/state/auth.store';
import { PingUseCase } from '../../application/auth/use-cases/ping.use-case';
import { PingResponse } from '../../domain/auth/models/ping.model';

@Component({
  selector: 'app-dashboard',
  imports: [DatePipe, JsonPipe, RouterLink, MatButtonModule, MatCardModule, MatIconModule, MatProgressSpinnerModule, MatSnackBarModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {
  readonly pingResult = signal<PingResponse | null>(null);
  readonly pingLoading = signal(false);

  constructor(
    readonly authStore: AuthStore,
    private readonly pingUseCase: PingUseCase,
    private readonly snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    if (this.authStore.currentUser() || this.authStore.isLoading()) return;
    this.authStore.loadCurrentUser().subscribe({
      error: () => this.snackBar.open('No fue posible cargar el usuario', 'Cerrar', { duration: 3500 }),
    });
  }

  testPing(): void {
    this.pingLoading.set(true);
    this.pingUseCase.execute().pipe(finalize(() => this.pingLoading.set(false))).subscribe({
      next: (result) => this.pingResult.set(result),
      error: () => this.snackBar.open('No fue posible probar ping', 'Cerrar', { duration: 3500 }),
    });
  }

  logout(): void { this.authStore.logout().subscribe(); }
}
