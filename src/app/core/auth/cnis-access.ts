import { hasTokenRole } from './jwt-claims';

// Refleja CnisReadAccess; la autorización efectiva se valida en el backend.
export function canReadCnis(token: string | null): boolean {
  return ['ADMIN_TIC', 'IB_ONCO', 'UNIDAD_MEDICA', 'ENFERMERIA']
    .some((role) => hasTokenRole(token, role));
}
