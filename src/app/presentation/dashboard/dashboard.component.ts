import { DatePipe, JsonPipe } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { finalize } from 'rxjs';
import { AuthStore } from '../../application/auth/state/auth.store';
import { PingUseCase } from '../../application/auth/use-cases/ping.use-case';
import { ChangePasswordUseCase } from '../../application/auth/use-cases/change-password.use-case';
import { PingResponse } from '../../domain/auth/models/ping.model';

@Component({
  selector: 'app-dashboard',
  imports: [DatePipe, JsonPipe, ReactiveFormsModule, MatButtonModule, MatCardModule, MatFormFieldModule, MatIconModule, MatInputModule, MatProgressSpinnerModule, MatSnackBarModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {
  readonly pingResult = signal<PingResponse | null>(null);
  readonly pingLoading = signal(false);
  readonly passwordLoading = signal(false);
  readonly passwordForm;

  constructor(
    readonly authStore: AuthStore,
    formBuilder: FormBuilder,
    private readonly changePasswordUseCase: ChangePasswordUseCase,
    private readonly pingUseCase: PingUseCase,
    private readonly snackBar: MatSnackBar,
    private readonly router: Router,
  ) {
    this.passwordForm = formBuilder.nonNullable.group({
      currentPassword: ['', Validators.required],
      newPassword: ['', [Validators.required, Validators.minLength(12), Validators.maxLength(128)]],
      confirmation: ['', Validators.required],
    });
  }

  ngOnInit(): void {
    this.authStore.loadCurrentUser().subscribe({
      error: () => this.snackBar.open('No fue posible cargar el usuario', 'Cerrar', { duration: 3500 }),
    });
  }

  testPing(): void {
    this.pingLoading.set(true);
    this.pingUseCase
      .execute()
      .pipe(finalize(() => this.pingLoading.set(false)))
      .subscribe({
      next: (result) => this.pingResult.set(result),
      error: () => this.snackBar.open('No fue posible probar ping', 'Cerrar', { duration: 3500 }),
      });
  }

  logout(): void {
    this.authStore.logout().subscribe();
  }

  changePassword(): void {
    if (this.passwordForm.invalid || this.passwordForm.controls.newPassword.value !== this.passwordForm.controls.confirmation.value) {
      this.passwordForm.markAllAsTouched();
      return;
    }

    const { currentPassword, newPassword } = this.passwordForm.getRawValue();
    this.passwordLoading.set(true);
    this.changePasswordUseCase.execute(currentPassword, newPassword).pipe(
      finalize(() => this.passwordLoading.set(false)),
    ).subscribe({
      next: () => {
        this.authStore.clearSession();
        this.snackBar.open('Contraseña actualizada. Inicia sesión nuevamente.', 'Cerrar', { duration: 4500 });
        void this.router.navigate(['/login']);
      },
      error: () => this.snackBar.open('No fue posible cambiar la contraseña. Verifica la contraseña actual.', 'Cerrar', { duration: 4500 }),
    });
  }
}
