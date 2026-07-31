import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideArchive,
  lucideBoxes,
  lucideChevronLeft,
  lucideChevronRight,
  lucideLayers3,
  lucidePencil,
  lucidePlus,
  lucideRefreshCw,
  lucideSearch,
  lucideX,
} from '@ng-icons/lucide';
import { NgFastToastService } from 'ng-fast-toast';
import { finalize, Observable } from 'rxjs';
import { CatalogoSiciliaApiService } from '../../../infrastructure/ib-onco/catalogo-sicilia-api.service';
import {
  CatalogoSiciliaPage,
  CatalogoSiciliaRow,
  CatalogoSiciliaTipo,
  OncoClase,
  OncoClasePayload,
  OncoSubclasePayload,
} from '../../../models/ib-onco/catalogo-sicilia.model';

type EstadoFiltro = 'activos' | 'inactivos' | 'todos';

@Component({
  selector: 'app-catalogo-sicilia',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NgIcon],
  templateUrl: './catalogo-sicilia.component.html',
  styleUrl: './catalogo-sicilia.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    provideIcons({
      lucideArchive,
      lucideBoxes,
      lucideChevronLeft,
      lucideChevronRight,
      lucideLayers3,
      lucidePencil,
      lucidePlus,
      lucideRefreshCw,
      lucideSearch,
      lucideX,
    }),
  ],
})
export class CatalogoSiciliaComponent {
  private readonly api = inject(CatalogoSiciliaApiService);
  private readonly toast = inject(NgFastToastService);
  private readonly formBuilder = inject(FormBuilder);

  readonly tipo = signal<CatalogoSiciliaTipo>('clases');
  readonly estado = signal<EstadoFiltro>('activos');
  readonly query = signal('');
  readonly page = signal(1);
  readonly pageSize = signal(20);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly rows = signal<CatalogoSiciliaRow[]>([]);
  readonly total = signal(0);
  readonly totalPages = signal(0);
  readonly formOpen = signal(false);
  readonly formMessage = signal<string | null>(null);
  readonly editing = signal<CatalogoSiciliaRow | null>(null);
  readonly deactivateTarget = signal<CatalogoSiciliaRow | null>(null);

  readonly title = computed(() => this.tipo() === 'clases' ? 'Clases oncológicas' : 'Subclases oncológicas');
  readonly subtitle = computed(() => this.tipo() === 'clases'
    ? 'Prioridades y factores de stock del archivo Sicilia.'
    : 'Clasificaciones clínicas independientes para captura operativa.');
  readonly showingFrom = computed(() => this.total() === 0 ? 0 : (this.page() - 1) * this.pageSize() + 1);
  readonly showingTo = computed(() => Math.min(this.total(), this.showingFrom() + this.rows().length - 1));

  readonly form = this.formBuilder.nonNullable.group({
    codigo: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(10)]],
    nombre: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(100)]],
    descripcion: [''],
    stockFactor: this.formBuilder.control<number | null>(null, [Validators.min(0)]),
    activo: [true],
  });

  constructor() {
    this.load();
  }

  selectTipo(tipo: CatalogoSiciliaTipo): void {
    if (tipo === this.tipo()) return;
    this.tipo.set(tipo);
    this.page.set(1);
    this.configureValidators();
    this.load();
  }

  submitSearch(): void {
    this.page.set(1);
    this.load();
  }

  setQuery(value: string): void {
    this.query.set(value);
  }

  setEstado(value: string): void {
    this.estado.set(value as EstadoFiltro);
    this.page.set(1);
    this.load();
  }

  goToPage(page: number): void {
    if (page < 1 || page > Math.max(this.totalPages(), 1) || page === this.page()) return;
    this.page.set(page);
    this.load();
  }

  openCreate(): void {
    this.editing.set(null);
    this.formMessage.set(null);
    this.form.reset({
      codigo: '',
      nombre: '',
      descripcion: '',
      stockFactor: null,
      activo: true,
    });
    this.configureValidators();
    this.formOpen.set(true);
  }

  openEdit(row: CatalogoSiciliaRow): void {
    this.editing.set(row);
    this.formMessage.set(null);
    this.form.reset({
      codigo: row.codigo,
      nombre: row.nombre,
      descripcion: row.descripcion ?? '',
      stockFactor: this.isClase(row) ? row.stockFactor : null,
      activo: row.activo,
    });
    this.configureValidators();
    this.formOpen.set(true);
  }

  closeForm(): void {
    if (!this.saving()) this.formOpen.set(false);
  }

  save(): void {
    this.form.markAllAsTouched();
    this.formMessage.set(null);
    if (this.saving()) return;
    if (this.form.invalid) {
      this.formMessage.set('Revisa los campos señalados antes de guardar.');
      return;
    }

    const value = this.form.getRawValue();
    const basePayload = {
      codigo: value.codigo.trim(),
      nombre: value.nombre.trim(),
      descripcion: value.descripcion.trim() || null,
      activo: value.activo,
    };
    const current = this.editing();
    let request$: Observable<CatalogoSiciliaRow>;

    if (this.tipo() === 'clases') {
      const payload: OncoClasePayload = { ...basePayload, stockFactor: value.stockFactor };
      request$ = current
        ? this.api.updateClase(current.id, payload)
        : this.api.createClase(payload);
    } else {
      const payload: OncoSubclasePayload = basePayload;
      request$ = current
        ? this.api.updateSubclase(current.id, payload)
        : this.api.createSubclase(payload);
    }

    this.saving.set(true);
    request$.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: () => {
        this.formOpen.set(false);
        this.formMessage.set(null);
        this.toast.success({
          title: current ? 'Registro actualizado' : 'Registro creado',
          content: `${basePayload.codigo} se guardó correctamente.`,
          duration: 4,
        });
        this.load();
      },
      error: (error) => {
        const message = this.errorMessage(error);
        this.formMessage.set(message);
        this.toast.error({
          title: 'No fue posible guardar',
          content: message,
          duration: 7,
        });
      },
    });
  }

  requestDeactivate(row: CatalogoSiciliaRow): void {
    this.deactivateTarget.set(row);
  }

  confirmDeactivate(): void {
    const target = this.deactivateTarget();
    if (!target || this.saving()) return;

    const request$ = this.tipo() === 'clases'
      ? this.api.deactivateClase(target.id)
      : this.api.deactivateSubclase(target.id);

    this.saving.set(true);
    request$.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: () => {
        this.deactivateTarget.set(null);
        this.toast.success({
          title: 'Registro desactivado',
          content: `${target.codigo} ya no está activo.`,
          duration: 4,
        });
        this.load();
      },
      error: (error) => this.toast.error({
        title: 'No fue posible desactivar',
        content: this.errorMessage(error),
        duration: 7,
      }),
    });
  }

  cancelDeactivate(): void {
    if (!this.saving()) this.deactivateTarget.set(null);
  }

  isClase(row: CatalogoSiciliaRow): row is OncoClase {
    return 'stockFactor' in row;
  }

  fieldError(field: 'codigo' | 'nombre' | 'stockFactor'): string | null {
    const control = this.form.controls[field];
    if (!control.touched || !control.errors) return null;
    if (control.errors['required'] || control.errors['pattern']) return field === 'codigo' ? 'El código es requerido.' : 'El nombre es requerido.';
    if (control.errors['maxlength']) return `Máximo ${control.errors['maxlength'].requiredLength} caracteres.`;
    if (control.errors['min']) return 'El factor debe ser mayor o igual a cero.';
    return null;
  }

  load(): void {
    this.loading.set(true);
    const query = {
      q: this.query(),
      activo: this.estado() === 'todos' ? undefined : this.estado() === 'activos',
      page: this.page(),
      pageSize: this.pageSize(),
    };
    const request$: Observable<CatalogoSiciliaPage<CatalogoSiciliaRow>> = this.tipo() === 'clases'
      ? this.api.listClases(query)
      : this.api.listSubclases(query);

    request$.pipe(finalize(() => this.loading.set(false))).subscribe({
      next: (response) => {
        this.rows.set(response.rows);
        this.total.set(response.total);
        this.totalPages.set(response.totalPages);
      },
      error: (error) => this.toast.error({
        title: 'No fue posible cargar el catálogo',
        content: this.errorMessage(error),
        duration: 7,
      }),
    });
  }

  private configureValidators(): void {
    const clase = this.tipo() === 'clases';
    this.form.controls.codigo.setValidators([Validators.required, Validators.pattern(/\S/), Validators.maxLength(clase ? 10 : 20)]);
    this.form.controls.nombre.setValidators([Validators.required, Validators.pattern(/\S/), Validators.maxLength(clase ? 100 : 150)]);
    this.form.controls.codigo.updateValueAndValidity();
    this.form.controls.nombre.updateValueAndValidity();
  }

  private errorMessage(error: {
    error?: {
      detail?: string;
      title?: string;
      errors?: Record<string, string[]>;
    };
  }): string {
    const validationMessage = Object.values(error?.error?.errors ?? {}).flat()[0];
    return validationMessage
      ?? error?.error?.detail
      ?? error?.error?.title
      ?? 'Ocurrió un error al procesar la solicitud.';
  }
}
