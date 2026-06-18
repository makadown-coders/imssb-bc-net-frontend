export interface TipoUnidad {
  id: number;
  nombreTipo: string;
}

export interface Municipio {
  id: number;
  nombreMunicipio: string;
}

export interface Localidad {
  id: number;
  nombreLocalidad: string;
  municipioId: number | null;
  nombreMunicipio: string | null;
}

export interface UnidadMedica {
  id: number;
  cluessa: string | null;
  cluesimb: string | null;
  nombre: string;
  direccion: string | null;
  latitud: number | null;
  longitud: number | null;
  estratoUnidad: string | null;
  nivelAtencion: string | null;
  tipoUnidadId: number | null;
  nombreTipoUnidad: string | null;
  localidadId: number | null;
  nombreLocalidad: string | null;
  municipioId: number | null;
  nombreMunicipio: string | null;
  activo: boolean;
}

export interface Tipologia {
  id: number;
  nombre: string;
  esSegundoNivel: boolean | null;
}

export interface TipologiaUnidad {
  id: number;
  unidadMedicaId: number;
  nombreUnidadMedica: string;
  tipologiaId: number;
  nombreTipologia: string;
  fuente: string | null;
  creadoEn: string | null;
}

export type CatalogoKey =
  | 'tipo-unidad'
  | 'municipios'
  | 'localidades'
  | 'unidades-medicas'
  | 'tipologias'
  | 'tipologias-unidad';
