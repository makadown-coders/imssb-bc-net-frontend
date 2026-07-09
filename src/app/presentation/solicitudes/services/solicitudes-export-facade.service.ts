import { Injectable, inject } from '@angular/core';
import { DatosClues } from '../../../models/datos-clues';
import { ArticuloSolicitud } from '../../../models/articulo-solicitud';
import { InventarioDisponibles } from '../../../models/Inventario';
import { CPMS } from '../../../models/CPMS';
import { ExcelService } from '../../../infrastructure/excel.service';
import { CpmService } from '../../../infrastructure/cpm.service';
import { FeatureFlagsService } from '../../../infrastructure/feature-flags.service';
import { InventarioService } from '../../../infrastructure/inventario/inventario.service';
import { SolicitudesBitacoraService } from '../../../infrastructure/solicitudes/solicitudes-bitacora.service';
import { environment } from '../../../../environments/environment';

export interface SolicitudesExportContext {
  nombreArchivo: string;
  articulos: ArticuloSolicitud[];
  modoStandalone: boolean;
  generarPrecarga: boolean;
  datosClues: DatosClues;
  inventarioDisponible: InventarioDisponibles[];
  cpmsDeCluesActual: CPMS[];
}

export interface SolicitudesExportResult {
  articulosExportados: ArticuloSolicitud[];
  clavesFueraKit: string[];
  tituloModal: string;
  mensajeModal: string;
  advertenciaKit?: string;
}

@Injectable({ providedIn: 'root' })
export class SolicitudesExportFacadeService {
  private readonly excelService = inject(ExcelService);
  private readonly cpmService = inject(CpmService);
  private readonly featureFlagsService = inject(FeatureFlagsService);
  private readonly inventarioService = inject(InventarioService);
  private readonly bitacoraService = inject(SolicitudesBitacoraService);

  construirNombreArchivoSugerido(datosClues: DatosClues, modoStandalone: boolean): string {
    const base = `Solicitud-${new Date().toISOString().slice(0, 7)}`;
    if (modoStandalone) {
      return base;
    }

    const cluesimb = datosClues.hospital?.cluesimb?.trim();
    const tipoInsumo = (datosClues.tipoInsumo ?? '').split('-')[0]?.trim();
    const tipoPedido = datosClues.tipoPedido?.trim();
    const periodo = datosClues.periodo?.replace(/\s+/g, '-').trim();

    const partes = [cluesimb, tipoInsumo, tipoPedido].filter((valor): valor is string => !!valor);
    const prefijo = partes.length > 0 ? partes.join('-') : base;

    return periodo ? `${prefijo}_${periodo}` : prefijo;
  }

  async exportar(context: SolicitudesExportContext): Promise<SolicitudesExportResult> {
    const cluesimb = context.datosClues?.hospital?.cluesimb?.trim().toUpperCase() ?? '';
    const restrictToKit = await this.isRestrictedToKit(cluesimb);

    const articulosExportados = restrictToKit
      ? context.articulos.filter((articulo) => this.isClaveInKit(articulo.clave, cluesimb))
      : context.articulos;

    const clavesFueraKit = restrictToKit
      ? context.articulos
        .filter((articulo) => !this.isClaveInKit(articulo.clave, cluesimb))
        .map((articulo) => articulo.clave)
      : [];

    const payload = this.bitacoraService.buildPayload(
      context.datosClues,
      articulosExportados,
      context.modoStandalone,
    );

    if (payload && environment.production) {
      await this.bitacoraService.registrar(payload);
    }

    this.excelService.exportarExcelConTemplate(
      'template.xlsx',
      context.nombreArchivo,
      articulosExportados,
      context.modoStandalone,
      context.inventarioDisponible,
      context.cpmsDeCluesActual,
      (clave) => this.isClaveInKit(clave, cluesimb),
    );

    if (context.generarPrecarga) {
      await this.delay(2000);
      this.excelService.exportarExcelPrecarga(
        this.construirNombrePrecarga(context.datosClues, context.modoStandalone),
        articulosExportados,
      );
    }

    return {
      articulosExportados,
      clavesFueraKit,
      tituloModal: context.generarPrecarga ? 'Archivos generados' : 'Archivo generado',
      mensajeModal:
        'Por favor cerciórese de que la información esté en buen estado y sirva para sus necesidades. Presione "Limpiar captura" para iniciar una nueva.',
      advertenciaKit: clavesFueraKit.length > 0
        ? `Se excluyeron ${clavesFueraKit.length} claves fuera de KIT (flag activa).`
        : undefined,
    };
  }

  private construirNombrePrecarga(datosClues: DatosClues, modoStandalone: boolean): string {
    const base = ['Precarga'];

    if (!modoStandalone) {
      const cluesimb = datosClues.hospital?.cluesimb?.trim();
      const tipoInsumo = (datosClues.tipoInsumo ?? '').split('-')[0]?.trim();
      const tipoPedido = datosClues.tipoPedido?.trim();
      base.push(...[cluesimb, tipoInsumo, tipoPedido].filter((valor): valor is string => !!valor));
    }

    return `${base.join('-')}_${new Date().toISOString().slice(0, 7)}`;
  }

  private isClaveInKit(clave: string, cluesimb: string): boolean {
    return this.cpmService.isClaveInKit(this.normClave(clave), cluesimb);
  }

  private async isRestrictedToKit(cluesimb: string): Promise<boolean> {
    if (!cluesimb) {
      return false;
    }

    try {
      const flags = await this.featureFlagsService.getEffective({ cluesimb });
      return !!flags['IMPORT_LIMIT_TO_KIT'];
    } catch {
      return false;
    }
  }

  private normClave(clave: string | undefined | null): string {
    return this.inventarioService.normalizarClave((clave ?? '').toString().toUpperCase());
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
