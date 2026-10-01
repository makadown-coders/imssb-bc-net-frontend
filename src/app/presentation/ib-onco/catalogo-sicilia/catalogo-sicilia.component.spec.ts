import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { NgFastToastService } from 'ng-fast-toast';
import { CatalogoSiciliaApiService } from '../../../infrastructure/ib-onco/catalogo-sicilia-api.service';
import { CatalogoSiciliaComponent } from './catalogo-sicilia.component';

describe('CatalogoSiciliaComponent', () => {
  const api = {
    listClases: vi.fn(() => of({ count: 0, total: 0, page: 1, pageSize: 20, totalPages: 0, rows: [] })),
    listSubclases: vi.fn(() => of({ count: 0, total: 0, page: 1, pageSize: 20, totalPages: 0, rows: [] })),
    createClase: vi.fn((payload) => of({
      id: 1,
      ...payload,
      creadoEn: '2026-07-30T00:00:00Z',
      actualizadoEn: '2026-07-30T00:00:00Z',
    })),
    updateClase: vi.fn((id, payload) => of({
      id,
      ...payload,
      creadoEn: '2026-07-30T00:00:00Z',
      actualizadoEn: '2026-07-30T01:00:00Z',
    })),
    createSubclase: vi.fn(),
    updateSubclase: vi.fn(),
    deactivateClase: vi.fn(),
    deactivateSubclase: vi.fn(),
  };

  beforeEach(() => {
    Object.values(api).forEach((mock) => mock.mockClear());
    TestBed.configureTestingModule({
      imports: [CatalogoSiciliaComponent],
      providers: [
        { provide: CatalogoSiciliaApiService, useValue: api },
        { provide: NgFastToastService, useValue: { success: vi.fn(), error: vi.fn() } },
      ],
    });
  });

  it('envía una descripción multilínea al crear una clase', () => {
    const fixture = TestBed.createComponent(CatalogoSiciliaComponent);
    const component = fixture.componentInstance;
    const descripcion = [
      '* Medicamentos Básicos',
      '* Uso Diario',
      '* Contenido en U-13',
      '* Contenidos en Farmacia',
      '* Consumo Basado en Máximos y Mínimos',
      '* Revisión en SACIA-O: Semanal',
      '* Caducidad Aceptable: 30 - 90 días',
      '* Stock: CPM * 2.0',
    ].join('\n');

    component.openCreate();
    component.form.setValue({
      codigo: 'I',
      nombre: 'Clase I',
      descripcion,
      stockFactor: 2,
      activo: true,
    });
    component.save();

    expect(api.createClase).toHaveBeenCalledWith({
      codigo: 'I',
      nombre: 'Clase I',
      descripcion,
      stockFactor: 2,
      activo: true,
    });
  });

  it('muestra una explicación cuando el formulario no es válido', () => {
    const fixture = TestBed.createComponent(CatalogoSiciliaComponent);
    const component = fixture.componentInstance;

    component.openCreate();
    component.save();

    expect(api.createClase).not.toHaveBeenCalled();
    expect(component.formMessage()).toBe('Revisa los campos señalados antes de guardar.');
  });

  it('actualiza una clase al hacer clic en Guardar', () => {
    const fixture = TestBed.createComponent(CatalogoSiciliaComponent);
    const component = fixture.componentInstance;
    const descripcion = '* Medicamentos Básicos\n* Uso Diario\n* Stock: CPM * 2.0';

    component.openEdit({
      id: 7,
      codigo: 'I',
      nombre: 'Clase I',
      descripcion: null,
      stockFactor: 2,
      activo: true,
      creadoEn: '2026-07-30T00:00:00Z',
      actualizadoEn: '2026-07-30T00:00:00Z',
    });
    component.form.controls.descripcion.setValue(descripcion);
    fixture.detectChanges();

    const saveButton = fixture.nativeElement.querySelector('.modal footer .btn.primary') as HTMLButtonElement;
    saveButton.click();

    expect(api.updateClase).toHaveBeenCalledWith(7, {
      codigo: 'I',
      nombre: 'Clase I',
      descripcion,
      stockFactor: 2,
      activo: true,
    });
  });
});
