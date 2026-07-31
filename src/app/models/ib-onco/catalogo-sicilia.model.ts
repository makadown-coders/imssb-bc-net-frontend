export type CatalogoSiciliaTipo = 'clases' | 'subclases';

export interface CatalogoSiciliaBase {
  id: number;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
  creadoEn: string;
  actualizadoEn: string;
}

export interface OncoClase extends CatalogoSiciliaBase {
  stockFactor: number | null;
}

export type OncoSubclase = CatalogoSiciliaBase;
export type CatalogoSiciliaRow = OncoClase | OncoSubclase;

export interface OncoClasePayload {
  codigo: string;
  nombre: string;
  descripcion: string | null;
  stockFactor: number | null;
  activo: boolean;
}

export interface OncoSubclasePayload {
  codigo: string;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
}

export interface CatalogoSiciliaPage<T> {
  count: number;
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  rows: T[];
}

export interface CatalogoSiciliaQuery {
  q?: string;
  activo?: boolean;
  page: number;
  pageSize: number;
}
