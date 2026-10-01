export interface GrupoTerapeutico {
  numero: number;
  nombre: string;
}

export interface ArticuloGrupoTerapeutico {
  clave: string;
  descripcion: string | null;
  presentacion: string | null;
}
