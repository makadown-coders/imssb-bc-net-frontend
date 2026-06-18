import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { Observable, finalize } from 'rxjs';
import {
  Localidad,
  Municipio,
  TipoUnidad,
  Tipologia,
  TipologiaUnidad,
  UnidadMedica,
} from '../../../domain/catalogos/models/catalogo.model';
import {
  CatalogosApiService,
  LocalidadRequest,
  MunicipioRequest,
  TipoUnidadRequest,
  TipologiaRequest,
  TipologiaUnidadRequest,
  UnidadMedicaRequest,
} from '../../../infrastructure/catalogos/api/catalogos-api.service';
import { CatalogoFormDialogComponent } from './catalogo-form-dialog.component';
import { UnidadMedicaDialogComponent } from './unidad-medica-dialog.component';

type CatalogKey =
  | 'tipo-unidad'
  | 'municipios'
  | 'localidades'
  | 'unidades-medicas'
  | 'tipologias'
  | 'tipologias-unidad';

type CatalogRow = TipoUnidad | Municipio | Localidad | UnidadMedica | Tipologia | TipologiaUnidad;

interface CatalogColumn {
  key: string;
  label: string;
  type?: 'boolean' | 'date';
}

interface CatalogField {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'boolean' | 'select';
  required?: boolean;
  maxLength?: number;
  optionsKey?: 'municipios' | 'tiposUnidad' | 'localidades' | 'unidadesMedicas' | 'tipologias';
}

interface CatalogDefinition {
  key: CatalogKey;
  label: string;
  icon: string;
  addLabel: string;
  description: string;
  columns: CatalogColumn[];
  fields: CatalogField[];
  searchPlaceholder?: string;
}

@Component({
  selector: 'app-admin-catalogos',
  imports: [
    DatePipe,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatSnackBarModule,
    MatTabsModule,
  ],
  templateUrl: './admin-catalogos.component.html',
  styleUrl: './admin-catalogos.component.scss',
})
export class AdminCatalogosComponent implements OnInit {
  private readonly api = inject(CatalogosApiService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  readonly definitions: CatalogDefinition[] = [
    {
      key: 'tipo-unidad',
      label: 'Tipos de unidad',
      icon: 'category',
      addLabel: 'Nuevo tipo',
      description: 'Clasificación operativa de unidades médicas.',
      searchPlaceholder: 'Buscar tipo',
      columns: [{ key: 'nombreTipo', label: 'Tipo' }],
      fields: [{ key: 'nombreTipo', label: 'Tipo', type: 'text', required: true, maxLength: 100 }],
    },
    {
      key: 'municipios',
      label: 'Municipios',
      icon: 'map',
      addLabel: 'Nuevo municipio',
      description: 'Catálogo municipal para ubicar localidades.',
      searchPlaceholder: 'Buscar municipio',
      columns: [{ key: 'nombreMunicipio', label: 'Municipio' }],
      fields: [{ key: 'nombreMunicipio', label: 'Municipio', type: 'text', required: true, maxLength: 100 }],
    },
    {
      key: 'localidades',
      label: 'Localidades',
      icon: 'pin_drop',
      addLabel: 'Nueva localidad',
      description: 'Localidades vinculadas a municipios.',
      searchPlaceholder: 'Buscar localidad',
      columns: [
        { key: 'nombreLocalidad', label: 'Localidad' },
        { key: 'nombreMunicipio', label: 'Municipio' },
      ],
      fields: [
        { key: 'nombreLocalidad', label: 'Localidad', type: 'text', required: true, maxLength: 150 },
        { key: 'municipioId', label: 'Municipio', type: 'select', optionsKey: 'municipios' },
      ],
    },
    {
      key: 'unidades-medicas',
      label: 'Unidades médicas',
      icon: 'local_hospital',
      addLabel: 'Nueva unidad',
      description: 'Directorio de unidades y sus relaciones geográficas.',
      searchPlaceholder: 'Buscar por nombre o CLUES',
      columns: [
        { key: 'nombre', label: 'Unidad médica' },
        { key: 'cluesimb', label: 'CLUES IMB' },
        { key: 'nombreTipoUnidad', label: 'Tipo' },
        { key: 'nombreLocalidad', label: 'Localidad' },
        { key: 'activo', label: 'Activa', type: 'boolean' },
      ],
      fields: [
        { key: 'nombre', label: 'Nombre', type: 'text', required: true, maxLength: 255 },
        { key: 'cluessa', label: 'CLUES SSA', type: 'text', maxLength: 20 },
        { key: 'cluesimb', label: 'CLUES IMB', type: 'text', maxLength: 20 },
        { key: 'direccion', label: 'Dirección', type: 'textarea' },
        { key: 'latitud', label: 'Latitud', type: 'number' },
        { key: 'longitud', label: 'Longitud', type: 'number' },
        { key: 'estratoUnidad', label: 'Estrato', type: 'text', maxLength: 10 },
        { key: 'nivelAtencion', label: 'Nivel de atención', type: 'text', maxLength: 30 },
        { key: 'tipoUnidadId', label: 'Tipo de unidad', type: 'select', optionsKey: 'tiposUnidad' },
        { key: 'localidadId', label: 'Localidad', type: 'select', optionsKey: 'localidades' },
        { key: 'activo', label: 'Activa', type: 'boolean' },
      ],
    },
    {
      key: 'tipologias',
      label: 'Tipologías',
      icon: 'schema',
      addLabel: 'Nueva tipología',
      description: 'Catálogo de tipologías aplicables a unidades.',
      searchPlaceholder: 'Buscar tipología',
      columns: [
        { key: 'nombre', label: 'Tipología' },
        { key: 'esSegundoNivel', label: 'Segundo nivel', type: 'boolean' },
      ],
      fields: [
        { key: 'nombre', label: 'Tipología', type: 'text', required: true },
        { key: 'esSegundoNivel', label: 'Segundo nivel', type: 'boolean' },
      ],
    },
    {
      key: 'tipologias-unidad',
      label: 'Tipología por unidad',
      icon: 'hub',
      addLabel: 'Nueva asignación',
      description: 'Asignación 1 a 1 de tipología para cada unidad médica.',
      columns: [
        { key: 'nombreUnidadMedica', label: 'Unidad médica' },
        { key: 'nombreTipologia', label: 'Tipología' },
        { key: 'fuente', label: 'Fuente' },
        { key: 'creadoEn', label: 'Creado', type: 'date' },
      ],
      fields: [
        { key: 'unidadMedicaId', label: 'Unidad médica', type: 'select', required: true, optionsKey: 'unidadesMedicas' },
        { key: 'tipologiaId', label: 'Tipología', type: 'select', required: true, optionsKey: 'tipologias' },
        { key: 'fuente', label: 'Fuente', type: 'text' },
      ],
    },
  ];

  readonly activeIndex = signal(0);
  readonly rows = signal<CatalogRow[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly q = signal('');
  readonly tiposUnidad = signal<TipoUnidad[]>([]);
  readonly municipios = signal<Municipio[]>([]);
  readonly localidades = signal<Localidad[]>([]);
  readonly unidadesMedicas = signal<UnidadMedica[]>([]);
  readonly tipologias = signal<Tipologia[]>([]);

  readonly definition = computed(() => this.definitions[this.activeIndex()]);
  readonly usesDialogForm = computed(() => this.definition().key === 'unidades-medicas');

  ngOnInit(): void {
    this.loadReferences();
    this.loadRows();
  }

  onTabChange(index: number): void {
    this.activeIndex.set(index);
    this.q.set('');
    this.loadRows();
  }

  search(value: string): void {
    this.q.set(value);
    this.loadRows();
  }

  startCreate(): void {
    if (this.usesDialogForm()) {
      this.openUnidadMedicaDialog(null);
      return;
    }

    this.openCatalogoDialog(null);
  }

  edit(row: CatalogRow): void {
    if (this.definition().key === 'unidades-medicas') {
      this.openUnidadMedicaDialog(row as UnidadMedica);
      return;
    }

    this.openCatalogoDialog(row);
  }

  remove(row: CatalogRow): void {
    const id = (row as { id: number }).id;
    if (!window.confirm('¿Eliminar este registro?')) {
      return;
    }

    this.saving.set(true);
    this.delete(id)
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.snackBar.open('Registro eliminado', 'Cerrar', { duration: 2800 });
          this.loadReferences();
          this.loadRows();
        },
        error: () => this.snackBar.open('No fue posible eliminar el registro', 'Cerrar', { duration: 3500 }),
      });
  }

  value(row: CatalogRow, column: CatalogColumn): unknown {
    return (row as unknown as Record<string, unknown>)[column.key];
  }

  dateValue(row: CatalogRow, column: CatalogColumn): string | number | Date | null {
    const value = this.value(row, column);
    return value instanceof Date || typeof value === 'string' || typeof value === 'number' ? value : null;
  }

  optionsFor(field: CatalogField): Array<{ id: number; label: string }> {
    switch (field.optionsKey) {
      case 'municipios':
        return this.municipios().map((item) => ({ id: item.id, label: item.nombreMunicipio }));
      case 'tiposUnidad':
        return this.tiposUnidad().map((item) => ({ id: item.id, label: item.nombreTipo }));
      case 'localidades':
        return this.localidades().map((item) => ({
          id: item.id,
          label: item.nombreMunicipio ? `${item.nombreLocalidad} · ${item.nombreMunicipio}` : item.nombreLocalidad,
        }));
      case 'unidadesMedicas':
        return this.unidadesMedicas().map((item) => ({ id: item.id, label: item.nombre }));
      case 'tipologias':
        return this.tipologias().map((item) => ({ id: item.id, label: item.nombre }));
      default:
        return [];
    }
  }

  private loadReferences(): void {
    this.api.getTiposUnidad().subscribe((items) => this.tiposUnidad.set(items));
    this.api.getMunicipios().subscribe((items) => this.municipios.set(items));
    this.api.getLocalidades().subscribe((items) => this.localidades.set(items));
    this.api.getUnidadesMedicas({ activo: true }).subscribe((items) => this.unidadesMedicas.set(items));
    this.api.getTipologias().subscribe((items) => this.tipologias.set(items));
  }

  private openCatalogoDialog(row: CatalogRow | null): void {
    const id = (row as { id?: number } | null)?.id;
    this.dialog
      .open(CatalogoFormDialogComponent, {
        width: '560px',
        maxWidth: '94vw',
        data: {
          title: id ? `Editar ${this.definition().label}` : this.definition().addLabel,
          fields: this.definition().fields,
          row: row as unknown as Record<string, unknown> | null,
          options: {
            municipios: this.optionsForKey('municipios'),
            tiposUnidad: this.optionsForKey('tiposUnidad'),
            localidades: this.optionsForKey('localidades'),
            unidadesMedicas: this.optionsForKey('unidadesMedicas'),
            tipologias: this.optionsForKey('tipologias'),
          },
        },
      })
      .afterClosed()
      .subscribe((values: Record<string, unknown> | undefined) => {
        if (!values) {
          return;
        }

        this.saving.set(true);
        const request$ = id ? this.update(id, values) : this.create(values);
        request$.pipe(finalize(() => this.saving.set(false))).subscribe({
          next: () => {
            this.snackBar.open(id ? 'Registro actualizado' : 'Registro creado', 'Cerrar', { duration: 2800 });
            this.loadReferences();
            this.loadRows();
          },
          error: () => this.snackBar.open('No fue posible guardar el registro', 'Cerrar', { duration: 3500 }),
        });
      });
  }

  private optionsForKey(key: NonNullable<CatalogField['optionsKey']>): Array<{ id: number; label: string }> {
    return this.optionsFor({ key, label: key, type: 'select', optionsKey: key });
  }

  private openUnidadMedicaDialog(unidad: UnidadMedica | null): void {
    this.dialog
      .open(UnidadMedicaDialogComponent, {
        width: '920px',
        maxWidth: '96vw',
        disableClose: true,
        data: {
          unidad,
          tiposUnidad: this.tiposUnidad(),
          localidades: this.localidades(),
        },
      })
      .afterClosed()
      .subscribe((payload: UnidadMedicaRequest | undefined) => {
        if (!payload) {
          return;
        }

        this.saving.set(true);
        const request$: Observable<unknown> = unidad
          ? this.api.updateUnidadMedica(unidad.id, payload)
          : this.api.createUnidadMedica(payload);

        request$.pipe(finalize(() => this.saving.set(false))).subscribe({
          next: () => {
            this.snackBar.open(unidad ? 'Unidad médica actualizada' : 'Unidad médica creada', 'Cerrar', {
              duration: 2800,
            });
            this.loadReferences();
            this.loadRows();
          },
          error: () => this.snackBar.open('No fue posible guardar la unidad médica', 'Cerrar', { duration: 3500 }),
        });
      });
  }

  loadRows(): void {
    this.loading.set(true);
    const q = this.q().trim();

    const request$: Observable<CatalogRow[]> = (() => {
      switch (this.definition().key) {
        case 'tipo-unidad':
          return this.api.getTiposUnidad(q);
        case 'municipios':
          return this.api.getMunicipios(q);
        case 'localidades':
          return this.api.getLocalidades({ q });
        case 'unidades-medicas':
          return this.api.getUnidadesMedicas({ q, activo: null });
        case 'tipologias':
          return this.api.getTipologias(q);
        case 'tipologias-unidad':
          return this.api.getTipologiasUnidad();
      }
    })();

    request$.pipe(finalize(() => this.loading.set(false))).subscribe({
      next: (items) => this.rows.set(items),
      error: () => this.snackBar.open('No fue posible cargar el catálogo', 'Cerrar', { duration: 3500 }),
    });
  }

  private create(values: Record<string, unknown>): Observable<unknown> {
    switch (this.definition().key) {
      case 'tipo-unidad':
        return this.api.createTipoUnidad(this.tipoUnidadPayload(values));
      case 'municipios':
        return this.api.createMunicipio(this.municipioPayload(values));
      case 'localidades':
        return this.api.createLocalidad(this.localidadPayload(values));
      case 'unidades-medicas':
        return this.api.createUnidadMedica(this.unidadMedicaPayload(values));
      case 'tipologias':
        return this.api.createTipologia(this.tipologiaPayload(values));
      case 'tipologias-unidad':
        return this.api.createTipologiaUnidad(this.tipologiaUnidadPayload(values));
    }
  }

  private update(id: number, values: Record<string, unknown>): Observable<unknown> {
    switch (this.definition().key) {
      case 'tipo-unidad':
        return this.api.updateTipoUnidad(id, this.tipoUnidadPayload(values));
      case 'municipios':
        return this.api.updateMunicipio(id, this.municipioPayload(values));
      case 'localidades':
        return this.api.updateLocalidad(id, this.localidadPayload(values));
      case 'unidades-medicas':
        return this.api.updateUnidadMedica(id, this.unidadMedicaPayload(values));
      case 'tipologias':
        return this.api.updateTipologia(id, this.tipologiaPayload(values));
      case 'tipologias-unidad':
        return this.api.updateTipologiaUnidad(id, this.tipologiaUnidadPayload(values));
    }
  }

  private delete(id: number): Observable<unknown> {
    switch (this.definition().key) {
      case 'tipo-unidad':
        return this.api.deleteTipoUnidad(id);
      case 'municipios':
        return this.api.deleteMunicipio(id);
      case 'localidades':
        return this.api.deleteLocalidad(id);
      case 'unidades-medicas':
        return this.api.deleteUnidadMedica(id);
      case 'tipologias':
        return this.api.deleteTipologia(id);
      case 'tipologias-unidad':
        return this.api.deleteTipologiaUnidad(id);
    }
  }

  private tipoUnidadPayload(values: Record<string, unknown>): TipoUnidadRequest {
    return { nombreTipo: this.text(values, 'nombreTipo') };
  }

  private municipioPayload(values: Record<string, unknown>): MunicipioRequest {
    return { nombreMunicipio: this.text(values, 'nombreMunicipio') };
  }

  private localidadPayload(values: Record<string, unknown>): LocalidadRequest {
    return {
      nombreLocalidad: this.text(values, 'nombreLocalidad'),
      municipioId: this.numberOrNull(values, 'municipioId'),
    };
  }

  private unidadMedicaPayload(values: Record<string, unknown>): UnidadMedicaRequest {
    return {
      cluessa: this.textOrNull(values, 'cluessa'),
      cluesimb: this.textOrNull(values, 'cluesimb'),
      nombre: this.text(values, 'nombre'),
      direccion: this.textOrNull(values, 'direccion'),
      latitud: this.numberOrNull(values, 'latitud'),
      longitud: this.numberOrNull(values, 'longitud'),
      estratoUnidad: this.textOrNull(values, 'estratoUnidad'),
      nivelAtencion: this.textOrNull(values, 'nivelAtencion'),
      tipoUnidadId: this.numberOrNull(values, 'tipoUnidadId'),
      localidadId: this.numberOrNull(values, 'localidadId'),
      activo: Boolean(values['activo']),
    };
  }

  private tipologiaPayload(values: Record<string, unknown>): TipologiaRequest {
    return {
      nombre: this.text(values, 'nombre'),
      esSegundoNivel: Boolean(values['esSegundoNivel']),
    };
  }

  private tipologiaUnidadPayload(values: Record<string, unknown>): TipologiaUnidadRequest {
    return {
      unidadMedicaId: this.numberOrNull(values, 'unidadMedicaId') ?? 0,
      tipologiaId: this.numberOrNull(values, 'tipologiaId') ?? 0,
      fuente: this.textOrNull(values, 'fuente'),
    };
  }

  private text(values: Record<string, unknown>, key: string): string {
    return String(values[key] ?? '').trim();
  }

  private textOrNull(values: Record<string, unknown>, key: string): string | null {
    const value = this.text(values, key);
    return value ? value : null;
  }

  private numberOrNull(values: Record<string, unknown>, key: string): number | null {
    const value = values[key];
    if (value === null || value === undefined || value === '') {
      return null;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
}
