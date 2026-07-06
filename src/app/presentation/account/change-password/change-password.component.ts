import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { finalize } from 'rxjs';
import { AuthStore } from '../../../application/auth/state/auth.store';
import { ChangePasswordUseCase } from '../../../application/auth/use-cases/change-password.use-case';

@Component({
  selector: 'app-change-password',
  imports: [ReactiveFormsModule, MatButtonModule, MatCardModule, MatFormFieldModule, MatIconModule, MatInputModule, MatProgressSpinnerModule, MatSnackBarModule],
  templateUrl: './change-password.component.html',
  styleUrl: './change-password.component.scss',
})
export class ChangePasswordComponent {
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly changePasswordUseCase = inject(ChangePasswordUseCase);
  private readonly authStore = inject(AuthStore);
  private readonly snackBar = inject(MatSnackBar);
  private readonly router = inject(Router);
  readonly saving = signal(false);
  readonly form = this.formBuilder.group({
    currentPassword: ['', Validators.required],
    newPassword: ['', [Validators.required, Validators.minLength(12), Validators.maxLength(128)]],
    confirmation: ['', Validators.required],
  });

  save(): void {
    if (this.form.invalid || this.form.controls.newPassword.value !== this.form.controls.confirmation.value) {
      this.form.markAllAsTouched();
      return;
    }
    const { currentPassword, newPassword } = this.form.getRawValue();
    this.saving.set(true);
    this.changePasswordUseCase.execute(currentPassword, newPassword).pipe(finalize(() => this.saving.set(false))).subscribe({
      next: () => {
        this.authStore.clearSession();
        this.snackBar.open('Contraseña actualizada. Inicia sesión nuevamente.', 'Cerrar', { duration: 4500 });
        void this.router.navigate(['/login']);
      },
      error: () => this.snackBar.open('No fue posible cambiar la contraseña. Verifica la contraseña actual.', 'Cerrar', { duration: 4500 }),
    });
  }
}
