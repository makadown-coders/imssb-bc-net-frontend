import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ManagedUser } from '../../../domain/users/models/managed-user.model';

@Component({
  selector: 'app-user-password-dialog',
  imports: [ReactiveFormsModule, MatButtonModule, MatDialogModule, MatFormFieldModule, MatInputModule],
  templateUrl: './user-password-dialog.component.html',
  styles: [`.dialog-content { display: grid; gap: 12px; min-width: min(420px, 75vw); padding-top: 8px; }`],
})
export class UserPasswordDialogComponent {
  private readonly dialogRef = inject<MatDialogRef<UserPasswordDialogComponent, string>>(MatDialogRef);
  readonly user = inject<ManagedUser>(MAT_DIALOG_DATA);
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
}
