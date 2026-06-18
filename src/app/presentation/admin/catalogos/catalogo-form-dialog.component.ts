import { Component, inject } from '@angular/core';
import { ReactiveFormsModule, UntypedFormBuilder, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

export interface CatalogoFormField {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'boolean' | 'select';
  required?: boolean;
  maxLength?: number;
  optionsKey?: string;
}

export interface CatalogoFormDialogData {
  title: string;
  fields: CatalogoFormField[];
  row: Record<string, unknown> | null;
  options: Record<string, Array<{ id: number; label: string }>>;
}

@Component({
  selector: 'app-catalogo-form-dialog',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCheckboxModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
  ],
  templateUrl: './catalogo-form-dialog.component.html',
  styleUrl: './catalogo-form-dialog.component.scss',
})
export class CatalogoFormDialogComponent {
  private readonly formBuilder = inject(UntypedFormBuilder);
  private readonly dialogRef = inject<MatDialogRef<CatalogoFormDialogComponent, Record<string, unknown>>>(MatDialogRef);
  readonly data = inject<CatalogoFormDialogData>(MAT_DIALOG_DATA);

  readonly form = this.formBuilder.group({});

  constructor() {
    this.data.fields.forEach((field) => {
      const validators = [];
      if (field.required) {
        validators.push(Validators.required);
      }
      if (field.maxLength) {
        validators.push(Validators.maxLength(field.maxLength));
      }

      this.form.addControl(field.key, this.formBuilder.control(this.initialValue(field), { validators }));
    });
  }

  optionsFor(field: CatalogoFormField): Array<{ id: number; label: string }> {
    return field.optionsKey ? this.data.options[field.optionsKey] ?? [] : [];
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.dialogRef.close(this.form.getRawValue());
  }

  private initialValue(field: CatalogoFormField): unknown {
    if (!this.data.row) {
      return field.type === 'boolean' ? false : null;
    }

    return this.data.row[field.key] ?? (field.type === 'boolean' ? false : null);
  }
}
