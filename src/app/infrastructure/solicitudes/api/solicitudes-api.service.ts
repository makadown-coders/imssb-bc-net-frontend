import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable, shareReplay } from 'rxjs';
import { APP_CONFIG, AppConfig } from '../../../core/config/app-config';
import { ArticuloCatalogo, ArticuloSolicitud, DatosSolicitud, NivelCaptura, UnidadSolicitud } from '../../../domain/solicitudes/models/solicitud.model';
import {
  BuscarArticulosResponseDto,
  CpmEditorRowDto,
  CpmExpectedRowDto,
  CpmRowsResponseDto,
  CrearBitacoraRequestDto,
  CrearBitacoraResponseDto,
  ExistenciaRowsResponseDto,
  HomologoRowsResponseDto,
  TemporalExistenciaRowsResponseDto,
  UnidadSolicitudDto,
} from './solicitudes-api.contracts';

@Injectable({ providedIn: 'root' })
export class SolicitudesApiService {
  private readonly http = inject(HttpClient);
  private readonly config = inject<AppConfig>(APP_CONFIG);
  private almacenesInventory$?: Observable<TemporalExistenciaRowsResponseDto>;

  getUnidades(nivel?: NivelCaptura): Observable<UnidadSolicitud[]> {
    let params = new HttpParams();
    if (nivel) {
      params = params.set('nivel', nivel);
    }

    return this.http.get<UnidadSolicitudDto[]>(this.url('/api/unidades'), { params }).pipe(
      map((rows) => rows.filter((row) => Boolean(row.cluesimb)).map((row) => ({
        id: row.id,
        cluesimb: row.cluesimb ?? '',
        cluessa: row.cluessa ?? '',
        nombre: row.nombre_de_unidad ?? row.nombre ?? 'Unidad sin nombre',
        municipio: row.nombre_municipio ?? '',
        localidad: row.nombre_localidad ?? '',
        esSegundoNivel: row.es_segundo_nivel ?? false,
        nivelAtencion: row.nivel_atencion ?? '',
        tipoUnidad: row.tipo_unidad ?? '',
      }))),
    );
  }

  buscarArticulos(query: string): Observable<{ resultados: ArticuloCatalogo[]; total: number }> {
    const params = new HttpParams().set('q', query.trim());
    return this.http.get<BuscarArticulosResponseDto>(this.url('/api/articulos'), { params }).pipe(
      map((response) => ({
        total: response.total,
        resultados: response.resultados.map((item) => ({
          clave: item.clave,
          descripcion: item.descripcion,
          presentacion: item.unidadMedida || item.presentacion || '',
        })),
      })),
    );
  }

  registrar(datos: DatosSolicitud, articulos: ArticuloSolicitud[]): Observable<CrearBitacoraResponseDto> {
    const request: CrearBitacoraRequestDto = {
      cluesimb: datos.unidad.cluesimb,
      tipoPedido: datos.tipoPedido,
      tipoInsumo: datos.tipoInsumo,
      periodo: `${datos.fechaInicio} - ${datos.fechaFin}`,
      articulos: articulos.map(({ clave, cantidad }) => ({ clave, cantidad })),
    };
    return this.http.post<CrearBitacoraResponseDto>(this.url('/api/solicitudes/bitacora'), request);
  }

  getArticulosByCluesimbCpm(cluesimb: string): Observable<Record<string, ArticuloCatalogo>> {
    const params = new HttpParams().set('cluesimb', cluesimb.trim().toUpperCase());
    return this.http.get<BuscarArticulosResponseDto>(this.url('/api/articulos/by-cluesimb-cpm'), { params }).pipe(
      map((response) => Object.fromEntries(response.resultados.map((item) => [
        item.clave,
        {
          clave: item.clave,
          descripcion: item.descripcion,
          presentacion: item.unidadMedida || item.presentacion || '',
        } satisfies ArticuloCatalogo,
      ]))),
    );
  }

  getCpmByUnidadAll(cluesimb: string): Observable<CpmEditorRowDto[]> {
    const params = new HttpParams().set('cluesimb', cluesimb.trim().toUpperCase());
    return this.http.get<CpmRowsResponseDto<CpmEditorRowDto>>(this.url('/api/cpms/by-unidad-all'), { params }).pipe(
      map((response) => response.rows ?? []),
    );
  }

  getExpectedVs(cluesimb: string): Observable<CpmExpectedRowDto[]> {
    const params = new HttpParams().set('cluesimb', cluesimb.trim().toUpperCase());
    return this.http.get<CpmRowsResponseDto<CpmExpectedRowDto>>(this.url('/api/cpms/expected-vs'), { params }).pipe(
      map((response) => response.rows ?? []),
    );
  }

  getExistenciasByUnidad(cluesimb: string): Observable<ExistenciaRowsResponseDto> {
    const params = new HttpParams().set('cluesimb', cluesimb.trim().toUpperCase());
    return this.http.get<ExistenciaRowsResponseDto>(this.url('/api/existencias-temp/by-unidad'), { params });
  }

  getExistenciasAlmacenesFull(): Observable<TemporalExistenciaRowsResponseDto> {
    this.almacenesInventory$ ??= this.http
      .get<TemporalExistenciaRowsResponseDto>(this.url('/api/existencias-temp/almacenes-full'))
      .pipe(shareReplay(1));
    return this.almacenesInventory$;
  }

  getHomologosBatch(claves: string[]): Observable<HomologoRowsResponseDto> {
    return this.http.post<HomologoRowsResponseDto>(this.url('/api/homologos/batch-forward'), {
      claves: claves.map((item) => item.trim().toUpperCase()).filter(Boolean),
    });
  }

  private url(path: string): string { return `${this.config.apiBaseUrl}${path}`; }
}
