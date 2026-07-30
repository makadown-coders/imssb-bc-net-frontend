import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { BrnDialogRef, injectBrnDialogContext } from '@spartan-ng/brain/dialog';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmInput } from '@spartan-ng/helm/input';
import { HlmLabel } from '@spartan-ng/helm/label';
import { ManagedUser } from '../../../domain/users/models/managed-user.model';

@Component({
  selector: 'app-user-password-dialog',
  imports: [ReactiveFormsModule, HlmButton, HlmInput, HlmLabel],
  templateUrl: './user-password-dialog.component.html',
  styles: [`.dialog-content { display: grid; gap: 12px; min-width: min(420px, 75vw); padding-top: 8px; }`],
})
export class UserPasswordDialogComponent {
  private readonly dialogRef = inject<BrnDialogRef<string>>(BrnDialogRef);
  readonly user = injectBrnDialogContext<ManagedUser>();
  readonly form = inject(FormBuilder).nonNullable.group({
    password: ['', [Validators.required, Validators.minLength(12), Validators.maxLength(128)]],
    confirmation: ['', Validators.required],
  });

  save(): void {
    if (this.form.invalid || this.form.controls.password.value !== this.form.controls.confirmation.value) {
      this.form.markAllAsTouched();
      return;
    }
    this.dialogRef.close(this.form.controls.password.value);
  }
  cancel(): void { this.dialogRef.close(); }
}
