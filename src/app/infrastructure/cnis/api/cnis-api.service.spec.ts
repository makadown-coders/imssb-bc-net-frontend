import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { APP_CONFIG } from '../../../core/config/app-config';
import { CnisApiService } from './cnis-api.service';

describe('CnisApiService', () => {
  let http: HttpTestingController;
  let service: CnisApiService;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [
      provideHttpClient(), provideHttpClientTesting(),
      { provide: APP_CONFIG, useValue: { apiBaseUrl: 'https://api.example.test', production: false } },
    ] });
    http = TestBed.inject(HttpTestingController);
    service = TestBed.inject(CnisApiService);
  });
  afterEach(() => http.verify());

  it('consulta el catálogo usando APP_CONFIG y conserva el contrato', () => {
    const rows = [{ numero: 16, nombre: 'Oncología' }];
    service.getGrupos().subscribe((result) => expect(result).toEqual(rows));
    const request = http.expectOne('https://api.example.test/api/cnis/grupos-terapeuticos');
    expect(request.request.method).toBe('GET');
    request.flush(rows);
  });

  it('consulta únicamente el grupo seleccionado y conserva campos nulos', () => {
    const rows = [{ clave: '010.000.001.00', descripcion: null, presentacion: null }];
    service.getArticulos(16).subscribe((result) => expect(result).toEqual(rows));
    const request = http.expectOne('https://api.example.test/api/cnis/grupos-terapeuticos/16/articulos');
    expect(request.request.method).toBe('GET');
    request.flush(rows);
  });
});
