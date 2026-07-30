export interface UnidadSolicitudDto {
  id: number;
  cluessa: string | null;
  cluesimb: string | null;
  nombre_de_unidad?: string | null;
  nombre?: string | null;
  nombre_municipio?: string | null;
  nombre_localidad?: string | null;
  es_segundo_nivel?: boolean | null;
  nivel_atencion?: string | null;
  tipo_unidad?: string | null;
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

export interface CpmEditorRowDto {
  clave_cnis: string;
  cpm: number;
  fuente?: string | null;
}

export interface CpmExpectedRowDto {
  unidad_medica_id?: number | null;
  cluesimb?: string | null;
  cluessa?: string | null;
  nombre_unidad?: string | null;
  nombre_tipologia?: string | null;
  kit_codigo?: string | null;
  kit_ids?: number[] | null;
  kit_codigos?: string[] | null;
  kit_codigos_txt?: string | null;
  clave_cnis?: string | null;
  cpm?: number | null;
  en_cpm?: boolean | null;
  fuentes?: string[] | null;
}

export interface CpmRowsResponseDto<T> {
  count: number;
  rows: T[];
}

export interface ExistenciaUnidadRowDto {
  clave_cnis: string;
  descripcion: string;
  existencia_total: number;
}

export interface ExistenciaRowsResponseDto {
  rows: ExistenciaUnidadRowDto[];
}

export interface TemporalExistenciaRowDto {
  fuente: string;
  alias_sas?: string | null;
  cluessa?: string | null;
  cluesimb?: string | null;
  clave_cnis: string;
  lote?: string | null;
  fecha_caducidad?: string | null;
  existencia: number;
}

export interface TemporalExistenciaRowsResponseDto {
  count: number;
  rows: TemporalExistenciaRowDto[];
}

export interface HomologoEdgeDto {
  claveConsultada: string;
  candidato: string;
  factor: string;
  direccion: string;
}

export interface HomologoRowsResponseDto {
  rows: HomologoEdgeDto[];
}
