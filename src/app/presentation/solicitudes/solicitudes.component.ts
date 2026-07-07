import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, FormControl, NonNullableFormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideArrowRight,
  lucideBoxes,
  lucideClipboardList,
  lucideFlaskConical,
  lucidePackageSearch,
  lucidePill,
  lucidePlus,
  lucideSearch,
  lucideSend,
  lucideTrash2,
  lucideWarehouse,
  lucideX,
} from '@ng-icons/lucide';
import { toast } from '@spartan-ng/brain/sonner';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmInput } from '@spartan-ng/helm/input';
import { HlmLabel } from '@spartan-ng/helm/label';
import { HlmSpinner } from '@spartan-ng/helm/spinner';
import { catchError, debounceTime, distinctUntilChanged, finalize, forkJoin, map, of, switchMap } from 'rxjs';
import { ArticuloCatalogo, ArticuloSolicitud, DatosSolicitud, NivelCaptura, UnidadSolicitud } from '../../domain/solicitudes/models/solicitud.model';
import { SolicitudesApiService } from '../../infrastructure/solicitudes/api/solicitudes-api.service';
import { CpmEditorRowDto, CpmExpectedRowDto, ExistenciaUnidadRowDto, TemporalExistenciaRowDto } from '../../infrastructure/solicitudes/api/solicitudes-api.contracts';
import { SolicitudDraftService } from '../../infrastructure/solicitudes/storage/solicitud-draft.service';
import { SearchableSelectComponent, SearchableSelectOption, SearchableSelectValue } from '../../shared/components/searchable-select/searchable-select.component';

type TipoPedido = 'Ordinario' | 'Extraordinario';

interface InventarioEstatalResumen {
  total: number;
  azm: number;
  aze: number;
  azt: number;
}

interface HomologoSugeridoResumen {
  clave: string;
  stock: number;
  almacen: string;
}

interface KitEntry {
  clave: string;
  descripcion: string;
  presentacion: string;
  cpm: number;
  existenciaUnidad: number;
  existenciaEstatal: number;
  existenciasAzm: number;
  existenciasAze: number;
  existenciasAzt: number;
  mejorAlmacen: string;
  recomendacionAbasto: string;
  mejorHomologoClave?: string;
  mejorHomologoStock: number;
  mejorHomologoAlmacen?: string;
  kits: string[];
}

interface CpmEntry {
  clave: string;
  descripcion: string;
  presentacion: string;
  cpm: number;
  existenciaUnidad: number;
  existenciaEstatal: number;
  existenciasAzm: number;
  existenciasAze: number;
  existenciasAzt: number;
  mejorAlmacen: string;
  recomendacionAbasto: string;
  mejorHomologoClave?: string;
  mejorHomologoStock: number;
  mejorHomologoAlmacen?: string;
}

@Component({
  selector: 'app-solicitudes',
  imports: [ReactiveFormsModule, NgIcon, HlmButton, HlmCardImports, HlmInput, HlmLabel, HlmSpinner, SearchableSelectComponent],
  templateUrl: './solicitudes.component.html',
  styleUrl: './solicitudes.component.scss',
  providers: [provideIcons({
    lucideArrowRight,
    lucideBoxes,
    lucideClipboardList,
    lucideFlaskConical,
    lucidePackageSearch,
    lucidePill,
    lucidePlus,
    lucideSearch,
    lucideSend,
    lucideTrash2,
    lucideWarehouse,
    lucideX,
  })],
})
export class SolicitudesComponent implements OnInit {
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly api = inject(SolicitudesApiService);
  private readonly drafts = inject(SolicitudDraftService);
  private readonly destroyRef = inject(DestroyRef);

  readonly tiposInsumo = ['Medicamento', 'Material de Curación', 'Mezclas', 'Otros'];
  readonly modos: { key: NivelCaptura; title: string; description: string }[] = [
    { key: 'PRIMER_NIVEL', title: 'Primer nivel', description: 'Captura enfocada en unidades de primer contacto y centros de salud.' },
    { key: 'SEGUNDO_NIVEL', title: 'Segundo nivel', description: 'Captura con apoyo de CPMs, KITs y revisión de claves hospitalarias.' },
  ];

  readonly modo = signal<NivelCaptura>('SEGUNDO_NIVEL');
  readonly unidades = signal<UnidadSolicitud[]>([]);
  readonly articulos = signal<ArticuloSolicitud[]>([]);
  readonly resultados = signal<ArticuloCatalogo[]>([]);
  readonly selectedArticle = signal<ArticuloCatalogo | null>(null);
  readonly loadingUnits = signal(false);
  readonly loadingContext = signal(false);
  readonly searching = signal(false);
  readonly saving = signal(false);
  readonly cpmModalVisible = signal(false);
  readonly kitModalVisible = signal(false);
  readonly mesesCoberturaCpm = signal(1);
  readonly mesesCoberturaKit = signal(1);
  readonly cpmFilter = signal('');
  readonly kitFilter = signal('');
  readonly kitSelected = signal<string>('');

  readonly cpmRows = signal<CpmEntry[]>([]);
  readonly kitRows = signal<KitEntry[]>([]);
  readonly kitCodes = signal<string[]>([]);
  readonly selectedCpmClaves = signal<Set<string>>(new Set());
  readonly selectedKitClaves = signal<Set<string>>(new Set());

  private readonly cpmMap = signal(new Map<string, number>());
  private readonly existenciasMap = signal(new Map<string, ExistenciaUnidadRowDto>());
  private readonly articleMap = signal(new Map<string, ArticuloCatalogo>());
  private readonly kitMap = signal(new Map<string, string[]>());
  private readonly homologosMap = signal(new Map<string, number>());
  private readonly homologosStockMap = signal(new Map<string, number>());
  private readonly bestHomologoMap = signal(new Map<string, HomologoSugeridoResumen>());
  private readonly inventarioEstatalMap = signal(new Map<string, InventarioEstatalResumen>());

  readonly totalPiezas = computed(() => this.articulos().reduce((sum, item) => sum + item.cantidad, 0));
  readonly selectedUnit = computed(() => this.datosForm.controls.unidad.value);
  readonly selectedUnitValue = computed(() => {
    const unit = this.selectedUnit();
    return unit ? String(unit.id) : null;
  });
  readonly unitOptions = computed<SearchableSelectOption[]>(() => this.unidades().map((unit) => ({
    label: `${unit.nombre} · ${unit.cluesimb}`,
    value: String(unit.id),
    keywords: `${unit.cluessa} ${unit.municipio} ${unit.localidad} ${unit.tipoUnidad ?? ''}`,
  })));

  readonly filteredCpmRows = computed(() => {
    const term = normalize(this.cpmFilter());
    return this.cpmRows().filter((row) => normalize(`${row.clave} ${row.descripcion} ${row.presentacion}`).includes(term));
  });

  readonly filteredKitRows = computed(() => {
    const term = normalize(this.kitFilter());
    return this.kitRows().filter((row) => {
      const matchesText = normalize(`${row.clave} ${row.descripcion} ${row.presentacion} ${(row.kits || []).join(' ')}`).includes(term);
      const matchesKit = !this.kitSelected() || row.kits.includes(this.kitSelected());
      return matchesText && matchesKit;
    });
  });

  readonly datosForm = this.formBuilder.group({
    unidad: new FormControl<UnidadSolicitud | null>(null, Validators.required),
    tipoInsumo: ['', Validators.required],
    tipoPedido: this.formBuilder.control<TipoPedido>('Ordinario', Validators.required),
    responsableCaptura: ['', [Validators.required, Validators.maxLength(150)]],
    fechaInicio: new FormControl<Date | null>(null, Validators.required),
    fechaFin: new FormControl<Date | null>(null, Validators.required),
  }, { validators: validDateRange });

  readonly articuloSearch = new FormControl('', { nonNullable: true });
  readonly articuloForm = this.formBuilder.group({
    cantidad: [1, [Validators.required, Validators.min(1), Validators.max(99999)]],
    observaciones: ['', Validators.maxLength(300)],
  });

  ngOnInit(): void {
    this.loadUnits();

    this.articuloSearch.valueChanges.pipe(
      takeUntilDestroyed(this.destroyRef),
      map((value) => value.trim()),
      debounceTime(250),
      distinctUntilChanged(),
      switchMap((query) => {
        if (query.length < 3 || !this.selectedUnit()) {
          this.resultados.set([]);
          return of(null);
        }

        this.searching.set(true);
        return this.api.buscarArticulos(query).pipe(
          switchMap((response) => {
            const claves = response.resultados.map((item) => item.clave);
            return this.api.getHomologosBatch(claves).pipe(
              map((homologos) => ({ response, homologos })),
              catchError(() => of({ response, homologos: { rows: [] } })),
            );
          }),
          finalize(() => this.searching.set(false)),
          catchError(() => {
            toast.error('No fue posible buscar claves para esta unidad.');
            return of(null);
          }),
        );
      }),
    ).subscribe((payload) => {
      if (!payload) {
        return;
      }

      const grouped = new Map<string, number>();
      const homologosStock = new Map<string, number>();
      const bestHomologos = new Map<string, HomologoSugeridoResumen>();
      for (const row of payload.homologos.rows ?? []) {
        const key = row.claveConsultada.trim().toUpperCase();
        grouped.set(key, (grouped.get(key) ?? 0) + 1);
        const candidato = row.candidato.trim().toUpperCase();
        const resumenCandidato = this.inventarioEstatalMap().get(candidato) ?? emptyInventarioEstatal();
        const existenciaCandidata = resumenCandidato.total;
        homologosStock.set(key, (homologosStock.get(key) ?? 0) + existenciaCandidata);
        const bestCurrent = bestHomologos.get(key);
        if (!bestCurrent || existenciaCandidata > bestCurrent.stock) {
          bestHomologos.set(key, {
            clave: candidato,
            stock: existenciaCandidata,
            almacen: pickBestAlmacen(resumenCandidato),
          });
        }
      }
      this.homologosMap.set(grouped);
      this.homologosStockMap.set(homologosStock);
      this.bestHomologoMap.set(bestHomologos);
      this.resultados.set(payload.response.resultados
        .map((item) => this.enrichArticulo(item))
        .sort(compareArticulos));
    });

    this.restore();
  }

  changeModo(mode: NivelCaptura): void {
    if (this.modo() === mode) {
      return;
    }

    this.modo.set(mode);
    this.datosForm.controls.unidad.setValue(null);
    this.resultados.set([]);
    this.selectedArticle.set(null);
    this.articuloSearch.setValue('');
    this.clearContext();
    this.loadUnits();
  }

  selectUnit(value: SearchableSelectValue): void {
    const unit = this.unidades().find((item) => String(item.id) === String(value)) ?? null;
    this.datosForm.controls.unidad.setValue(unit);
    this.persist();
    if (unit) {
      this.loadUnitContext(unit);
    } else {
      this.clearContext();
    }
  }

  setDate(control: 'fechaInicio' | 'fechaFin', value: string): void {
    this.datosForm.controls[control].setValue(value ? new Date(`${value}T00:00:00`) : null);
    this.persist();
  }

  dateValue(value: Date | null): string {
    return value ? localDate(value) : '';
  }

  pickArticle(article: ArticuloCatalogo): void {
    this.selectedArticle.set(article);
    this.articuloSearch.setValue(`${article.clave} · ${article.descripcion}`);
    this.resultados.set([]);
  }

  addArticle(): void {
    const selected = this.selectedArticle();
    if (!selected || this.articuloForm.invalid) {
      this.articuloForm.markAllAsTouched();
      return;
    }

    if (this.articulos().some((item) => normalizeKey(item.clave) === normalizeKey(selected.clave))) {
      toast.warning('Esta clave ya se encuentra en la solicitud.');
      return;
    }

    const { cantidad, observaciones } = this.articuloForm.getRawValue();
    this.articulos.update((items) => [...items, {
      ...selected,
      cantidad,
      observaciones: observaciones.trim(),
    }]);

    if ((selected.homologos ?? 0) > 0) {
      toast.info(`La clave ${selected.clave} tiene homólogos configurados.`, { description: 'Podremos aprovecharlos mejor cuando migremos el inventario estatal por almacén.' });
    }

    this.selectedArticle.set(null);
    this.articuloSearch.setValue('');
    this.articuloForm.reset({ cantidad: 1, observaciones: '' });
    this.persist();
  }

  updateQuantity(index: number, value: string): void {
    const quantity = Math.max(1, Math.min(99999, Number(value) || 1));
    this.articulos.update((items) => items.map((item, i) => i === index ? { ...item, cantidad: quantity } : item));
    this.persist();
  }

  updateNotes(index: number, value: string): void {
    this.articulos.update((items) => items.map((item, i) => i === index ? { ...item, observaciones: value.slice(0, 300) } : item));
    this.persist();
  }

  removeArticle(index: number): void {
    this.articulos.update((items) => items.filter((_, i) => i !== index));
    this.persist();
  }

  openCpmModal(): void {
    if (!this.selectedUnit()) {
      toast.warning('Selecciona primero una unidad.');
      return;
    }

    this.selectedCpmClaves.set(new Set());
    this.cpmFilter.set('');
    this.mesesCoberturaCpm.set(1);
    this.cpmModalVisible.set(true);
  }

  openKitModal(): void {
    if (!this.selectedUnit()) {
      toast.warning('Selecciona primero una unidad.');
      return;
    }

    this.selectedKitClaves.set(new Set());
    this.kitFilter.set('');
    this.kitSelected.set('');
    this.mesesCoberturaKit.set(1);
    this.kitModalVisible.set(true);
  }

  toggleCpmSelection(clave: string): void {
    this.selectedCpmClaves.update((current) => {
      const next = new Set(current);
      next.has(clave) ? next.delete(clave) : next.add(clave);
      return next;
    });
  }

  toggleKitSelection(clave: string): void {
    this.selectedKitClaves.update((current) => {
      const next = new Set(current);
      next.has(clave) ? next.delete(clave) : next.add(clave);
      return next;
    });
  }

  addSelectedCpm(): void {
    const selected = this.filteredCpmRows().filter((item) => this.selectedCpmClaves().has(item.clave));
    this.addSuggestedArticles(selected.map((item) => ({
      clave: item.clave,
      descripcion: item.descripcion,
      presentacion: item.presentacion,
      cantidad: computeSuggested(item.cpm, item.existenciaUnidad, this.mesesCoberturaCpm()),
    })));
    this.cpmModalVisible.set(false);
  }

  addSelectedKit(): void {
    const selected = this.filteredKitRows().filter((item) => this.selectedKitClaves().has(item.clave));
    this.addSuggestedArticles(selected.map((item) => ({
      clave: item.clave,
      descripcion: item.descripcion,
      presentacion: item.presentacion,
      cantidad: computeSuggested(item.cpm, item.existenciaUnidad, this.mesesCoberturaKit()),
    })));
    this.kitModalVisible.set(false);
  }

  submit(): void {
    if (this.datosForm.invalid || !this.articulos().length) {
      this.datosForm.markAllAsTouched();
      toast.warning('Completa los datos y agrega al menos un artículo.');
      return;
    }

    const datos = this.toData();
    if (!datos) {
      return;
    }

    this.saving.set(true);
    this.api.registrar(datos, this.articulos()).pipe(finalize(() => this.saving.set(false))).subscribe({
      next: (result) => {
        toast.success(result.deduped ? 'La solicitud ya había sido registrada hoy.' : 'Solicitud registrada correctamente.');
        this.drafts.clear();
      },
      error: () => toast.error('No fue posible registrar la solicitud. Tu borrador permanece guardado.'),
    });
  }

  clear(): void {
    this.datosForm.reset({
      tipoPedido: 'Ordinario',
      tipoInsumo: '',
      responsableCaptura: '',
      unidad: null,
      fechaInicio: null,
      fechaFin: null,
    });
    this.articulos.set([]);
    this.articuloSearch.setValue('');
    this.selectedArticle.set(null);
    this.resultados.set([]);
    this.clearContext();
    this.drafts.clear();
  }

  setMesesCoberturaCpm(value: string): void {
    this.mesesCoberturaCpm.set(Math.max(1, Number(value) || 1));
  }

  setMesesCoberturaKit(value: string): void {
    this.mesesCoberturaKit.set(Math.max(1, Number(value) || 1));
  }

  private loadUnits(): void {
    this.loadingUnits.set(true);
    this.api.getUnidades(this.modo()).pipe(finalize(() => this.loadingUnits.set(false))).subscribe({
      next: (units) => this.unidades.set(units),
      error: () => toast.error('No fue posible cargar las unidades para este nivel.'),
    });
  }

  private loadUnitContext(unit: UnidadSolicitud): void {
    this.loadingContext.set(true);
    forkJoin({
      articleMap: this.api.getArticulosByCluesimbCpm(unit.cluesimb).pipe(catchError(() => of({}))),
      cpmRows: this.api.getCpmByUnidadAll(unit.cluesimb).pipe(catchError(() => of([]))),
      expectedRows: this.api.getExpectedVs(unit.cluesimb).pipe(catchError(() => of([]))),
      existencias: this.api.getExistenciasByUnidad(unit.cluesimb).pipe(catchError(() => of({ rows: [] }))),
      inventarioEstatal: this.api.getExistenciasAlmacenesFull().pipe(catchError(() => of({ count: 0, rows: [] }))),
    }).pipe(finalize(() => this.loadingContext.set(false))).subscribe({
      next: ({ articleMap, cpmRows, expectedRows, existencias, inventarioEstatal }) => {
        const articleEntries = new Map<string, ArticuloCatalogo>(Object.entries(articleMap));
        const cpmMap = new Map(cpmRows.map((item) => [item.clave_cnis.toUpperCase(), Number(item.cpm ?? 0)]));
        const existenciasMap = new Map(existencias.rows.map((item) => [item.clave_cnis.toUpperCase(), item]));
        const inventarioEstatalMap = buildInventarioEstatalMap(inventarioEstatal.rows ?? []);
        const expectedGrouped = groupExpectedRows(expectedRows, articleEntries, existenciasMap, inventarioEstatalMap);

        this.articleMap.set(articleEntries);
        this.cpmMap.set(cpmMap);
        this.existenciasMap.set(existenciasMap);
        this.inventarioEstatalMap.set(inventarioEstatalMap);
        this.kitMap.set(new Map(expectedGrouped.map((item) => [item.clave, item.kits])));
        this.cpmRows.set(cpmRows.map((item) => {
          const key = item.clave_cnis.toUpperCase();
          const article = articleEntries.get(key);
          const inventory = inventarioEstatalMap.get(key) ?? emptyInventarioEstatal();
          return {
            clave: key,
            descripcion: article?.descripcion ?? key,
            presentacion: article?.presentacion ?? '',
            cpm: Number(item.cpm ?? 0),
            existenciaUnidad: Number(existenciasMap.get(key)?.existencia_total ?? 0),
            existenciaEstatal: inventory.total,
            existenciasAzm: inventory.azm,
            existenciasAze: inventory.aze,
            existenciasAzt: inventory.azt,
            mejorAlmacen: pickBestAlmacen(inventory),
            recomendacionAbasto: buildRecommendation(inventory),
            mejorHomologoStock: 0,
          };
        }).filter((item) => item.cpm > 0).sort(compareSuggestionRows));
        this.kitRows.set(expectedGrouped
          .map((item) => ({
            ...item,
            mejorAlmacen: pickBestAlmacen({
              total: item.existenciaEstatal,
              azm: item.existenciasAzm,
              aze: item.existenciasAze,
              azt: item.existenciasAzt,
            }),
            recomendacionAbasto: buildRecommendation({
              total: item.existenciaEstatal,
              azm: item.existenciasAzm,
              aze: item.existenciasAze,
              azt: item.existenciasAzt,
            }),
            mejorHomologoStock: 0,
          }))
          .sort(compareSuggestionRows));
        this.kitCodes.set([...new Set(expectedGrouped.flatMap((item) => item.kits))].sort((a, b) => a.localeCompare(b)));
        if (this.resultados().length > 0) {
          this.resultados.set(this.resultados().map((item) => this.enrichArticulo(item)).sort(compareArticulos));
        }
      },
      error: () => toast.error('No fue posible cargar el contexto de CPM/KIT para la unidad.'),
    });
  }

  private clearContext(): void {
    this.cpmRows.set([]);
    this.kitRows.set([]);
    this.kitCodes.set([]);
    this.articleMap.set(new Map());
    this.cpmMap.set(new Map());
    this.existenciasMap.set(new Map());
    this.kitMap.set(new Map());
    this.homologosMap.set(new Map());
    this.homologosStockMap.set(new Map());
    this.bestHomologoMap.set(new Map());
    this.inventarioEstatalMap.set(new Map());
  }

  private enrichArticulo(item: ArticuloCatalogo): ArticuloCatalogo {
    const key = item.clave.toUpperCase();
    const inventarioEstatal = this.inventarioEstatalMap().get(key) ?? emptyInventarioEstatal();
    const bestHomologo = this.bestHomologoMap().get(key);
    return {
      ...item,
      cpm: this.cpmMap().get(key) ?? 0,
      existenciaUnidad: Number(this.existenciasMap().get(key)?.existencia_total ?? 0),
      existenciaEstatal: inventarioEstatal.total,
      existenciasAzm: inventarioEstatal.azm,
      existenciasAze: inventarioEstatal.aze,
      existenciasAzt: inventarioEstatal.azt,
      enKit: this.kitMap().has(key),
      homologos: this.homologosMap().get(key) ?? 0,
      existenciaHomologosEstatal: this.homologosStockMap().get(key) ?? 0,
      mejorAlmacen: pickBestAlmacen(inventarioEstatal),
      recomendacionAbasto: buildArticleRecommendation(inventarioEstatal, bestHomologo),
      mejorHomologoClave: bestHomologo?.clave,
      mejorHomologoStock: bestHomologo?.stock ?? 0,
      mejorHomologoAlmacen: bestHomologo?.almacen,
    };
  }

  private addSuggestedArticles(rows: Array<ArticuloCatalogo & { cantidad: number }>): void {
    const existing = new Set(this.articulos().map((item) => normalizeKey(item.clave)));
    const next: ArticuloSolicitud[] = [];

    for (const row of rows) {
      if (!row.cantidad || row.cantidad <= 0 || existing.has(normalizeKey(row.clave))) {
        continue;
      }
      next.push({
        clave: row.clave,
        descripcion: row.descripcion,
        presentacion: row.presentacion,
        cantidad: row.cantidad,
        observaciones: '',
      });
      existing.add(normalizeKey(row.clave));
    }

    if (!next.length) {
      toast.warning('No hubo claves nuevas para agregar.');
      return;
    }

    this.articulos.update((items) => [...items, ...next]);
    this.persist();
    toast.success(`Se agregaron ${next.length} clave(s) a la solicitud.`);
  }

  private restore(): void {
    const draft = this.drafts.load();
    if (!draft) {
      return;
    }

    this.articulos.set(draft.articulos ?? []);
    if (draft.datos) {
      this.datosForm.patchValue({
        ...draft.datos,
        fechaInicio: new Date(`${draft.datos.fechaInicio}T00:00:00`),
        fechaFin: new Date(`${draft.datos.fechaFin}T00:00:00`),
      });
      const inferredMode = draft.datos.unidad?.esSegundoNivel ? 'SEGUNDO_NIVEL' : 'PRIMER_NIVEL';
      this.modo.set(inferredMode);
      this.loadUnits();
    }
  }

  persist(): void {
    this.drafts.save({ datos: this.toData(), articulos: this.articulos() });
  }

  private toData(): DatosSolicitud | null {
    const value = this.datosForm.getRawValue();
    if (!value.unidad || !value.fechaInicio || !value.fechaFin || !value.tipoInsumo || !value.responsableCaptura) {
      return null;
    }

    return {
      unidad: value.unidad,
      tipoInsumo: value.tipoInsumo,
      tipoPedido: value.tipoPedido,
      responsableCaptura: value.responsableCaptura.trim(),
      fechaInicio: localDate(value.fechaInicio),
      fechaFin: localDate(value.fechaFin),
    };
  }
}

function groupExpectedRows(
  rows: CpmExpectedRowDto[],
  articleEntries: Map<string, ArticuloCatalogo>,
  existenciasMap: Map<string, ExistenciaUnidadRowDto>,
  inventarioEstatalMap: Map<string, InventarioEstatalResumen>,
): KitEntry[] {
  const grouped = new Map<string, KitEntry>();

  for (const row of rows) {
    const clave = (row.clave_cnis ?? '').trim().toUpperCase();
    if (!clave) {
      continue;
    }

    const current = grouped.get(clave);
    const article = articleEntries.get(clave);
    const inventario = inventarioEstatalMap.get(clave) ?? emptyInventarioEstatal();
    const kits = Array.from(new Set([...(current?.kits ?? []), ...((row.kit_codigos ?? []).map((item) => item.trim()).filter(Boolean))]));
    const cpm = Number(row.cpm ?? current?.cpm ?? 0);

    grouped.set(clave, {
      clave,
      descripcion: article?.descripcion ?? current?.descripcion ?? clave,
      presentacion: article?.presentacion ?? current?.presentacion ?? '',
      cpm,
      existenciaUnidad: Number(existenciasMap.get(clave)?.existencia_total ?? 0),
      existenciaEstatal: inventario.total,
      existenciasAzm: inventario.azm,
      existenciasAze: inventario.aze,
      existenciasAzt: inventario.azt,
      mejorAlmacen: pickBestAlmacen(inventario),
      recomendacionAbasto: buildRecommendation(inventario),
      mejorHomologoStock: 0,
      kits,
    });
  }

  return [...grouped.values()].sort((a, b) => a.clave.localeCompare(b.clave));
}

function computeSuggested(cpm: number, existencia: number, meses: number): number {
  const target = Math.max(0, Math.ceil((cpm || 0) * Math.max(1, meses)));
  return Math.max(0, target - Math.max(0, existencia || 0));
}

function compareArticulos(a: ArticuloCatalogo, b: ArticuloCatalogo): number {
  return compareSuggestionRows(
    {
      clave: a.clave,
      cpm: a.cpm ?? 0,
      existenciaUnidad: a.existenciaUnidad ?? 0,
      existenciaEstatal: a.existenciaEstatal ?? 0,
      mejorHomologoStock: a.mejorHomologoStock ?? 0,
    },
    {
      clave: b.clave,
      cpm: b.cpm ?? 0,
      existenciaUnidad: b.existenciaUnidad ?? 0,
      existenciaEstatal: b.existenciaEstatal ?? 0,
      mejorHomologoStock: b.mejorHomologoStock ?? 0,
    },
  );
}

function compareSuggestionRows(
  a: Pick<CpmEntry, 'cpm' | 'existenciaUnidad' | 'existenciaEstatal' | 'mejorHomologoStock' | 'clave'>,
  b: Pick<CpmEntry, 'cpm' | 'existenciaUnidad' | 'existenciaEstatal' | 'mejorHomologoStock' | 'clave'>,
): number {
  const shortageA = computeSuggested(a.cpm, a.existenciaUnidad, 1);
  const shortageB = computeSuggested(b.cpm, b.existenciaUnidad, 1);
  const fallbackStockA = Math.max(a.existenciaEstatal, a.mejorHomologoStock ?? 0);
  const fallbackStockB = Math.max(b.existenciaEstatal, b.mejorHomologoStock ?? 0);

  return (
    (shortageB - shortageA) ||
    (fallbackStockB - fallbackStockA) ||
    ((b.cpm ?? 0) - (a.cpm ?? 0)) ||
    a.clave.localeCompare(b.clave)
  );
}

function buildArticleRecommendation(
  inventario: InventarioEstatalResumen,
  bestHomologo?: HomologoSugeridoResumen,
): string {
  if (inventario.total > 0) {
    return buildRecommendation(inventario);
  }

  if (bestHomologo && bestHomologo.stock > 0) {
    return `Considerar homólogo ${bestHomologo.clave} desde ${bestHomologo.almacen} (${bestHomologo.stock} piezas).`;
  }

  return 'Sin stock estatal visible por ahora.';
}

function buildRecommendation(inventario: InventarioEstatalResumen): string {
  if (inventario.total <= 0) {
    return 'Sin stock estatal visible por ahora.';
  }

  const almacen = pickBestAlmacen(inventario);
  return almacen !== 'Sin preferencia'
    ? `Priorizar surtimiento desde ${almacen}.`
    : 'Hay stock estatal, sin almacén dominante claro.';
}

function pickBestAlmacen(inventario: InventarioEstatalResumen): string {
  const ranking = [
    ['AZM', inventario.azm],
    ['AZE', inventario.aze],
    ['AZT', inventario.azt],
  ] as const;

  const best = [...ranking].sort((a, b) => b[1] - a[1])[0];
  return best && best[1] > 0 ? best[0] : 'Sin preferencia';
}

function buildInventarioEstatalMap(rows: TemporalExistenciaRowDto[]): Map<string, InventarioEstatalResumen> {
  const grouped = new Map<string, InventarioEstatalResumen>();

  for (const row of rows) {
    const clave = normalizeKey(row.clave_cnis ?? '');
    if (!clave) {
      continue;
    }

    const current = grouped.get(clave) ?? emptyInventarioEstatal();
    const next = { ...current };
    const existencia = Math.max(0, Number(row.existencia ?? 0));
    const alias = normalizeKey(row.alias_sas ?? '');

    next.total += existencia;
    if (alias === 'AZM') {
      next.azm += existencia;
    } else if (alias === 'AZE') {
      next.aze += existencia;
    } else if (alias === 'AZT') {
      next.azt += existencia;
    }

    grouped.set(clave, next);
  }

  return grouped;
}

function emptyInventarioEstatal(): InventarioEstatalResumen {
  return {
    total: 0,
    azm: 0,
    aze: 0,
    azt: 0,
  };
}

function normalize(value: string): string {
  return value.toLocaleLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

function normalizeKey(value: string): string {
  return value.replace(/\./g, '').trim().toUpperCase();
}

function localDate(value: Date): string {
  const offset = value.getTimezoneOffset();
  return new Date(value.getTime() - offset * 60000).toISOString().slice(0, 10);
}

function validDateRange(control: AbstractControl): ValidationErrors | null {
  const start = control.get('fechaInicio')?.value as Date | null;
  const end = control.get('fechaFin')?.value as Date | null;
  return start && end && end < start ? { dateRange: true } : null;
}
