import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, UntypedFormBuilder, Validators } from '@angular/forms';
import { BrnDialogRef, injectBrnDialogContext } from '@spartan-ng/brain/dialog';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmInput } from '@spartan-ng/helm/input';
import { HlmLabel } from '@spartan-ng/helm/label';
import { Persona, Role } from '../../../domain/personas/models/persona.model';
import { ProvisionarUsuarioRequest } from '../../../infrastructure/personas/api/personas-api.service';

export interface ProvisionarUsuarioDialogData {
  persona: Persona;
  roles: Role[];
}

@Component({
  selector: 'app-provisionar-usuario-dialog',
  imports: [ReactiveFormsModule, HlmButton, HlmInput, HlmLabel],
  templateUrl: './provisionar-usuario-dialog.component.html',
  styleUrl: './provisionar-usuario-dialog.component.scss',
})
export class ProvisionarUsuarioDialogComponent {
  private readonly formBuilder = inject(UntypedFormBuilder);
  private readonly dialogRef = inject<BrnDialogRef<ProvisionarUsuarioRequest>>(BrnDialogRef);
  readonly data = injectBrnDialogContext<ProvisionarUsuarioDialogData>();
  readonly submitted = signal(false);

  readonly form = this.formBuilder.group({
    roleCode: ['', Validators.required],
    password: ['', [Validators.required, Validators.minLength(12), Validators.maxLength(128)]],
    passwordConfirmation: ['', Validators.required],
  });

  save(): void {
    this.submitted.set(true);
    if (this.form.invalid || this.form.controls['password'].value !== this.form.controls['passwordConfirmation'].value) {
      this.form.markAllAsTouched();
      return;
    }

    this.dialogRef.close({
      roleCode: String(this.form.controls['roleCode'].value).trim(),
      password: String(this.form.controls['password'].value),
    });
  }
  cancel(): void { this.dialogRef.close(); }
}
