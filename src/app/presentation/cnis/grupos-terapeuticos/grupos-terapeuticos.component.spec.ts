import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Observable, Subject, of, throwError } from 'rxjs';
import { ArticuloGrupoTerapeutico } from '../../../domain/cnis/models/grupo-terapeutico.model';
import { CnisApiService } from '../../../infrastructure/cnis/api/cnis-api.service';
import { GruposTerapeuticosComponent } from './grupos-terapeuticos.component';

describe('GruposTerapeuticosComponent', () => {
  const grupos = [{ numero: 16, nombre: 'Oncología' }, { numero: 23, nombre: 'Cuidados paliativos' }];
  let api: { getGrupos: ReturnType<typeof vi.fn>; getArticulos: ReturnType<typeof vi.fn> };
  beforeEach(() => {
    api = { getGrupos: vi.fn(() => of(grupos)), getArticulos: vi.fn(() => of([])) };
    TestBed.configureTestingModule({ imports: [GruposTerapeuticosComponent], providers: [
      { provide: CnisApiService, useValue: api },
    ] });
  });

  it('carga grupos sin descargar artículos hasta seleccionar y muestra el grupo elegido', () => {
    const fixture = TestBed.createComponent(GruposTerapeuticosComponent);
    fixture.detectChanges();
    expect(api.getGrupos).toHaveBeenCalledOnce();
    expect(api.getArticulos).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Selecciona un grupo terapéutico');
    fixture.componentInstance.selectGrupo(16);
    fixture.detectChanges();
    expect(api.getArticulos).toHaveBeenCalledWith(16);
    expect(fixture.nativeElement.textContent).toContain('Grupo 16 — Oncología');
    expect(fixture.nativeElement.textContent).toContain('Este grupo no tiene artículos disponibles');
  });

  it('busca por clave o descripción, pagina y conserva variantes con la misma clave', () => {
    const rows: ArticuloGrupoTerapeutico[] = Array.from({ length: 30 }, (_, i) => ({
      clave: 'clave-' + i, descripcion: i === 29 ? 'Solución especial' : null, presentacion: null,
    }));
    rows.push({ clave: 'clave-0', descripcion: 'Otra descripción', presentacion: 'Caja' });
    api.getArticulos.mockReturnValue(of(rows));
    const fixture = TestBed.createComponent(GruposTerapeuticosComponent);
    const component = fixture.componentInstance;
    component.selectGrupo(16);
    expect(component.rows()).toHaveLength(25);
    component.changePage(2);
    expect(component.rows()).toHaveLength(6);
    component.setSearch('SOLUCION');
    expect(component.page()).toBe(1);
    expect(component.rows()[0].clave).toBe('clave-29');
    component.setSearch('clave-0');
    expect(component.rows()).toHaveLength(2);
    component.setSearch('inexistente');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No hay artículos que coincidan');
    component.setSearch('');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Sin descripción');
    expect(fixture.nativeElement.textContent).toContain('Sin presentación');
  });

  it('cancela la petición anterior al cambiar de grupo y limpia datos y búsqueda', () => {
    const first = new Subject<ArticuloGrupoTerapeutico[]>();
    const second = new Subject<ArticuloGrupoTerapeutico[]>();
    const cancelled = vi.fn();
    api.getArticulos.mockReturnValueOnce(new Observable<ArticuloGrupoTerapeutico[]>((subscriber) => {
      const subscription = first.subscribe(subscriber);
      return () => { cancelled(); subscription.unsubscribe(); };
    })).mockReturnValueOnce(second);
    const fixture = TestBed.createComponent(GruposTerapeuticosComponent);
    const component = fixture.componentInstance;
    component.selectGrupo(16);
    component.setSearch('anterior');
    component.selectGrupo(23);
    expect(cancelled).toHaveBeenCalledOnce();
    expect(component.search()).toBe('');
    expect(component.loadingArticulos()).toBe(true);
    first.next([{ clave: 'anterior', descripcion: null, presentacion: null }]);
    second.next([{ clave: 'actual', descripcion: null, presentacion: null }]);
    second.complete();
    expect(component.articulos().map((r) => r.clave)).toEqual(['actual']);
    expect(component.loadingArticulos()).toBe(false);
  });

  it('muestra un error de permisos y permite reintentar sin confundirlo con lista vacía', () => {
    api.getArticulos.mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 403 })))
      .mockReturnValueOnce(of([{ clave: 'recuperada', descripcion: null, presentacion: null }]));
    const fixture = TestBed.createComponent(GruposTerapeuticosComponent);
    fixture.componentInstance.selectGrupo(16);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No tienes permisos');
    expect(fixture.nativeElement.textContent).not.toContain('Este grupo no tiene');
    fixture.componentInstance.retryArticulos();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('recuperada');
    expect(fixture.componentInstance.errorArticulos()).toBe('');
  });

  it('permite recuperar un fallo al cargar el catálogo', () => {
    api.getGrupos.mockReturnValueOnce(throwError(() => new Error('red'))).mockReturnValueOnce(of(grupos));
    const fixture = TestBed.createComponent(GruposTerapeuticosComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No fue posible cargar los grupos');
    fixture.componentInstance.loadGrupos();
    expect(fixture.componentInstance.grupos()).toEqual(grupos);
    expect(fixture.componentInstance.errorGrupos()).toBe('');
  });

  it('muestra un catálogo vacío y cancela peticiones al destruir la pantalla', () => {
    api.getGrupos.mockReturnValue(of([]));
    const empty = TestBed.createComponent(GruposTerapeuticosComponent);
    empty.detectChanges();
    expect(empty.nativeElement.textContent).toContain('No hay grupos terapéuticos');
    empty.destroy();
    api.getGrupos.mockReturnValue(of(grupos));
    const cancelled = vi.fn();
    api.getArticulos.mockReturnValue(new Observable(() => cancelled));
    const fixture = TestBed.createComponent(GruposTerapeuticosComponent);
    fixture.componentInstance.selectGrupo(16);
    fixture.destroy();
    expect(cancelled).toHaveBeenCalledOnce();
  });
});
