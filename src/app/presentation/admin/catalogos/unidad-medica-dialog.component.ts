import { Component, inject } from '@angular/core';
import { ReactiveFormsModule, UntypedFormBuilder, Validators } from '@angular/forms';
import { BrnDialogRef, injectBrnDialogContext } from '@spartan-ng/brain/dialog';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmCheckbox } from '@spartan-ng/helm/checkbox';
import { HlmInput } from '@spartan-ng/helm/input';
import { HlmLabel } from '@spartan-ng/helm/label';
import { HlmTextarea } from '@spartan-ng/helm/textarea';
import { Localidad, TipoUnidad, UnidadMedica } from '../../../domain/catalogos/models/catalogo.model';
import { UnidadMedicaRequest } from '../../../infrastructure/catalogos/api/catalogos-api.service';

export interface UnidadMedicaDialogData {
  unidad: UnidadMedica | null;
  tiposUnidad: TipoUnidad[];
  localidades: Localidad[];
}

@Component({
  selector: 'app-unidad-medica-dialog',
  imports: [ReactiveFormsModule, HlmButton, HlmCheckbox, HlmInput, HlmLabel, HlmTextarea],
  templateUrl: './unidad-medica-dialog.component.html',
  styleUrl: './unidad-medica-dialog.component.scss',
})
export class UnidadMedicaDialogComponent {
  private readonly formBuilder = inject(UntypedFormBuilder);
  private readonly dialogRef = inject<BrnDialogRef<UnidadMedicaRequest>>(BrnDialogRef);
  readonly data = injectBrnDialogContext<UnidadMedicaDialogData>();

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

  get hasCoordinates(): boolean {
    const latitude = this.numberOrNull('latitud');
    const longitude = this.numberOrNull('longitud');
    return latitude !== null && longitude !== null && latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180;
  }

  openMap(): void {
    const latitude = this.numberOrNull('latitud');
    const longitude = this.numberOrNull('longitud');
    if (latitude === null || longitude === null || !this.hasCoordinates) {
      return;
    }

    const query = encodeURIComponent(`${latitude},${longitude}`);
    window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank', 'noopener,noreferrer');
  }

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
  cancel(): void { this.dialogRef.close(); }

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
