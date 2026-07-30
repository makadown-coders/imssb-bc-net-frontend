import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { APP_CONFIG, AppConfig } from '../../../core/config/app-config';
import {
  EffectiveFlags,
  FeatureFlagRow,
  NivelSolicitud,
  UnidadAllowlist,
  UpsertFlagPayload,
} from '../../../domain/solicitudes/models/feature-flag.model';

interface EffectiveFlagsResponseDto {
  ok: boolean;
  flags: EffectiveFlags;
}

interface ListFeatureFlagsResponseDto {
  ok: boolean;
  rows: FeatureFlagRow[];
}

interface UpsertFeatureFlagsResponseDto {
  ok: boolean;
  updated: number;
  rows: FeatureFlagRow[];
}

@Injectable({ providedIn: 'root' })
export class SolicitudesConfigApiService {
  private readonly http = inject(HttpClient);
  private readonly config = inject<AppConfig>(APP_CONFIG);

  getEffective(params: { cluesimb?: string; nivel?: NivelSolicitud }): Observable<EffectiveFlags> {
    let httpParams = new HttpParams();
    if (params.cluesimb) {
      httpParams = httpParams.set('cluesimb', params.cluesimb);
    }
    if (params.nivel) {
      httpParams = httpParams.set('nivel', params.nivel);
    }

    return this.http.get<EffectiveFlagsResponseDto>(this.url('/api/solicitudes-config/effective'), { params: httpParams }).pipe(
      map((response) => response.flags ?? {}),
    );
  }

  listFlags(): Observable<FeatureFlagRow[]> {
    return this.http.get<ListFeatureFlagsResponseDto>(this.url('/api/solicitudes-config')).pipe(
      map((response) => response.rows ?? []),
    );
  }

  patchFlags(payload: UpsertFlagPayload[]): Observable<UpsertFeatureFlagsResponseDto> {
    return this.http.patch<UpsertFeatureFlagsResponseDto>(this.url('/api/solicitudes-config'), payload);
  }

  getAllowlistUnidades(query?: string): Observable<UnidadAllowlist[]> {
    const params = query ? new HttpParams().set('q', query.trim()) : undefined;
    return this.http.get<UnidadAllowlist[]>(this.url('/api/solicitudes-config/allowlist-unidades'), { params });
  }

  private url(path: string): string {
    return `${this.config.apiBaseUrl}${path}`;
  }
}
