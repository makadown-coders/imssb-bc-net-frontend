// src/app/services/existencias-temp.service.ts
import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { APP_CONFIG, AppConfig } from '../core/config/app-config';
import { map, Observable, of, tap } from 'rxjs';

export type Fuente = 'SAS' | 'SALUS' | 'SALUS_INDICADORES';
export type TempRow = {
  fuente: Fuente;
  alias_sas?: string | null;
  cluessa?: string | null;
  cluesimb?: string | null;
  clave_cnis: string;
  lote?: string | null;
  fecha_caducidad?: string | null;
  existencia: number;
};

export interface ExistUnidadRow {
  clave_cnis: string;
  existencia_total: number;
}
interface ExistUnidadResp { rows: ExistUnidadRow[]; }

@Injectable({ providedIn: 'root' })
export class ExistenciasTempService {
  private readonly http = inject(HttpClient);
  private readonly config = inject<AppConfig>(APP_CONFIG);
  private readonly baseUrl = this.url('/api/existencias-temp');

  // cache diario por unidad (memoria)
  private cache = new Map<string, { ts: number; rows: ExistUnidadRow[] }>();

  private url(path: string): string {
    return `${this.config.apiBaseUrl}${path}`;
  }

  init(reset = true) {
    return this.http.post<{ ok: true }>(`${this.baseUrl}/init?reset=${reset}`, {});
  }

  batch(rows: TempRow[]) {
    return this.http.post<{ inserted: number }>(`${this.baseUrl}/batch`, { rows });
  }

  /**
   * Devuelve la existencia total por clave_cnis de la unidad con CLUES IMB
   * dado, o vacÃ­o si no hay clave. La respuesta se almacena en cache (memoria)
   * por unidad y se devuelve directo en caso de que el request sea del mismo
   * dÃ­a (se asume que no cambia en un dÃ­a). Se puede forzar la recarga pasando
   * { force: true } en el segundo par metro.
   * @param cluesimb CLUES IMB de la unidad
   * @param opts Opciones extras; si { force: true } se fuerza la recarga
   */
  byUnidad(cluesimb: string, opts?: { force?: boolean }): Observable<ExistUnidadRow[]> {
    const key = (cluesimb || '').trim().toUpperCase();
    if (!key) return of([]);

    const now = Date.now();
    const hit = this.cache.get(key);
    const sameDay = hit && new Date(hit.ts).toDateString() === new Date(now).toDateString();

    if (!opts?.force && hit && sameDay) return of(hit.rows);

    return this.http
      .get<ExistUnidadResp>(`${this.baseUrl}/by-unidad?cluesimb=${encodeURIComponent(key)}`)
      .pipe(
        map(r => r?.rows ?? []),
        tap(rows => this.cache.set(key, { ts: now, rows }))
      );
  }

}
