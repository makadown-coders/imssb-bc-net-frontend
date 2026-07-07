import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideKeyRound } from '@ng-icons/lucide';
import { toast } from '@spartan-ng/brain/sonner';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmInput } from '@spartan-ng/helm/input';
import { HlmLabel } from '@spartan-ng/helm/label';
import { HlmSpinner } from '@spartan-ng/helm/spinner';
import { finalize } from 'rxjs';
import { AuthStore } from '../../../application/auth/state/auth.store';
import { ChangePasswordUseCase } from '../../../application/auth/use-cases/change-password.use-case';

@Component({
  selector: 'app-change-password',
  imports: [ReactiveFormsModule, NgIcon, HlmButton, HlmCardImports, HlmInput, HlmLabel, HlmSpinner],
  providers: [provideIcons({ lucideKeyRound })],
  templateUrl: './change-password.component.html',
  styleUrl: './change-password.component.scss',
})
export class ChangePasswordComponent {
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly changePasswordUseCase = inject(ChangePasswordUseCase);
  private readonly authStore = inject(AuthStore);
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
        toast.success('Contraseña actualizada. Inicia sesión nuevamente.');
        void this.router.navigate(['/login']);
      },
      error: () => toast.error('No fue posible cambiar la contraseña. Verifica la contraseña actual.'),
    });
  }
}
