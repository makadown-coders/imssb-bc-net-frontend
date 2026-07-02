export interface ManagedUserRole {
  code: string;
  descripcion: string;
  assignedAt: string;
}

export interface ManagedUser {
  id: string;
  email: string;
  isActive: boolean;
  createdAt: string;
  personaId: number | null;
  nombrePersona: string | null;
  unidadId: number | null;
  nombreUnidad: string | null;
  roles: ManagedUserRole[];
}
