import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ArticuloSolicitud } from '../../../models/articulo-solicitud';
import { InventarioDisponibles } from '../../../models/Inventario';
import { ArticulosService } from '../../../infrastructure/articulos.service';
import {
  HomologosSolicitudService,
  MiniBalanceHomologoCand,
  SugerenciaHomologoItem,
} from '../../../infrastructure/homologos-solicitud.service';
import { InventarioService } from '../../../infrastructure/inventario/inventario.service';

export interface DeteccionHomologoManualResult {
  sugerencias: MiniBalanceHomologoCand[];
  omitidas: number;
}

export interface ReemplazoHomologoResult {
  articulos: ArticuloSolicitud[];
  originalClave: string;
  sustituto: string;
  nuevaCantidad: number;
}

export interface ReemplazoHomologoManualOutcome {
  duplicada: boolean;
  reemplazo?: ReemplazoHomologoResult;
}

export interface ReemplazoHomologosMultiplesOutcome {
  articulos: ArticuloSolicitud[];
  aplicados: Array<{ originalClave: string; articulo: ArticuloSolicitud }>;
  conflictos: string[];
}

@Injectable({ providedIn: 'root' })
export class SolicitudesHomologosFacadeService {
  private readonly homologosSolicitudService = inject(HomologosSolicitudService);
  private readonly articulosService = inject(ArticulosService);
  private readonly inventarioService = inject(InventarioService);

  async detectarHomologoManual(
    clave: string,
    cantidad: number,
    inventarioDisponible: InventarioDisponibles[],
    cluesimb: string,
    articulosActuales: ArticuloSolicitud[],
    listaNegra: ReadonlySet<string>,
  ): Promise<DeteccionHomologoManualResult> {
    const claveNormalizada = this.normClave(clave);
    if (!claveNormalizada || listaNegra.has(claveNormalizada)) {
      return { sugerencias: [], omitidas: 0 };
    }

    const sugerencias = await this.homologosSolicitudService.obtenerMejoresHomologos(
      clave,
      cantidad,
      inventarioDisponible,
      cluesimb,
    );

    if (!sugerencias?.length) {
      return { sugerencias: [], omitidas: 0 };
    }

    const existentes = new Set(articulosActuales.map((item) => this.normClave(item.clave)));
    const sugerenciasFiltradas = sugerencias.filter((item) => {
      const candidatoNormalizado = this.normClave(item.sustituto);
      if (!candidatoNormalizado) {
        return false;
      }

      if (candidatoNormalizado === claveNormalizada) {
        return true;
      }

      return !existentes.has(candidatoNormalizado);
    });

    return {
      sugerencias: sugerenciasFiltradas,
      omitidas: sugerencias.length - sugerenciasFiltradas.length,
    };
  }

  detectarHomologosParaLista(
    articulos: ArticuloSolicitud[],
    inventarioDisponible: InventarioDisponibles[],
    cluesimb: string,
  ): Promise<SugerenciaHomologoItem[]> {
    return this.homologosSolicitudService.detectarHomologosParaArticulos(
      articulos,
      inventarioDisponible,
      cluesimb,
    );
  }

  async aplicarReemplazoManual(
    articulosActuales: ArticuloSolicitud[],
    originalClave: string,
    candidato: MiniBalanceHomologoCand,
  ): Promise<ReemplazoHomologoManualOutcome> {
    const originalNormalizada = this.normClave(originalClave);
    const sustitutoNormalizado = this.normClave(candidato.sustituto);

    const duplicada = articulosActuales.some((item) => {
      const actualNormalizada = this.normClave(item.clave);
      return actualNormalizada === sustitutoNormalizado && actualNormalizada !== originalNormalizada;
    });

    if (duplicada) {
      return { duplicada: true };
    }

    const index = articulosActuales.findIndex((item) => item.clave === originalClave);
    if (index < 0) {
      return { duplicada: false };
    }

    const original = articulosActuales[index];
    const nuevaCantidad = Math.round(original.cantidad * Number(candidato.factor));
    const actualizado = await this.construirArticuloReemplazado(
      original,
      originalClave,
      candidato.sustituto,
      nuevaCantidad,
    );

    const articulos = articulosActuales.map((item, itemIndex) => itemIndex === index ? actualizado : item);

    return {
      duplicada: false,
      reemplazo: {
        articulos,
        originalClave,
        sustituto: candidato.sustituto,
        nuevaCantidad,
      },
    };
  }

  aplicarReemplazosMultiples(
    articulosActuales: ArticuloSolicitud[],
    resultados: Array<{ originalClave: string; articulo: ArticuloSolicitud }>,
  ): ReemplazoHomologosMultiplesOutcome {
    const clavesActuales = new Set(articulosActuales.map((item) => this.normClave(item.clave)));
    const aplicados: Array<{ originalClave: string; articulo: ArticuloSolicitud }> = [];
    const conflictos: string[] = [];

    for (const resultado of resultados) {
      const originalNormalizada = this.normClave(resultado.originalClave);
      const nuevaNormalizada = this.normClave(resultado.articulo.clave);
      const duplicadaEnLista = nuevaNormalizada !== originalNormalizada && clavesActuales.has(nuevaNormalizada);
      const duplicadaEnSeleccion = aplicados.some((item) => this.normClave(item.articulo.clave) === nuevaNormalizada);

      if (duplicadaEnLista || duplicadaEnSeleccion) {
        conflictos.push(resultado.articulo.clave);
        continue;
      }

      aplicados.push(resultado);
      clavesActuales.delete(originalNormalizada);
      clavesActuales.add(nuevaNormalizada);
    }

    const articulos = articulosActuales.map((item) => {
      const reemplazo = aplicados.find((resultado) => this.normClave(resultado.originalClave) === this.normClave(item.clave));
      if (!reemplazo) {
        return item;
      }

      return {
        ...item,
        clave: reemplazo.articulo.clave,
        cantidad: reemplazo.articulo.cantidad,
        descripcion: reemplazo.articulo.descripcion || item.descripcion,
        unidadMedida: reemplazo.articulo.unidadMedida || item.unidadMedida,
        presentacion: reemplazo.articulo.presentacion || item.presentacion,
        observaciones: reemplazo.articulo.observaciones || `Reemplaza ${reemplazo.originalClave} .`,
      };
    });

    return { articulos, aplicados, conflictos };
  }

  async aplicarReemplazoDesdeOportunidad(
    articulosActuales: ArticuloSolicitud[],
    originalClave: string,
    originalCantidad: number,
    candidato: MiniBalanceHomologoCand,
  ): Promise<ReemplazoHomologoResult | null> {
    const index = articulosActuales.findIndex((item) => item.clave === originalClave);
    if (index < 0) {
      return null;
    }

    const nuevaCantidad = Math.round(originalCantidad * Number(candidato.factor));
    const actualizado = await this.construirArticuloReemplazado(
      articulosActuales[index],
      originalClave,
      candidato.sustituto,
      nuevaCantidad,
    );

    return {
      articulos: articulosActuales.map((item, itemIndex) => itemIndex === index ? actualizado : item),
      originalClave,
      sustituto: candidato.sustituto,
      nuevaCantidad,
    };
  }

  private async construirArticuloReemplazado(
    original: ArticuloSolicitud,
    originalClave: string,
    sustituto: string,
    nuevaCantidad: number,
  ): Promise<ArticuloSolicitud> {
    const actualizado: ArticuloSolicitud = {
      ...original,
      clave: sustituto,
      cantidad: nuevaCantidad,
      observaciones: `Reemplaza ${originalClave} .`,
    };

    try {
      const respuesta = await firstValueFrom(this.articulosService.buscarArticulos(sustituto));
      const articulo = respuesta?.resultados?.[0];
      if (!articulo) {
        return actualizado;
      }

      return {
        ...actualizado,
        descripcion: articulo.descripcion ?? actualizado.descripcion,
        unidadMedida: articulo.unidadMedida ?? articulo.presentacion ?? actualizado.unidadMedida,
        presentacion: articulo.presentacion ?? actualizado.presentacion,
      };
    } catch {
      return actualizado;
    }
  }

  private normClave(clave: string | undefined | null): string {
    return this.inventarioService.normalizarClave(clave ?? '').trim().toUpperCase();
  }
}
