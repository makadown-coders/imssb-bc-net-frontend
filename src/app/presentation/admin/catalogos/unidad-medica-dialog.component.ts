import { Component, inject } from '@angular/core';
import { ReactiveFormsModule, UntypedFormBuilder, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Localidad, TipoUnidad, UnidadMedica } from '../../../domain/catalogos/models/catalogo.model';
import { UnidadMedicaRequest } from '../../../infrastructure/catalogos/api/catalogos-api.service';

export interface UnidadMedicaDialogData {
  unidad: UnidadMedica | null;
  tiposUnidad: TipoUnidad[];
  localidades: Localidad[];
}

@Component({
  selector: 'app-unidad-medica-dialog',
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
  templateUrl: './unidad-medica-dialog.component.html',
  styleUrl: './unidad-medica-dialog.component.scss',
})
export class UnidadMedicaDialogComponent {
  private readonly formBuilder = inject(UntypedFormBuilder);
  private readonly dialogRef = inject<MatDialogRef<UnidadMedicaDialogComponent, UnidadMedicaRequest>>(MatDialogRef);
  readonly data = inject<UnidadMedicaDialogData>(MAT_DIALOG_DATA);

  readonly form = this.formBuilder.group({
    nombre: [this.data.unidad?.nombre ?? '', [Validators.required, Validators.maxLength(255)]],
    cluessa: [this.data.unidad?.cluessa ?? '', [Validators.maxLength(20)]],
    cluesimb: [this.data.unidad?.cluesimb ?? '', [Validators.maxLength(20)]],
    activo: [this.data.unidad?.activo ?? true],
    direccion: [this.data.unidad?.direccion ?? ''],
    localidadId: [this.data.unidad?.localidadId ?? null],
    latitud: [this.data.unidad?.latitud ?? null],
    longitud: [this.data.unidad?.longitud ?? null],
    tipoUnidadId: [this.data.unidad?.tipoUnidadId ?? null],
    estratoUnidad: [this.data.unidad?.estratoUnidad ?? '', [Validators.maxLength(10)]],
    nivelAtencion: [this.data.unidad?.nivelAtencion ?? '', [Validators.maxLength(30)]],
  });

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.dialogRef.close({
      nombre: this.text('nombre'),
      cluessa: this.textOrNull('cluessa'),
      cluesimb: this.textOrNull('cluesimb'),
      activo: Boolean(this.form.controls['activo'].value),
      direccion: this.textOrNull('direccion'),
      localidadId: this.numberOrNull('localidadId'),
      latitud: this.numberOrNull('latitud'),
      longitud: this.numberOrNull('longitud'),
      tipoUnidadId: this.numberOrNull('tipoUnidadId'),
      estratoUnidad: this.textOrNull('estratoUnidad'),
      nivelAtencion: this.textOrNull('nivelAtencion'),
    });
  }

  private text(key: string): string {
    return String(this.form.controls[key].value ?? '').trim();
  }

  private textOrNull(key: string): string | null {
    const value = this.text(key);
    return value ? value : null;
  }

  private numberOrNull(key: string): number | null {
    const value = this.form.controls[key].value;
    if (value === null || value === undefined || value === '') {
      return null;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
}
