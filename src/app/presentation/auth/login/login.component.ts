import { Component, computed, inject } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideLogIn, lucideLockKeyhole, lucideMail } from '@ng-icons/lucide';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmCard, HlmCardContent, HlmCardDescription, HlmCardHeader, HlmCardTitle } from '@spartan-ng/helm/card';
import { HlmInput } from '@spartan-ng/helm/input';
import { HlmLabel } from '@spartan-ng/helm/label';
import { HlmSpinner } from '@spartan-ng/helm/spinner';
import { toast } from '@spartan-ng/brain/sonner';
import { AuthStore } from '../../../application/auth/state/auth.store';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, NgIcon, HlmButton, HlmCard, HlmCardContent, HlmCardDescription, HlmCardHeader, HlmCardTitle, HlmInput, HlmLabel, HlmSpinner],
  providers: [provideIcons({ lucideLogIn, lucideLockKeyhole, lucideMail })],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly authStore = inject(AuthStore);
  readonly form = this.formBuilder.group({ email: ['', [Validators.required, Validators.email]], password: ['', Validators.required] });
  readonly isLoading = computed(() => this.authStore.isLoading());
  submit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const { email, password } = this.form.getRawValue();
    this.authStore.login(email, password).subscribe({ error: () => toast.error('Credenciales inválidas') });
  }
}
