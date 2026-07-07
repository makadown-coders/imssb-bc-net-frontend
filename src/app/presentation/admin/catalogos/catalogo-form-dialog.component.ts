import { Component, inject } from '@angular/core';
import { ReactiveFormsModule, UntypedFormBuilder, Validators } from '@angular/forms';
import { BrnDialogRef, injectBrnDialogContext } from '@spartan-ng/brain/dialog';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmCheckbox } from '@spartan-ng/helm/checkbox';
import { HlmInput } from '@spartan-ng/helm/input';
import { HlmLabel } from '@spartan-ng/helm/label';
import { HlmTextarea } from '@spartan-ng/helm/textarea';

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
  imports: [ReactiveFormsModule, HlmButton, HlmCheckbox, HlmInput, HlmLabel, HlmTextarea],
  templateUrl: './catalogo-form-dialog.component.html',
  styleUrl: './catalogo-form-dialog.component.scss',
})
export class CatalogoFormDialogComponent {
  private readonly formBuilder = inject(UntypedFormBuilder);
  private readonly dialogRef = inject<BrnDialogRef<Record<string, unknown>>>(BrnDialogRef);
  readonly data = injectBrnDialogContext<CatalogoFormDialogData>();

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
  cancel(): void { this.dialogRef.close(); }

  private initialValue(field: CatalogoFormField): unknown {
    if (!this.data.row) {
      return field.type === 'boolean' ? false : null;
    }

    return this.data.row[field.key] ?? (field.type === 'boolean' ? false : null);
  }
}
