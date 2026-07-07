import { Component, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, UntypedFormBuilder, Validators } from '@angular/forms';
import { BrnDialogRef, injectBrnDialogContext } from '@spartan-ng/brain/dialog';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmCheckbox } from '@spartan-ng/helm/checkbox';
import { HlmInput } from '@spartan-ng/helm/input';
import { HlmLabel } from '@spartan-ng/helm/label';
import { startWith } from 'rxjs';
import { UnidadMedica } from '../../../domain/catalogos/models/catalogo.model';
import { Persona } from '../../../domain/personas/models/persona.model';
import { PersonaRequest } from '../../../infrastructure/personas/api/personas-api.service';

export interface PersonaFormDialogData {
  persona: Persona | null;
  unidadesMedicas: UnidadMedica[];
}

@Component({
  selector: 'app-persona-form-dialog',
  imports: [ReactiveFormsModule, HlmButton, HlmCheckbox, HlmInput, HlmLabel],
  templateUrl: './persona-form-dialog.component.html',
  styleUrl: './persona-form-dialog.component.scss',
})
export class PersonaFormDialogComponent {
  private readonly formBuilder = inject(UntypedFormBuilder);
  private readonly dialogRef = inject<BrnDialogRef<PersonaRequest>>(BrnDialogRef);
  readonly data = injectBrnDialogContext<PersonaFormDialogData>();

  readonly form = this.formBuilder.group({
    nombres: [this.data.persona?.nombres ?? '', [Validators.required, Validators.maxLength(150)]],
    apellidos: [this.data.persona?.apellidos ?? '', [Validators.required, Validators.maxLength(150)]],
    cargo: [this.data.persona?.cargo ?? '', Validators.maxLength(100)],
    rfc: [this.data.persona?.rfc ?? '', Validators.maxLength(13)],
    curp: [this.data.persona?.curp ?? '', Validators.maxLength(18)],
    correoPrincipal: [this.data.persona?.correoPrincipal ?? '', Validators.email],
    username: [this.data.persona?.username ?? '', Validators.maxLength(100)],
    activo: [this.data.persona?.activo ?? true],
  });

  readonly unidadSeleccionada = new FormControl<UnidadMedica | string | null>(this.initialUnidad());
  readonly unidadesFiltradas = signal<UnidadMedica[]>(this.data.unidadesMedicas);

  constructor() {
    this.unidadSeleccionada.valueChanges.pipe(startWith(this.unidadSeleccionada.value)).subscribe((value) => {
      const search = typeof value === 'string' ? value : value?.nombre ?? '';
      const normalizedSearch = search.trim().toLocaleLowerCase();
      this.unidadesFiltradas.set(
        normalizedSearch
          ? this.data.unidadesMedicas.filter((unidad) => unidad.nombre.toLocaleLowerCase().includes(normalizedSearch))
          : this.data.unidadesMedicas,
      );
    });
  }

  displayUnidad(value: UnidadMedica | string | null): string {
    return typeof value === 'object' && value ? value.nombre : value ?? '';
  }

  clearUnidad(): void {
    this.unidadSeleccionada.setValue(null);
  }
  selectUnidad(value: string): void { this.unidadSeleccionada.setValue(this.data.unidadesMedicas.find((unidad) => String(unidad.id) === value) ?? null); }
  selectedUnidadId(): number | '' { const value = this.unidadSeleccionada.value; return typeof value === 'object' && value ? value.id : ''; }
  cancel(): void { this.dialogRef.close(); }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.dialogRef.close({
      nombres: this.text('nombres'),
      apellidos: this.text('apellidos'),
      cargo: this.textOrNull('cargo'),
      unidadMedicaId: this.unidadSeleccionada.value instanceof Object ? this.unidadSeleccionada.value.id : null,
      rfc: this.textOrNull('rfc'),
      curp: this.textOrNull('curp'),
      correoPrincipal: this.textOrNull('correoPrincipal'),
      username: this.textOrNull('username'),
      activo: Boolean(this.form.controls['activo'].value),
    });
  }

  private text(key: string): string {
    return String(this.form.controls[key].value ?? '').trim();
  }

  private textOrNull(key: string): string | null {
    const value = this.text(key);
    return value || null;
  }

  private initialUnidad(): UnidadMedica | null {
    return this.data.unidadesMedicas.find((unidad) => unidad.id === this.data.persona?.unidadMedicaId) ?? null;
  }
}
