export interface UnidadSolicitudDto {
  id: number;
  cluessa: string | null;
  cluesimb: string | null;
  nombre_de_unidad?: string | null;
  nombre?: string | null;
  nombre_municipio?: string | null;
  nombre_localidad?: string | null;
  es_segundo_nivel?: boolean | null;
}

export interface ArticuloSolicitudDto {
  clave: string;
  descripcion: string;
  unidadMedida?: string | null;
  presentacion?: string | null;
}

export interface BuscarArticulosResponseDto {
  resultados: ArticuloSolicitudDto[];
  total: number;
}

export interface CrearBitacoraRequestDto {
  cluesimb: string;
  tipoPedido: 'Ordinario' | 'Extraordinario';
  tipoInsumo: string;
  periodo: string;
  articulos: Array<{ clave: string; cantidad: number }>;
}

export interface CrearBitacoraResponseDto {
  ok: boolean;
  solicitudId: string;
  deduped: boolean;
  payloadHash: string;
}
