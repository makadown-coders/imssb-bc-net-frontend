export type TipoPedido = 'Ordinario' | 'Extraordinario';

export interface UnidadSolicitud {
  id: number;
  cluesimb: string;
  cluessa: string;
  nombre: string;
  municipio: string;
  localidad: string;
  esSegundoNivel: boolean;
}

export interface ArticuloCatalogo {
  clave: string;
  descripcion: string;
  presentacion: string;
}

export interface ArticuloSolicitud extends ArticuloCatalogo {
  cantidad: number;
  observaciones: string;
}

export interface DatosSolicitud {
  unidad: UnidadSolicitud;
  tipoInsumo: string;
  tipoPedido: TipoPedido;
  responsableCaptura: string;
  fechaInicio: string;
  fechaFin: string;
}

export interface BorradorSolicitud {
  version: 1;
  datos: DatosSolicitud | null;
  articulos: ArticuloSolicitud[];
  actualizadoEn: string;
}
