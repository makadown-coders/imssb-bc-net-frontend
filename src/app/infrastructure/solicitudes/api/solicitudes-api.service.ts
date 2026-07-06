import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { APP_CONFIG, AppConfig } from '../../../core/config/app-config';
import { ArticuloCatalogo, ArticuloSolicitud, DatosSolicitud, UnidadSolicitud } from '../../../domain/solicitudes/models/solicitud.model';
import { BuscarArticulosResponseDto, CrearBitacoraRequestDto, CrearBitacoraResponseDto, UnidadSolicitudDto } from './solicitudes-api.contracts';

@Injectable({ providedIn: 'root' })
export class SolicitudesApiService {
  private readonly http = inject(HttpClient);
  private readonly config = inject<AppConfig>(APP_CONFIG);

  getUnidades(): Observable<UnidadSolicitud[]> {
    return this.http.get<UnidadSolicitudDto[]>(this.url('/api/unidades')).pipe(
      map((rows) => rows.filter((row) => Boolean(row.cluesimb)).map((row) => ({
        id: row.id,
        cluesimb: row.cluesimb ?? '',
        cluessa: row.cluessa ?? '',
        nombre: row.nombre_de_unidad ?? row.nombre ?? 'Unidad sin nombre',
        municipio: row.nombre_municipio ?? '',
        localidad: row.nombre_localidad ?? '',
        esSegundoNivel: row.es_segundo_nivel ?? false,
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

  private url(path: string): string { return `${this.config.apiBaseUrl}${path}`; }
}
