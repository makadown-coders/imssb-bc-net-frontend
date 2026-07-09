import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ArticuloSolicitud } from '../../../models/articulo-solicitud';
import { ExcelService } from '../../../infrastructure/excel.service';
import { InventarioService } from '../../../infrastructure/inventario/inventario.service';
import { CpmService } from '../../../infrastructure/cpm.service';
import { FeatureFlagsService } from '../../../infrastructure/feature-flags.service';
import { ArticulosService } from '../../../infrastructure/articulos.service';

export class SolicitudesImportError extends Error {
  constructor(
    public readonly code: 'empty_file' | 'missing_header' | 'invalid_header',
    message: string,
  ) {
    super(message);
  }
}

export interface SolicitudesImportContext {
  archivo: File;
  cluesimb: string;
  cpmIndex: ReadonlyMap<string, number>;
}

export interface SolicitudesImportResult {
  articulos: ArticuloSolicitud[];
  clavesExistentes: string[];
  bloqueadas: string[];
  kitTotal: number;
  enKit: number;
  fueraKit: number;
  duplicadas: string[];
  duplicadasPreview: string;
}

@Injectable({ providedIn: 'root' })
export class SolicitudesImportFacadeService {
  private readonly excelService = inject(ExcelService);
  private readonly inventarioService = inject(InventarioService);
  private readonly cpmService = inject(CpmService);
  private readonly featureFlagsService = inject(FeatureFlagsService);
  private readonly articulosService = inject(ArticulosService);

  async procesarArchivoPrecarga(context: SolicitudesImportContext): Promise<SolicitudesImportResult> {
    const cluesimb = context.cluesimb.trim().toUpperCase();
    let datos = await this.excelService.leerArchivoPrecarga(context.archivo);

    if (!datos || datos.length === 0) {
      throw new SolicitudesImportError('empty_file', 'El archivo está vacío o no contiene datos válidos.');
    }

    let usandoTemplate = false;
    let headers = Object.keys(datos[0]).map((header) => header.toLowerCase().trim());
    let colClave = headers.find((header) => header.includes('clave'));
    let colCantidad = headers.find((header) =>
      (header.includes('cantidad') || header.includes('solicitado') || header.includes('total'))
      && !header.includes('cantidad_propuesta'));

    if (!colClave) {
      if (datos.length < 8) {
        throw new SolicitudesImportError('missing_header', 'El archivo no contiene encabezado o el formato no es válido.');
      }

      headers = Object.values(datos[7]).map((header) => `${header ?? ''}`.toLowerCase().trim());
      colClave = headers.find((header) => header.includes('clave'));
      colCantidad = headers.find((header) =>
        (header.includes('cantidad') || header.includes('solicitado') || header.includes('total'))
        && !header.includes('cantidad_propuesta'));

      if (!colClave) {
        throw new SolicitudesImportError('invalid_header', 'El archivo no contiene una columna con clave CNIS o el formato no es válido.');
      }

      datos = datos.slice(8);
      usandoTemplate = true;
    }

    const nuevos: ArticuloSolicitud[] = [];
    const repetidas: Record<string, number> = {};

    for (const renglon of datos) {
      let fila: any = { ...renglon };
      if (usandoTemplate) {
        fila = Object.values(fila);
      }

      let clave = `${(!usandoTemplate ? (fila[colClave] || fila[colClave.toUpperCase()]) : fila[2]) ?? ''}`
        .trim()
        .toUpperCase();

      if (!clave) {
        continue;
      }

      clave = this.inventarioService.normalizarClave(clave);
      let cantidad = colCantidad ? parseInt(!usandoTemplate ? fila[colCantidad] : fila[5], 10) || 0 : 0;

      if (cantidad <= 0) {
        cantidad = colCantidad ? parseInt(!usandoTemplate ? fila[colCantidad.toUpperCase()] : fila[5], 10) || 0 : 0;
        if (cantidad <= 0) {
          continue;
        }
      }

      const existente = nuevos.find((item) => item.clave === clave);
      if (existente) {
        existente.cantidad += cantidad;
        repetidas[clave] = (repetidas[clave] || 0) + cantidad;
        continue;
      }

      nuevos.push({
        clave,
        descripcion: '',
        unidadMedida: '',
        cantidad,
        cpm: 0,
        presentacion: '',
        observaciones: '',
      });
    }

    const restrict = await this.isImportRestricted(cluesimb);
    const bloqueadas: string[] = [];
    const articulosFiltrados = restrict
      ? nuevos.filter((articulo) => {
        const ok = this.cpmService.isClaveInKit(this.normClave(articulo.clave), cluesimb);
        if (!ok) {
          bloqueadas.push(articulo.clave);
        }
        return ok;
      })
      : nuevos;

    const catalogo = await firstValueFrom(this.articulosService.getArticulosMapa());
    const articulos = articulosFiltrados.map((articulo) => {
      const clave = this.normClave(articulo.clave);
      const encontrado = catalogo[(articulo.clave || '').toUpperCase()];

      return {
        ...articulo,
        descripcion: encontrado?.descripcion ?? articulo.descripcion,
        unidadMedida: encontrado?.presentacion ?? articulo.unidadMedida,
        cpm: context.cpmIndex.get(clave) ?? 0,
      };
    });

    const clavesExistentes = articulos.map((articulo) => this.normClave(articulo.clave));
    const kitTotal = this.cpmService.getKitCountFor(cluesimb);
    const enKit = clavesExistentes.filter((clave) => this.cpmService.isClaveInKit(clave, cluesimb)).length;
    const duplicadas = Object.keys(repetidas);

    return {
      articulos,
      clavesExistentes,
      bloqueadas,
      kitTotal,
      enKit,
      fueraKit: articulos.length - enKit,
      duplicadas,
      duplicadasPreview: this.buildDuplicadasPreview(duplicadas),
    };
  }

  private async isImportRestricted(cluesimb: string): Promise<boolean> {
    try {
      const flags = await this.featureFlagsService.getEffective({ cluesimb });
      return !!flags['IMPORT_LIMIT_TO_KIT'];
    } catch {
      return false;
    }
  }

  private buildDuplicadasPreview(claves: string[]): string {
    if (claves.length === 0) {
      return '';
    }

    const top = claves.slice(0, 10).join(', ');
    const extra = claves.length > 10 ? ` y ${claves.length - 10} más...` : '';
    return `${top}${extra}`;
  }

  private normClave(clave: string | undefined | null): string {
    return this.inventarioService.normalizarClave((clave ?? '').toString().toUpperCase());
  }
}
