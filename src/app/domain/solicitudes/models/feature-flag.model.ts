export type FlagKey =
  | 'SOLO_CPMS'
  | 'BUSCAR_EXISTENCIA_EN_CLUES'
  | 'APLICAR_ENCUESTAS'
  | 'APLICAR_EQUIVALENCIAS'
  | 'CLUES_EXISTENCIAS_ALLOWLIST'
  | 'IMPORT_LIMIT_TO_KIT'
  | 'EDIT_CPMS';

export type FlagScope = 'global' | 'nivel' | 'clues';
export type NivelSolicitud = 'PRIMER_NIVEL' | 'SEGUNDO_NIVEL';

export interface EffectiveFlags {
  [key: string]: unknown;
}

export interface FeatureFlagRow {
  id: number;
  flag_key: string;
  scope: FlagScope;
  scope_id: string | null;
  value_json: unknown;
  description?: string | null;
  updated_by?: string | null;
  updated_at: string;
}

export interface UpsertFlagPayload {
  flag_key: FlagKey;
  scope: FlagScope;
  scope_id?: string | null;
  value: unknown;
}

export interface UnidadAllowlist {
  cluesimb: string;
  nombre: string;
  alias_dash: string;
}
