export type TipoPedido = 'Ordinario' | 'Extraordinario';

export interface UnidadSolicitud {
  id: number;
  cluesimb: string;
  cluessa: string;
  nombre: string;
  municipio: string;
  localidad: string;
  esSegundoNivel: boolean;
  nivelAtencion?: string;
  tipoUnidad?: string;
}

export interface ArticuloCatalogo {
  clave: string;
  descripcion: string;
  presentacion: string;
  cpm?: number;
  existenciaUnidad?: number;
  existenciaEstatal?: number;
  existenciasAzm?: number;
  existenciasAze?: number;
  existenciasAzt?: number;
  enKit?: boolean;
  homologos?: number;
  existenciaHomologosEstatal?: number;
  mejorAlmacen?: string;
  recomendacionAbasto?: string;
  mejorHomologoClave?: string;
  mejorHomologoStock?: number;
  mejorHomologoAlmacen?: string;
}

export interface ArticuloSolicitud extends ArticuloCatalogo {
  cantidad: number;
  observaciones: string;
}

export type NivelCaptura = 'PRIMER_NIVEL' | 'SEGUNDO_NIVEL';

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
