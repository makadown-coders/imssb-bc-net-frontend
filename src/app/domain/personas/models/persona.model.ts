export interface Persona {
  id: number;
  nombreCompleto: string;
  nombres: string;
  apellidos: string;
  cargo: string | null;
  unidadMedicaId: number | null;
  nombreUnidadMedica: string | null;
  rfc: string | null;
  curp: string | null;
  correoPrincipal: string | null;
  username: string | null;
  activo: boolean;
  fechaBaja: string | null;
  userId: string | null;
  userEmail: string | null;
  creadoEn: string;
  actualizadoEn: string;
}

export interface Role {
  code: string;
  descripcion: string;
}
