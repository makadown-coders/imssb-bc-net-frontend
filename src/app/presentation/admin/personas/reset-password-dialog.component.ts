import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { BrnDialogRef, injectBrnDialogContext } from '@spartan-ng/brain/dialog';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmInput } from '@spartan-ng/helm/input';
import { HlmLabel } from '@spartan-ng/helm/label';
import { Persona } from '../../../domain/personas/models/persona.model';

@Component({
  selector: 'app-reset-password-dialog',
  imports: [ReactiveFormsModule, HlmButton, HlmInput, HlmLabel],
  templateUrl: './reset-password-dialog.component.html',
  styles: [`.dialog-content { display: grid; gap: 12px; min-width: min(420px, 75vw); padding-top: 8px; }`],
})
export class ResetPasswordDialogComponent {
  private readonly dialogRef = inject<BrnDialogRef<string>>(BrnDialogRef);
  readonly persona = injectBrnDialogContext<Persona>();
  readonly form = inject(FormBuilder).nonNullable.group({
    newPassword: ['', [Validators.required, Validators.minLength(12), Validators.maxLength(128)]],
    confirmation: ['', Validators.required],
  });

  save(): void {
    if (this.form.invalid || this.form.controls.newPassword.value !== this.form.controls.confirmation.value) {
      this.form.markAllAsTouched();
      return;
    }
    this.dialogRef.close(this.form.controls.newPassword.value);
  }
  cancel(): void { this.dialogRef.close(); }
}
