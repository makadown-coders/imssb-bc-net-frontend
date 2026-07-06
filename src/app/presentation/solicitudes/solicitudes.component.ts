import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, FormControl, NonNullableFormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { MatAutocompleteModule, MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatStepperModule } from '@angular/material/stepper';
import { MatTableModule } from '@angular/material/table';
import { catchError, debounceTime, distinctUntilChanged, filter, finalize, map, of, switchMap } from 'rxjs';
import { ArticuloCatalogo, ArticuloSolicitud, DatosSolicitud, UnidadSolicitud } from '../../domain/solicitudes/models/solicitud.model';
import { SolicitudesApiService } from '../../infrastructure/solicitudes/api/solicitudes-api.service';
import { SolicitudDraftService } from '../../infrastructure/solicitudes/storage/solicitud-draft.service';

@Component({
  selector: 'app-solicitudes',
  imports: [ReactiveFormsModule, MatAutocompleteModule, MatButtonModule, MatCardModule, MatDatepickerModule, MatFormFieldModule, MatIconModule, MatInputModule, MatProgressSpinnerModule, MatSelectModule, MatSnackBarModule, MatStepperModule, MatTableModule],
  templateUrl: './solicitudes.component.html',
  styleUrl: './solicitudes.component.scss',
  providers: [provideNativeDateAdapter()],
})
export class SolicitudesComponent implements OnInit {
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly api = inject(SolicitudesApiService);
  private readonly drafts = inject(SolicitudDraftService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);

  readonly tiposInsumo = ['Medicamento', 'Material de Curación', 'Mezclas', 'Otros'];
  readonly displayedColumns = ['clave', 'descripcion', 'presentacion', 'cantidad', 'observaciones', 'acciones'];
  readonly unidades = signal<UnidadSolicitud[]>([]);
  readonly unidadesFiltradas = signal<UnidadSolicitud[]>([]);
  readonly resultados = signal<ArticuloCatalogo[]>([]);
  readonly articulos = signal<ArticuloSolicitud[]>([]);
  readonly selectedArticle = signal<ArticuloCatalogo | null>(null);
  readonly loadingUnits = signal(false);
  readonly searching = signal(false);
  readonly saving = signal(false);
  readonly draftRestored = signal(false);
  readonly totalPiezas = computed(() => this.articulos().reduce((sum, item) => sum + item.cantidad, 0));

  readonly datosForm = this.formBuilder.group({
    unidad: new FormControl<UnidadSolicitud | null>(null, Validators.required),
    tipoInsumo: ['', Validators.required],
    tipoPedido: this.formBuilder.control<'Ordinario' | 'Extraordinario'>('Ordinario', Validators.required),
    responsableCaptura: ['', [Validators.required, Validators.maxLength(150)]],
    fechaInicio: new FormControl<Date | null>(null, Validators.required),
    fechaFin: new FormControl<Date | null>(null, Validators.required),
  }, { validators: validDateRange });
  readonly unidadSearch = new FormControl<string | UnidadSolicitud>('', { nonNullable: true });
  readonly articuloSearch = new FormControl<string | ArticuloCatalogo>('', { nonNullable: true });
  readonly articuloForm = this.formBuilder.group({ cantidad: [1, [Validators.required, Validators.min(1), Validators.max(99999)]], observaciones: ['', Validators.maxLength(300)] });

  ngOnInit(): void {
    this.loadUnits();
    this.unidadSearch.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((value) => {
      const term = typeof value === 'string' ? normalize(value) : '';
      if (typeof value === 'string') this.datosForm.controls.unidad.setValue(null);
      this.unidadesFiltradas.set(term ? this.unidades().filter((unit) => normalize(`${unit.cluesimb} ${unit.cluessa} ${unit.nombre} ${unit.municipio}`).includes(term)).slice(0, 30) : this.unidades().slice(0, 30));
    });
    this.articuloSearch.valueChanges.pipe(
      map((value) => typeof value === 'string' ? value.trim() : ''), debounceTime(350), distinctUntilChanged(),
      filter((value) => { if (value.length < 3) this.resultados.set([]); return value.length >= 3; }),
      switchMap((value) => { this.searching.set(true); return this.api.buscarArticulos(value).pipe(catchError(() => of({ resultados: [], total: 0 })), finalize(() => this.searching.set(false))); }),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe((response) => this.resultados.set(response.resultados));
  }

  displayUnit = (unit: UnidadSolicitud | string | null): string => typeof unit === 'string' ? unit : unit?.nombre ?? '';
  displayArticle = (article: ArticuloCatalogo | string | null): string => typeof article === 'string' ? article : article ? `${article.clave} · ${article.descripcion}` : '';

  selectUnit(event: MatAutocompleteSelectedEvent): void { this.datosForm.controls.unidad.setValue(event.option.value as UnidadSolicitud); this.persist(); }
  selectArticle(event: MatAutocompleteSelectedEvent): void { this.selectedArticle.set(event.option.value as ArticuloCatalogo); }

  addArticle(): void {
    const selected = this.selectedArticle();
    if (!selected || this.articuloForm.invalid) { this.articuloForm.markAllAsTouched(); return; }
    if (this.articulos().some((item) => normalizeKey(item.clave) === normalizeKey(selected.clave))) {
      this.snackBar.open('Esta clave ya se encuentra en la solicitud.', 'Cerrar', { duration: 3500 }); return;
    }
    const values = this.articuloForm.getRawValue();
    this.articulos.update((items) => [...items, { ...selected, cantidad: values.cantidad, observaciones: values.observaciones.trim() }]);
    this.selectedArticle.set(null); this.articuloSearch.setValue(''); this.resultados.set([]); this.articuloForm.reset({ cantidad: 1, observaciones: '' }); this.persist();
  }

  updateQuantity(index: number, value: string): void {
    const quantity = Math.max(1, Math.min(99999, Number(value) || 1));
    this.articulos.update((items) => items.map((item, i) => i === index ? { ...item, cantidad: quantity } : item)); this.persist();
  }
  updateNotes(index: number, value: string): void { this.articulos.update((items) => items.map((item, i) => i === index ? { ...item, observaciones: value.slice(0, 300) } : item)); this.persist(); }
  removeArticle(index: number): void { this.articulos.update((items) => items.filter((_, i) => i !== index)); this.persist(); }

  submit(): void {
    if (this.datosForm.invalid || !this.articulos().length) { this.datosForm.markAllAsTouched(); this.snackBar.open('Completa los datos y agrega al menos un artículo.', 'Cerrar', { duration: 4000 }); return; }
    const datos = this.toData(); if (!datos) return;
    this.saving.set(true);
    this.api.registrar(datos, this.articulos()).pipe(finalize(() => this.saving.set(false))).subscribe({
      next: (result) => { this.snackBar.open(result.deduped ? 'La solicitud ya había sido registrada hoy.' : 'Solicitud registrada correctamente.', 'Cerrar', { duration: 4500 }); this.drafts.clear(); },
      error: () => this.snackBar.open('No fue posible registrar la solicitud. Tu borrador permanece guardado.', 'Cerrar', { duration: 5000 }),
    });
  }

  clear(): void { if (!confirm('¿Deseas borrar toda la captura actual?')) return; this.datosForm.reset({ tipoPedido: 'Ordinario', tipoInsumo: '', responsableCaptura: '', unidad: null, fechaInicio: null, fechaFin: null }); this.unidadSearch.setValue(''); this.articulos.set([]); this.drafts.clear(); }

  private loadUnits(): void {
    this.loadingUnits.set(true);
    this.api.getUnidades().pipe(finalize(() => this.loadingUnits.set(false))).subscribe({ next: (units) => { this.unidades.set(units); this.unidadesFiltradas.set(units.slice(0, 30)); this.restore(); }, error: () => this.snackBar.open('No fue posible cargar las unidades.', 'Cerrar', { duration: 4000 }) });
  }
  private restore(): void {
    const draft = this.drafts.load(); if (!draft) return;
    this.articulos.set(draft.articulos ?? []);
    if (draft.datos) { const unit = this.unidades().find((item) => item.cluesimb === draft.datos?.unidad.cluesimb) ?? draft.datos.unidad; this.datosForm.patchValue({ ...draft.datos, unidad: unit, fechaInicio: new Date(`${draft.datos.fechaInicio}T00:00:00`), fechaFin: new Date(`${draft.datos.fechaFin}T00:00:00`) }); this.unidadSearch.setValue(unit); }
    this.draftRestored.set(true);
  }
  persist(): void { this.drafts.save({ datos: this.toData(), articulos: this.articulos() }); }
  private toData(): DatosSolicitud | null {
    const value = this.datosForm.getRawValue();
    if (!value.unidad || !value.fechaInicio || !value.fechaFin || !value.tipoInsumo || !value.responsableCaptura) return null;
    return { unidad: value.unidad, tipoInsumo: value.tipoInsumo, tipoPedido: value.tipoPedido, responsableCaptura: value.responsableCaptura.trim(), fechaInicio: localDate(value.fechaInicio), fechaFin: localDate(value.fechaFin) };
  }
}

function normalize(value: string): string { return value.toLocaleLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim(); }
function normalizeKey(value: string): string { return value.replace(/\./g, '').toUpperCase(); }
function localDate(value: Date): string { const offset = value.getTimezoneOffset(); return new Date(value.getTime() - offset * 60000).toISOString().slice(0, 10); }
function validDateRange(control: AbstractControl): ValidationErrors | null {
  const start = control.get('fechaInicio')?.value as Date | null;
  const end = control.get('fechaFin')?.value as Date | null;
  return start && end && end < start ? { dateRange: true } : null;
}
