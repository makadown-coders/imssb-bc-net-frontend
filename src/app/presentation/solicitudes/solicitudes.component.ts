// src/app/features/solicitudes/solicitudes.component.ts
import { ArticuloSolicitud } from '../../models/articulo-solicitud';
import { Component, OnInit, ViewChildren, QueryList, ElementRef, HostListener,
  ViewChild, inject, ChangeDetectorRef, AfterViewInit,
  ChangeDetectionStrategy, OnDestroy, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { debounceTime, firstValueFrom, map, Subject, takeUntil } from 'rxjs';
import { CommonModule } from '@angular/common';
import { NombrarArchivoModalComponent } from '../../shared/nombrar-archivo-modal/nombrar-archivo-modal.component';
import { ConfirmacionModalComponent } from '../../shared/confirmacion-modal/confirmacion-modal.component';
import { DatosClues } from '../../models/datos-clues';
import { Router, RouterModule } from '@angular/router';
import { Inventario, InventarioDisponibles } from '../../models/Inventario';
import { ModoCapturaSolicitud } from '../../shared/modo-captura-solicitud';
import { CPMS } from '../../models/CPMS';
import { Nivel } from '../../models/feature-flags.model';
import { CpmRowLite } from '../../models/CpmExpectedRow';
import { EnrichedProps } from '../../models/EnrichedProps';
import { NgFastToastService } from 'ng-fast-toast';
import { KitModalComponent } from './kit-modal/kit-modal.component';
import { CpmUnionRow } from '../../models/CpmUnionRow';
import { CpmModalComponent } from './cpm-modal/cpm-modal.component';
import { CpmEditModalComponent } from './cpm-edit-modal/cpm-edit-modal.component';
import { aplicarFactorConversion } from '../../models';
import { HomologoSugerenciaModalComponent } from './homologo-sugerencia-modal/homologo-sugerencia-modal.component';
import { HomologoResumenImportacionComponent } from './homologo-resumen-importacion/homologo-resumen-importacion.component';
import { TablaArticulosComponent } from './tabla-articulos/tabla-articulos.component';
import { ArticulosService } from '../../infrastructure/articulos.service';
import { CpmEditorService } from '../../infrastructure/cpm-editor.service';
import { CpmService } from '../../infrastructure/cpm.service';
import { ExistenciasTempService } from '../../infrastructure/existencias-temp.service';
import { FeatureFlagsService } from '../../infrastructure/feature-flags.service';
import { MiniBalanceHomologoCand, SugerenciaHomologoItem } from '../../infrastructure/homologos-solicitud.service';
import { InventarioService } from '../../infrastructure/inventario/inventario.service';
import { StorageSolicitudService } from '../../infrastructure/storage-solicitud.service';
import { SurveyService } from '../../infrastructure/survey.service';
import { TrazabilidadService } from '../../infrastructure/trazabilidad.service';
import { SolicitudesExportFacadeService } from './services/solicitudes-export-facade.service';
import { SolicitudesHomologosFacadeService } from './services/solicitudes-homologos-facade.service';
import { SolicitudesImportError, SolicitudesImportFacadeService } from './services/solicitudes-import-facade.service';


@Component({
  selector: 'app-solicitudes',
  standalone: true,
  imports: [CommonModule, FormsModule,
    NombrarArchivoModalComponent,
    ConfirmacionModalComponent,
    TablaArticulosComponent,
    RouterModule,
    KitModalComponent,
    CpmModalComponent,
    CpmEditModalComponent,
    HomologoSugerenciaModalComponent,
    HomologoResumenImportacionComponent
  ],
  templateUrl: './solicitudes.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SolicitudesComponent implements OnInit, AfterViewInit, OnDestroy {
  datosClues = {} as DatosClues;
  mostrarModal = false;
  modalVisible = false;
  modalTitulo = '';
  modalMensaje = '';
  modalConfirmarTexto = '';
  modalCancelarTexto = '';
  modalCallback?: () => void;
  modalSoloInfo = false;
  articulosSolicitados: ArticuloSolicitud[] = [];
  private invIndex = new Map<string, InventarioDisponibles>();
  private cpmIndex = new Map<string, number>();

  claveInput = '';
  descripcionInput = '';
  unidadInput = '';
  cantidadInput!: number;

  modalPedirNombreArchivo = false;
  nombreArchivo = '';
  modoStandalone = false;

  autocompleteResults: any[] = [];
  moreResults = false;
  totalResults = 0;

  selectedIndex = -1;

  private searchSubject = new Subject<string>();
  articulosService = inject(ArticulosService);
  toast = inject(NgFastToastService);
  trazabilidadService = inject(TrazabilidadService);
  cpmEditorService = inject(CpmEditorService);

  @ViewChildren('resultItem') resultItems!: QueryList<ElementRef>;
  @ViewChild('inputClave') inputClaveRef!: ElementRef<HTMLInputElement>;
  @ViewChild(TablaArticulosComponent) tablaArticulosComponent?: TablaArticulosComponent;

  modoEdicionIndex: number | null = null;
  cantidadTemporal: number = 0;

  generarPrecarga: boolean = true;

  //mensajeImportacion: string | null = null;
  // dentro de la clase:
  private survey = inject(SurveyService);

  private cdRef = inject(ChangeDetectorRef);
  private router = inject(Router);
  public storageSolicitudService = inject(StorageSolicitudService);
  private cpmService = inject(CpmService);

  // behaviorSubject para desuscribirme de todos los observables
  private onDestroy$ = new Subject<void>();
  private featureFlagsService = inject(FeatureFlagsService);
  // cachecito opcional para no pedir siempre
  private surveyFlagCache = new Map<string, boolean>();

  private existTemp = inject(ExistenciasTempService);

  existUnidadIndex = new Map<string, number>();
  get hasUnidadExistencias(): boolean { return this.existUnidadIndex.size > 0; }

  // dentro de la clase SolicitudesComponent
  // ============= Inyección de servicios =============
  private solicitudesExportFacade = inject(SolicitudesExportFacadeService);
  private solicitudesHomologosFacade = inject(SolicitudesHomologosFacadeService);
  private solicitudesImportFacade = inject(SolicitudesImportFacadeService);

  // ============= FLUJO 1: Properties para Agregar Manual =============
  homologoModalVisible = false;
  homologoModalData: { sugerencias: MiniBalanceHomologoCand[]; clave: string; cantidad: number; inventarioDisponible: InventarioDisponibles[] } | null = null;
  private listaNegraHomologos = new Set<string>();

  // ============= FLUJO 2: Properties para Importación =============
  importResumenHomologosVisible = false;
  articulosConHomologos: SugerenciaHomologoItem[] = [];
  homologoResumenTotalImportados = 0;
  homologoResumenOrigen: 'importacion' | 'modales' = 'importacion';

  // ============= FLUJO 3: Properties para Modales CPM/KIT =============
  mostrarOportunidadesEnTabla = false;
  oportunidadesDisponibles: SugerenciaHomologoItem[] = [];

  public tituloUnidad$ = this.storageSolicitudService.nombreUnidad$.pipe(
    map((nombre) => {
      const raw = this.storageSolicitudService.getDatosCluesFromLocalStorage();
      let municipio = '';
      try {
        municipio = (JSON.parse(raw || '{}')?.hospital?.municipio) ?? '';
      } catch { /* noop */ }

      const esPrimerNivel =
        this.storageSolicitudService.getModoCapturaSolicitud() === ModoCapturaSolicitud.PRIMER_NIVEL;

      return esPrimerNivel && municipio ? `${nombre} (${municipio})` : nombre;
    })
  );

  constructor() {
  }
  ngOnDestroy(): void {
    // desuscribirme usando un behaviorSubject
    this.onDestroy$.next();
    this.onDestroy$.complete();
  }

  public inventarioService = inject(InventarioService);
  inventario: Inventario[] = [];
  inventarioDisponible: InventarioDisponibles[] = [];
  cpmsDeCluesActual: CPMS[] = [];
  canEditCpms = false;

  get capturaStats() {
    const stats = {
      total: this.articulosSolicitados.length,
      cpmCero: 0,
      menorCpm: 0,
      igualCpm: 0,
      mayorCpm: 0
    };

    for (const art of this.articulosSolicitados) {
      const clave = this.normClave(art.clave);
      const cpmCapturado = Number(art.cpm ?? 0) || 0;
      const cpm = cpmCapturado > 0 ? cpmCapturado : (this.cpmIndex.get(clave) ?? 0);
      const cantidad = Number(art.cantidad ?? 0) || 0;

      if (cpm <= 0) {
        stats.cpmCero++;
        continue;
      }

      if (cantidad < cpm) stats.menorCpm++;
      if (cantidad === cpm) stats.igualCpm++;
      if (cantidad > cpm) stats.mayorCpm++;
    }

    return stats;
  }

  async ngOnInit() {
    if (this.router.url === '/solicitudv1') {
      this.modoStandalone = true;
    } else {
      this.modoStandalone = false;
      this.cpmService.cpmsForImport(this.cluesimbActual)
        .pipe(takeUntil(this.onDestroy$))
        .subscribe((rows: CpmUnionRow[]) => {
          const clues = this.cluesimbActual;
          this.cpmsDeCluesActual = this.mapCpmRowsToCPMS(rows as any, clues);
          this.cpmIndex.clear();
          for (const r of this.cpmsDeCluesActual) {
            this.cpmIndex.set(this.normClave(r.clave), Number(r.cantidad) || 0);
          }
          this.cdRef.detectChanges();
        });
    }

    const guardados = this.storageSolicitudService.getArticulosSolicitadosFromLocalStorage();
    if (guardados) {
      const articulosGuardados: ArticuloSolicitud[] = JSON.parse(guardados);
      // Normalizar claves
      this.articulosSolicitados = articulosGuardados.map(art => {
        const claveNormalizada = this.inventarioService.normalizarClave(art.clave);
        return {
          ...art,
          clave: claveNormalizada
        };
      });
      this.rebuildExistingClaves();
    }

    // (Robustez) si el usuario llega directo a esta ruta,
    // levanta CPM de la unidad guardada en localStorage.
    const cluesStr = this.storageSolicitudService.getDatosCluesFromLocalStorage();
    if (cluesStr) {
      this.datosClues = JSON.parse(cluesStr) as DatosClues;
      const cluesimb = this.datosClues?.hospital?.cluesimb || '';
      if (cluesimb) {
        // no hace daño si Layout ya lo cargó: usa caché del CpmService
        this.cpmService.ensureForCluesimb(cluesimb).subscribe();
        this.loadExistenciasUnidad(cluesimb);
      }
    }
    await this.loadEditCpmsFlag();

    this.searchSubject.pipe(debounceTime(1000), takeUntil(this.onDestroy$))
      .subscribe(texto => {
        if (texto.length > 2) {
          this.buscarEnDB(texto);
        } else {
          this.autocompleteResults = [];
          this.selectedIndex = -1;
          this.moreResults = false;
          this.totalResults = 0;
        }
      });

    // TODO: Comentar esto si no se desea mostrar info de inventario
    this.inventarioService.inventario$
      .pipe(takeUntil(this.onDestroy$))
      .subscribe({
        next: (data) => {
          this.inventario = [...data];
          this.calcularInventarioDisponible();
          this.cdRef.detectChanges();
        },
        error: (error) => {
          console.error('Error al obtener el inventario:', error);
        }
      });
  }

  // Adaptador de filas del endpoint a tu tipo CPMS (lo que use tu ExcelService)
  // Asumo CPMS = { clave: string; cpm: number }.
  // Si tu interfaz CPMS tiene más campos, ajústalos aquí.
  private mapCpmRowsToCPMS(rows: CpmRowLite[], cluesimbFallback?: string): CPMS[] {
    // Consolidamos por clave (si una clave aparece varias veces por distintos kits, tomamos el mayor CPM)
    const byClave = new Map<string, CPMS>();

    for (const r of rows) {
      const clave = (r.clave_cnis || '').toUpperCase();
      if (!clave) continue;

      const cpmVal = Number(r.cpm ?? 0);
      if (cpmVal <= 0) continue; // solo nos interesan CPMS > 0

      const cluesimb = (r.cluesimb || cluesimbFallback || '').toUpperCase();
      const prev = byClave.get(clave);

      if (!prev || cpmVal > prev.cantidad) {
        byClave.set(clave, {
          clave,
          cluesimb,
          cantidad: cpmVal,   // aquí 'cantidad' = CPM
        });
      }
    }

    return Array.from(byClave.values());
  }

  calcularInventarioDisponible() {
    const disponiblePorClave = new Map<string, InventarioDisponibles>();
    this.invIndex.clear();

    for (const item of this.inventario) {
      const clave = item.clave;
      let existencia = disponiblePorClave.get(clave);

      if (!existencia) {
        existencia = {
          clave,
          existenciasAZM: 0,
          existenciasAZE: 0,
          existenciasAZT: 0
        };
        disponiblePorClave.set(clave, existencia);
      }

      const disponiblesNetos = item.disponible - item.comprometidos;
      const almacen = (item.almacen || '').toLowerCase();

      if (almacen.includes('almacen estatal zona mexicali') || almacen.includes('almacen zona mexicali') || almacen.includes('almacen imss bienestar mexicali')) {
        existencia.existenciasAZM += disponiblesNetos;
      } else if (almacen.includes('almacen zona ensenada') || almacen.includes('almacen imss bienestar ensenada')) {
        existencia.existenciasAZE += disponiblesNetos;
      } else if (almacen.includes('almacen zona tijuana') || almacen.includes('almacen imss bienestar tijuana')) {
        existencia.existenciasAZT += disponiblesNetos;
      }
    }

    this.inventarioDisponible = Array.from(disponiblePorClave.values());
    for (const item of this.inventarioDisponible) {
      this.invIndex.set(item.clave, item);
    }
  }

  ngAfterViewInit(): void {
    this.cdRef.detectChanges();
  }

  onClaveInput() {
    this.searchSubject.next(this.claveInput);
  }

  buscarEnDB(texto: string) {
    this.buscarArticulosBackend(texto);
  }

  estaCapturandoPrimerNivel() {
    return this.storageSolicitudService.getModoCapturaSolicitud() === ModoCapturaSolicitud.PRIMER_NIVEL;
  }

  buscarArticulosBackend(texto: string) {
    // Intenta con backend Koyeb
    this.articulosService.buscarArticulos(texto).subscribe({
      next: (data) => {
        // this.autocompleteResults = data.resultados.sort((a, b) => a.clave.localeCompare(b.clave)) || [];
        const base = (data.resultados || []).sort((a, b) => a.clave.localeCompare(b.clave));
        this.autocompleteResults = this.enrichWithExistencias(base);

        if (this.hasUnidadExistencias) {
          this.autocompleteResults = this.autocompleteResults.map(it => ({
            ...it,
            _existUnidad: this.existUnidadIndex.get(it.clave) ?? 0
          }));
        }
        this.totalResults = data.total || 0;
        this.moreResults = this.totalResults > 24;
        this.selectedIndex = 0;
        this.cdRef.detectChanges();
        setTimeout(() => this.focusSelectedItem(), 0);
      },
      error: (error) => {
        console.error('Error en búsqueda de artículos:', error);
        this.autocompleteResults = [];
        this.selectedIndex = -1;
        this.moreResults = false;
        this.totalResults = 0;
        this.cdRef.detectChanges();
      }
    });
  }

  // TODO: Eliminar hasta que sea oficial. Pero si es seguro que esto se eliminaria o modificaria en caso de requerirlo
  /* buscarArticulosPrimerNivel(texto: string) {
     this.articulosService.buscarArticulosPrimerNivel(texto).subscribe({
       next: (data) => {
         const base = data.resultados || [];
         this.autocompleteResults = this.enrichWithExistencias(base);
         this.totalResults = data.total || 0;
         this.moreResults = this.totalResults > 24;
         this.selectedIndex = 0;
         this.cdRef.detectChanges();
         setTimeout(() => this.focusSelectedItem(), 0);
       },
       error: (fallbackError) => {
         console.error('Error en búsqueda local:', fallbackError);
         this.autocompleteResults = [];
         this.totalResults = 0;
       }
     });
   }*/


  async selectArticulo(item: any) {
    this.claveInput = item.clave;
    this.descripcionInput = item.descripcion ?? '';
    this.unidadInput = item.unidadMedida ?? (item.presentacion ?? '');
    this.autocompleteResults = [];
    this.selectedIndex = -1;
  }

  onInputKeyDown(event: KeyboardEvent) {
    if (!this.autocompleteResults.length) return;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.selectedIndex = (this.selectedIndex + 1) % this.autocompleteResults.length;
        this.focusSelectedItem();
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.selectedIndex =
          (this.selectedIndex - 1 + this.autocompleteResults.length) % this.autocompleteResults.length;
        this.focusSelectedItem();
        break;
      case 'Enter':
        event.preventDefault();
        if (this.autocompleteResults[this.selectedIndex]) {
          this.selectArticulo(this.autocompleteResults[this.selectedIndex]);
        }
        break;
      case 'Escape':
        this.autocompleteResults = [];
        this.selectedIndex = -1;
        break;
    }
  }

  focusSelectedItem() {
    const itemsArray = this.resultItems.toArray();
    if (itemsArray[this.selectedIndex]) {
      itemsArray[this.selectedIndex].nativeElement.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest'
      });
    }
  }

  async agregarArticulo() {
    const clave = this.claveInput.trim().toUpperCase();
    try {
      await this.cpmService.ensureAllowedOrThrow(clave);
      // proceder con la captura
    } catch {
      this.toast.warn({
        title: 'Clave fuera de KIT',
        content: 'La clave no pertenece al KIT de la unidad (flag activa).',
        duration: 5
      });
      return;
    }
    const cpm = this.cpmIndex.get(this.normClave(clave)) ?? 0;

    if (!clave || !this.descripcionInput || !this.unidadInput || this.cantidadInput <= 0) {
      return; // Validación básica
    }

    // Evitar duplicados por clave (case-insensitive)
    const existe = this.articulosSolicitados.some(a => a.clave.toUpperCase() === clave);
    if (existe) {
      this.abrirModalInfo(
        'Clave repetida',
        `Ya capturaste un artículo con la clave "${clave}".`
      );
      return;
    }

    // Validar que si estoy capturando en modo primer nivel solo admita articulos de primer nivel
    // Parte por eliminar hasta que sea oficial
    /*if (this.storageSolicitudService.getModoCapturaSolicitud() === ModoCapturaSolicitud.PRIMER_NIVEL) {
      const esPrimerNivel = this.articulosService.esPrimerNivel(clave);
      if (!esPrimerNivel) {
        this.abrirModalInfo(
          'Clave no permitida',
          `El articulos con la clave "${clave}" no se captura en modo primer nivel.`);
        return;
      }
    }*/


    this.articulosSolicitados.push({
      clave,
      descripcion: this.descripcionInput.trim(),
      unidadMedida: this.unidadInput.trim(),
      cantidad: this.cantidadInput,
      cpm,
      presentacion: '',
      observaciones: ''
    });

    // FLUJO 1: NUEVO - Detectar homólogos para este artículo
    this.detectarYMostrarHomologoParaArticulo(clave, this.cantidadInput);

    this.storageSolicitudService
      .setArticulosSolicitadosInLocalStorage(
        JSON.stringify(this.articulosSolicitados));

    // Limpiar inputs
    this.claveInput = '';
    this.descripcionInput = '';
    this.unidadInput = '';
    this.cantidadInput = 0;
    this.selectedIndex = -1;

    this.cdRef.detectChanges();

    setTimeout(() => {
      this.inputClaveRef?.nativeElement.focus();
    }, 0);
  }

  // ============================================
  // FLUJO 1: Métodos para Agregar Manual
  // ============================================

  /**
   * Detecta homologos y muestra el modal si hay sugerencias
   */
  private async detectarYMostrarHomologoParaArticulo(clave: string, cantidad: number) {
    try {
      const deteccion = await this.solicitudesHomologosFacade.detectarHomologoManual(
        clave,
        cantidad,
        this.inventarioDisponible,
        this.cluesimbActual,
        this.articulosSolicitados,
        this.listaNegraHomologos
      );

      if (deteccion.omitidas > 0) {
        this.toast.warn({
          title: 'Alternativas omitidas',
          content: `${deteccion.omitidas} alternativa(s) ya estaban en la lista y no se mostraron.`,
          duration: 4
        });
      }

      if (deteccion.sugerencias.length > 0) {
        this.homologoModalData = {
          sugerencias: deteccion.sugerencias,
          clave,
          cantidad,
          inventarioDisponible: this.inventarioDisponible
        };
        this.homologoModalVisible = true;
        this.cdRef.detectChanges();
      }
    } catch (error) {
      console.error('Error detectando homologos:', error);
      // Fallar silenciosamente - la captura continua normalmente
    }
  }

  /**
   * Maneja el reemplazo por homólogo sugerido
   */
  async onReemplazarHomologo(candidato: MiniBalanceHomologoCand) {
    const originalClave = this.homologoModalData?.clave;
    if (!originalClave) return;

    const outcome = await this.solicitudesHomologosFacade.aplicarReemplazoManual(
      this.articulosSolicitados,
      originalClave,
      candidato,
    );

    if (outcome.duplicada) {
      this.toast.warn({
        title: 'Clave sugerida ya capturada',
        content: `La clave ${candidato.sustituto} ya existe en la lista. Elige otra alternativa o conserva la original.`,
        duration: 5
      });
      return;
    }

    if (outcome.reemplazo) {
      this.articulosSolicitados = outcome.reemplazo.articulos;
      this.rebuildExistingClaves();
      this.storageSolicitudService.setArticulosSolicitadosInLocalStorage(
        JSON.stringify(this.articulosSolicitados)
      );

      this.toast.success({
        title: 'Art?culo reemplazado',
        content: `${outcome.reemplazo.originalClave} x ${outcome.reemplazo.sustituto} (${outcome.reemplazo.nuevaCantidad} un.)`,
        duration: 4
      });
    }

    this.homologoModalVisible = false;
    this.cdRef.detectChanges();
  }

  /**
   * Mantiene el artículo original
   */
  onMantenerOriginal() {
    this.homologoModalVisible = false;
    this.cdRef.detectChanges();
  }

  /**
   * Agrega una clave a la lista negra (no sugerir más)
   */
  agregarAListaNegra(clave: string) {
    this.listaNegraHomologos.add(clave.toUpperCase());
    this.toast.warn({
      title: 'Anotado',
      content: `No se sugerirán alternativas para ${clave}`,
      duration: 3
    });
  }


  // ============================================
  // FLUJO 2: Métodos para Importación
  // ============================================

  /**
   * Detecta homologos para articulos importados y muestra resumen
   */
  private async detectarYMostrarHomologosImport() {
    try {
      const sugerencias = await this.solicitudesHomologosFacade.detectarHomologosParaLista(
        this.articulosSolicitados,
        this.inventarioDisponible,
        this.cluesimbActual
      );

      if (sugerencias?.length > 0) {
        await new Promise(resolve => setTimeout(resolve, 500));
        this.homologoResumenOrigen = 'importacion';
        this.homologoResumenTotalImportados = this.articulosSolicitados.length;
        this.articulosConHomologos = sugerencias;
        this.importResumenHomologosVisible = true;
        this.cdRef.detectChanges();
      }
    } catch (error) {
      console.error('Error detectando homologos en importacion:', error);
    }
  }

  /**
   * Maneja el reemplazo múltiple desde el resumen de importación
   */
  async onReemplazarMultiplesDesdeResumen(
    resultados: Array<{ originalClave: string; articulo: ArticuloSolicitud }>
  ) {
    const outcome = this.solicitudesHomologosFacade.aplicarReemplazosMultiples(
      this.articulosSolicitados,
      resultados,
    );

    this.articulosSolicitados = outcome.articulos;
    this.rebuildExistingClaves();
    this.storageSolicitudService.setArticulosSolicitadosInLocalStorage(
      JSON.stringify(this.articulosSolicitados)
    );

    const origen = this.homologoResumenOrigen;
    this.importResumenHomologosVisible = false;
    if (outcome.aplicados.length === 0) {
      this.toast.warn({
        title: 'Sin homologaciones seleccionadas',
        content: outcome.conflictos.length > 0
          ? `No se aplicaron cambios. ${outcome.conflictos.length} sugerencia(s) omitida(s) por clave duplicada en la lista.`
          : 'No se aplicaron cambios; se conservaron los articulos originales.',
        duration: 5
      });
    } else {
      this.toast.success({
        title: origen === 'modales' ? 'Selección completada' : 'Importación completada',
        content: outcome.conflictos.length > 0
          ? `Se procesaron ${outcome.aplicados.length} sugerencia(s). ${outcome.conflictos.length} omitida(s) por duplicado.`
          : `Se procesaron ${outcome.aplicados.length} articulos con sugerencias`,
        duration: 4
      });
    }
    this.cdRef.detectChanges();
  }

  abrirModal() {
    this.mostrarModal = true;
  }

  confirmarLimpieza() {
    this.articulosSolicitados = [];
    this.storageSolicitudService.limpiarArticulosSolicitadosInLocalStorage();
    this.existingClavesList = [];
    this.oportunidadesDisponibles = [];
    this.mostrarOportunidadesEnTabla = false;
    this.articulosConHomologos = [];
    this.importResumenHomologosVisible = false;
    this.cerrarModal();
  }

  abrirModalInfo(titulo: string, mensaje: string, confirmarTexto = 'Aceptar') {
    this.modalTitulo = titulo;
    this.modalMensaje = mensaje;
    this.modalConfirmarTexto = confirmarTexto;
    this.modalSoloInfo = true;
    this.modalVisible = true;
    this.cdRef.detectChanges();
  }

  abrirModalConfirmacion(
    titulo: string,
    mensaje: string,
    confirmarTexto: string,
    cancelarTexto: string,
    callback: () => void
  ) {
    this.modalTitulo = titulo;
    this.modalMensaje = mensaje;
    this.modalConfirmarTexto = confirmarTexto;
    this.modalCancelarTexto = cancelarTexto;
    this.modalCallback = callback;
    this.modalSoloInfo = false;
    this.modalVisible = true;
  }

  cerrarModal() {
    this.modalVisible = false;
    this.modalCallback = undefined;
  }

  modalAceptar() {
    if (this.modalCallback) {
      this.modalCallback();
    }
    this.cerrarModal();
    void this.mostrarSurveySiEsNecesario();
  }

  private async mostrarSurveySiEsNecesario() {
    // si se limpio captura de articulos no mostrar survey
    if (this.articulosSolicitados.length === 0) return;

    const cluesimb = this.datosClues?.hospital?.cluesimb ?? '';
    if (!cluesimb) return;

    // se valida el flag efectivo
    const puede = await this.shouldAskSurvey(cluesimb);
    if (!puede) return;

    const APP_VERSION = (globalThis as any).process?.env?.NG_APP_VERSION ?? 'dev';
    this.survey.maybeShow('export_success', { cluesimb, appVersion: APP_VERSION });
  }

  confirmarLimpiezaModal() {
    this.abrirModalConfirmacion(
      '¿Estás seguro?',
      'Esta acción eliminará todos los artículos capturados. ¿Deseas continuar?',
      'Sí, limpiar todo',
      'Cancelar',
      () => this.confirmarLimpieza()
    );
  }

  async exportarExcelConTemplate(nombreArchivo: string) {
    this.refreshDatosCluesDesdeStorage();

    const resultado = await this.solicitudesExportFacade.exportar({
      nombreArchivo,
      articulos: this.articulosSolicitados,
      modoStandalone: this.modoStandalone,
      generarPrecarga: this.generarPrecarga,
      datosClues: this.datosClues,
      inventarioDisponible: this.inventarioDisponible,
      cpmsDeCluesActual: this.cpmsDeCluesActual,
    });

    this.abrirModalInfo(resultado.tituloModal, resultado.mensajeModal);

    if (resultado.advertenciaKit) {
      this.toast.warn({
        title: 'Exportación filtrada',
        content: resultado.advertenciaKit,
        duration: 5
      });
    }
  }

  mostrarModalExportar() {
    this.refreshDatosCluesDesdeStorage();
    this.nombreArchivo = this.solicitudesExportFacade.construirNombreArchivoSugerido(
      this.datosClues,
      this.modoStandalone,
    );
    this.modalPedirNombreArchivo = true;
  }

  private refreshDatosCluesDesdeStorage(): void {
    if (this.modoStandalone) {
      return;
    }

    const cluesStr = this.storageSolicitudService.getDatosCluesFromLocalStorage();
    if (cluesStr) {
      this.datosClues = JSON.parse(cluesStr) as DatosClues;
    }
  }

  todosLosArticulosConCantidadMayorACero(): boolean {
    return this.articulosSolicitados.every(articulo => articulo.cantidad > 0);
  }

  cantidadArticulosPendientes(): number {
    return this.articulosSolicitados.filter(articulo => Number(articulo.cantidad ?? 0) <= 0).length;
  }

  verArticulosPendientes(): void {
    this.tablaArticulosComponent?.scrollPrimerPendiente();
  }

  confirmarExportacion() {
    this.modalPedirNombreArchivo = false;
    void this.exportarExcelConTemplate(this.nombreArchivo);
  }

  eliminarArticulo(index: number) {
    this.articulosSolicitados.splice(index, 1);
    this.storageSolicitudService
      .setArticulosSolicitadosInLocalStorage(
        JSON.stringify(this.articulosSolicitados));
  }

  eliminarArticuloConConfirmacion(index: number) {
    this.abrirModalConfirmacion(
      '¿Eliminar artículo?',
      `¿Deseas eliminar el artículo "${this.articulosSolicitados[index].clave}"?`,
      'Sí, eliminar',
      'Cancelar',
      () => this.eliminarArticulo(index)
    );
  }

  get formularioValido(): boolean {
    return (
      this.claveInput.trim().length > 0 &&
      this.descripcionInput.trim().length > 0 &&
      this.unidadInput.trim().length > 0 &&
      this.cantidadInput > 0 &&
      this.cantidadInput < 99999
    );
  }

  activarEdicion(index: number) {
    this.modoEdicionIndex = index;
    this.cantidadTemporal = this.articulosSolicitados[index].cantidad;
  }

  cambiarCantidad(cantidad: number) {
    this.cantidadTemporal = cantidad;
  }

  cancelarEdicion() {
    this.modoEdicionIndex = null;
    this.cantidadTemporal = 0;
  }

  confirmarEdicion(index: number) {
    this.articulosSolicitados[index].cantidad = this.cantidadTemporal;
    this.modoEdicionIndex = null;
    this.storageSolicitudService
      .setArticulosSolicitadosInLocalStorage(
        JSON.stringify(this.articulosSolicitados));
  }

  esCantidadInvalida(): boolean {
    return this.cantidadTemporal <= 0 || this.cantidadTemporal > 99999;
  }

  cerrarModalArchivo() {
    this.modalPedirNombreArchivo = false;
  }

  buscarArchivo(fileInput: HTMLInputElement) {
    if (this.articulosSolicitados.length > 0) {
      this.abrirModalConfirmacion(
        'Precarga detectada',
        'Esto reemplazará los artículos ya capturados. ¿Deseas continuar?',
        'Sí, reemplazar',
        'Cancelar',
        () => fileInput.click()
      );
    } else {
      fileInput.click();
    }
  }


  async manejarArchivoPrecarga(event: Event) {
    const input = event.target as HTMLInputElement;
    const archivo = (event.target as HTMLInputElement).files?.[0];
    if (!archivo) return;

    try {
      this.articulosSolicitados = [];
      this.existingClavesList = [];
      const datosCluesStorage = JSON.parse(this.storageSolicitudService.getDatosCluesFromLocalStorage() || '{}') as DatosClues;
      if (datosCluesStorage && this.datosClues?.hospital?.cluesimb !== datosCluesStorage?.hospital?.cluesimb) {
        this.datosClues = datosCluesStorage;
      }

      const cluesimbActual = this.datosClues?.hospital?.cluesimb;
      if (cluesimbActual) {
        try {
          await firstValueFrom(this.cpmService.ensureForCluesimb(cluesimbActual));
          this.loadExistenciasUnidad(cluesimbActual);
        } catch {
          // noop
        }
      }

      const resultado = await this.solicitudesImportFacade.procesarArchivoPrecarga({
        archivo,
        cluesimb: cluesimbActual ?? '',
        cpmIndex: this.cpmIndex,
      });

      this.articulosSolicitados = resultado.articulos;
      this.existingClavesList = resultado.clavesExistentes;
      this.storageSolicitudService.setArticulosSolicitadosInLocalStorage(
        JSON.stringify(this.articulosSolicitados)
      );

      const lineas: string[] = [];
      lineas.push(`Claves importadas: ${this.articulosSolicitados.length}`);
      if (resultado.duplicadas.length > 0) {
        lineas.push(`Duplicadas combinadas (${resultado.duplicadas.length}): ${resultado.duplicadasPreview}`);
      }

      this.detectarYMostrarHomologosImport();
      this.abrirModalInfo('Importación completada', lineas.join('\n'));
    } catch (error) {
      if (error instanceof SolicitudesImportError) {
        if (error.code === 'empty_file') {
          this.abrirModalInfo('Archivo vacío', error.message);
        } else {
          this.abrirModalInfo('Encabezado faltante', error.message);
        }
        return;
      }

      console.error('Error al leer archivo:', error);
      this.abrirModalInfo('Error al importar', 'Hubo un problema al procesar el archivo.');
    } finally {
      input.value = '';
    }
  }
  private async shouldAskSurvey(cluesimb: string): Promise<boolean> {
    if (!cluesimb) return false;

    const nivel: Nivel = this.estaCapturandoPrimerNivel() ? 'PRIMER_NIVEL' : 'SEGUNDO_NIVEL';
    const cacheKey = `${cluesimb}|${nivel}`;
    if (this.surveyFlagCache.has(cacheKey)) {
      return this.surveyFlagCache.get(cacheKey)!;
    }

    try {
      const flags = await this.featureFlagsService.getEffective({ cluesimb, nivel });
      const allowed = !!flags['APLICAR_ENCUESTAS'];
      this.surveyFlagCache.set(cacheKey, allowed);
      return allowed;
    } catch (err) {
      console.warn('No se pudo consultar flags; se omite encuesta.', err);
      return false; // fail-closed: sin flags -> no encuesta
    }
  }

  /** Normaliza CNIS para usar como llave en inventario */
  private normClave(clave: string | undefined | null): string {
    return this.inventarioService.normalizarClave((clave ?? '').toString().toUpperCase());
  }

  /** Enriquecer items del autocomplete con existencias AZM/AZE/AZT (si hay inventario) */
  private enrichWithExistencias<T extends Record<string, any>>(items: T[]): Array<T & EnrichedProps> {
    if (!items?.length) return items as Array<T & EnrichedProps>;

    return items.map((it) => {
      const base = it as Record<string, any>;     // asegura que es "object" para el spread
      const clave = this.normClave(base['clave']);

      const inv = this.invIndex.get(clave);
      const azm = inv?.existenciasAZM ?? 0;
      const aze = inv?.existenciasAZE ?? 0;
      const azt = inv?.existenciasAZT ?? 0;
      const total = azm + aze + azt;

      const cpm = this.cpmIndex.get(clave) ?? this.cpmService.getCpmForClave(clave, this.cluesimbActual) ?? 0;
      const enKit = this.cpmService.isClaveInKit(clave, this.cluesimbActual);

      return {
        ...base,               // ya es un object
        _azm: azm,
        _aze: aze,
        _azt: azt,
        _totalExistencias: total,
        _cpm: cpm,
        _enKit: enKit,
      } as T & EnrichedProps;
    });
  }

  private async loadEditCpmsFlag(): Promise<void> {
    const cluesimb =
      this.datosClues?.hospital?.cluesimb ||
      (JSON.parse(this.storageSolicitudService.getDatosCluesFromLocalStorage() || '{}')?.hospital?.cluesimb ?? '');
    const nivel: Nivel = this.estaCapturandoPrimerNivel() ? 'PRIMER_NIVEL' : 'SEGUNDO_NIVEL';

    if (!cluesimb) {
      this.canEditCpms = false;
      return;
    }

    try {
      const eff = await this.featureFlagsService.getEffective({ cluesimb, nivel });
      this.canEditCpms = !!eff['EDIT_CPMS'];
    } catch {
      // fail-closed para no exponer edicion por error de flags
      this.canEditCpms = false;
    } finally {
      this.cdRef.detectChanges();
    }
  }

  private loadExistenciasUnidad(cluesimb: string) {
    if (!cluesimb) { this.existUnidadIndex.clear(); return; }

    this.existTemp.byUnidad(cluesimb).subscribe(async rows => {
      const entries = await Promise.all(rows.map(async r => {
        const factor = await this.trazabilidadService
          .getFactorConversionPorUnidad(r.clave_cnis, cluesimb);
        return [r.clave_cnis, aplicarFactorConversion(Number(r.existencia_total ?? 0), factor)] as const;
      }));
      const idx = new Map<string, number>(entries);
      this.existUnidadIndex = idx;

      // Enriquecer el autocomplete actual (si ya hay resultados en pantalla)
      this.autocompleteResults = (this.autocompleteResults || []).map(it => ({
        ...it,
        _existUnidad: idx.get(it.clave) ?? 0
      }));
    });
  }

  /*************************************************************************************/
  /*************************************************************************************/
  /*************************************************************************************/
  kitModalVisible = false;
  cpmModalVisible = false;
  cpmEditModalVisible = signal(false);

  /** PARA MODAL DE CLAVES POR CPM */
  abrirCpmModal() {
    // forzar recarga de this.datosClues de localstorageService porque este componente no lo recarga
    this.datosClues = JSON.parse(this.storageSolicitudService.getDatosCluesFromLocalStorage() || '{}');
    this.cpmModalVisible = true;
  }

  async abrirCpmEditModal() {
    this.datosClues = JSON.parse(this.storageSolicitudService.getDatosCluesFromLocalStorage() || '{}');
    await this.loadEditCpmsFlag();

    if (!this.canEditCpms) {
      this.toast.warn({
        title: 'No autorizado',
        content: 'La edicion de CPM no esta habilitada para esta unidad.',
        duration: 5
      });
      this.cpmEditModalVisible.set(false);
      return;
    }

    this.cpmEditModalVisible.set(true);
  }

  async onCpmEditUpdated() {
    if (!this.cluesimbActual) return;
    try {
      const rows = await firstValueFrom(this.cpmService.refreshForCluesimb(this.cluesimbActual));
      this.cpmsDeCluesActual = this.mapCpmRowsToCPMS(rows as any, this.cluesimbActual);

      this.cpmIndex.clear();
      for (const r of this.cpmsDeCluesActual) {
        this.cpmIndex.set(this.normClave(r.clave), Number(r.cantidad) || 0);
      }

      // sincroniza CPM ya capturado en la solicitud sin alterar cantidades
      this.articulosSolicitados = this.articulosSolicitados.map(art => ({
        ...art,
        cpm: this.cpmIndex.get(this.normClave(art.clave)) ?? 0
      }));
      this.storageSolicitudService.setArticulosSolicitadosInLocalStorage(
        JSON.stringify(this.articulosSolicitados)
      );

      this.toast.success({
        title: 'CPM actualizado',
        content: 'Se refresco la captura con los nuevos CPM de la unidad.',
        duration: 4
      });
      this.cdRef.detectChanges();
    } catch {
      this.toast.warn({
        title: 'Aviso',
        content: 'Se guardaron cambios, pero no se pudo refrescar CPM en pantalla.',
        duration: 5
      });
    }
  }

  /** PARA MODAL DE CLAVES DE KIT */
  abrirKitModal() {
    // forzar recarga de this.datosClues de localstorageService porque este componente no lo recarga
    this.datosClues = JSON.parse(this.storageSolicitudService.getDatosCluesFromLocalStorage() || '{}');
    this.kitModalVisible = true;
  }

  /** Recibe lo que emite el modal (por CPM o por kit) y
   * lo integra (respetando tu flujo actual)
   */
  onKitAdd(items: ArticuloSolicitud[]) {
    if (!items?.length) return;
    const ya = new Set(this.existingClavesList);
    const nuevos = items.filter(i => !ya.has(this.normClave(i.clave)));
    if (!nuevos.length) return;

    this.articulosSolicitados = [...this.articulosSolicitados, ...nuevos];
    this.rebuildExistingClaves();
    this.storageSolicitudService.setArticulosSolicitadosInLocalStorage(
      JSON.stringify(this.articulosSolicitados)
    );

    // Detectar homologos para articulos agregados desde CPM/KIT y resolver en modal de resumen.
    this.detectarYMostrarHomologosDesdeModales(nuevos);

    // this.autocompletarDatos();
  }

  // ============================================
  // FLUJO 3: Métodos para Modales CPM/KIT
  // ============================================

  private async detectarYMostrarHomologosDesdeModales(articulos: ArticuloSolicitud[]) {
    try {
      const sugerencias = await this.solicitudesHomologosFacade.detectarHomologosParaLista(
        articulos,
        this.inventarioDisponible,
        this.cluesimbActual
      );

      if (sugerencias?.length > 0) {
        this.homologoResumenOrigen = 'modales';
        this.homologoResumenTotalImportados = articulos.length;
        this.articulosConHomologos = sugerencias;
        this.importResumenHomologosVisible = true;

        this.toast.warn({
          title: `${sugerencias.length} oportunidad(es)`,
          content: 'Elige las alternativas antes de confirmar',
          duration: 5
        });

        this.cdRef.detectChanges();
      }
    } catch (error) {
      console.error('Error detectando homologos en modales:', error);
    }
  }

  /**
   * Maneja el reemplazo desde la tabla de oportunidades
   */
  async onReemplazarDesdeOportunidades(event: any) {
    const { original, candidato } = event;
    if (!original || !candidato) return;

    const reemplazo = await this.solicitudesHomologosFacade.aplicarReemplazoDesdeOportunidad(
      this.articulosSolicitados,
      original.originalClave,
      original.originalCantidad,
      candidato,
    );

    if (!reemplazo) return;

    this.articulosSolicitados = reemplazo.articulos;
    this.rebuildExistingClaves();
    this.storageSolicitudService.setArticulosSolicitadosInLocalStorage(
      JSON.stringify(this.articulosSolicitados)
    );

    this.oportunidadesDisponibles = this.oportunidadesDisponibles.filter(
      o => o.originalClave !== original.originalClave
    );

    if (this.oportunidadesDisponibles.length === 0) {
      this.mostrarOportunidadesEnTabla = false;
    }

    this.toast.success({
      title: 'Art?culo reemplazado',
      content: `${reemplazo.originalClave} -> ${reemplazo.sustituto}`,
      duration: 3
    });

    this.cdRef.detectChanges();
  }

  /**
   * Cierra la sección de oportunidades
   */
  cerrarOportunidades() {
    this.oportunidadesDisponibles = [];
    this.mostrarOportunidadesEnTabla = false;
    this.cdRef.detectChanges();
  }

  existingClavesList: string[] = [];
  private rebuildExistingClaves() {
    this.existingClavesList = this.articulosSolicitados.map(a => this.normClave(a.clave));
  }

  trackAutocompleteItem(_: number, item: any): string {
    return item?.clave ?? '';
  }

  get cluesimbActual(): string {
    // si datosClues es null regresa ''
    if (!this.datosClues) return '';
    // si el hospital es null regresa ''
    if (!this.datosClues.hospital) return '';
    // si el cluesimb es null regresa ''
    if (!this.datosClues.hospital.cluesimb) return '';
    return this.datosClues.hospital.cluesimb;
  }
  /*************************************************************************************/
  /*************************************************************************************/
  /*************************************************************************************/

  /**
 * Maneja Enter en los inputs del formulario de captura.
 * Si el formulario es válido, no hay edición activa y no hay autocomplete abierto,
 * dispara agregarArticulo().
 */
  onFormularioEnter(event?: Event) {
    const keyboardEvent = event as KeyboardEvent | undefined;

    keyboardEvent?.preventDefault();
    keyboardEvent?.stopPropagation();

    // No hacer nada si el formulario no está listo
    if (!this.formularioValido) return;

    // No permitir mientras se edita un renglón
    if (this.modoEdicionIndex !== null) return;

    // Si sigue abierto el autocomplete, que primero se seleccione la clave
    if (this.autocompleteResults?.length) return;

    // Disparar alta
    void this.agregarArticulo();
  }

  /**
   * Actualiza la lista de CPMS por unidad desde el componente hijo.
   * @param $event
   */
  actualizarCPMsPorUnidad($event: CPMS[]) {
    this.cpmsDeCluesActual = $event;
  }
}

















