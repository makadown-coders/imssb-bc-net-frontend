import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, UntypedFormBuilder, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Persona, Role } from '../../../domain/personas/models/persona.model';
import { ProvisionarUsuarioRequest } from '../../../infrastructure/personas/api/personas-api.service';

export interface ProvisionarUsuarioDialogData {
  persona: Persona;
  roles: Role[];
}

@Component({
  selector: 'app-provisionar-usuario-dialog',
  imports: [ReactiveFormsModule, MatButtonModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatSelectModule],
  templateUrl: './provisionar-usuario-dialog.component.html',
  styleUrl: './provisionar-usuario-dialog.component.scss',
})
export class ProvisionarUsuarioDialogComponent {
  private readonly formBuilder = inject(UntypedFormBuilder);
  private readonly dialogRef = inject<MatDialogRef<ProvisionarUsuarioDialogComponent, ProvisionarUsuarioRequest>>(MatDialogRef);
  readonly data = inject<ProvisionarUsuarioDialogData>(MAT_DIALOG_DATA);
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
}
