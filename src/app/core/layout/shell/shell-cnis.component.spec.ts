import { BreakpointObserver } from '@angular/cdk/layout';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AuthStore } from '../../../application/auth/state/auth.store';
import { TokenStoragePort } from '../../../infrastructure/auth/storage/token-storage.port';
import { ShellComponent } from './shell.component';

describe('Menú CNIS', () => {
  it.each([
    ['ADMIN_TIC', true], ['IB_ONCO', true], ['UNIDAD_MEDICA', true], ['ENFERMERIA', true],
    ['COORDINACION', false], ['ABASTO', false], ['SOLICITUDES_ABASTO', false],
  ])('muestra la consulta según el rol %s dentro de Proyectos en Salud', (role, expected) => {
    const token = 'test.' + btoa(JSON.stringify({ role })) + '.test';
    TestBed.configureTestingModule({ imports: [ShellComponent], providers: [
      provideRouter([]),
      { provide: TokenStoragePort, useValue: { getAccessToken: () => token } },
      { provide: BreakpointObserver, useValue: { observe: () => of({ matches: false }) } },
      { provide: AuthStore, useValue: {
        isAuthenticated: signal(true), currentUser: signal({ email: 'prueba@example.test' }),
        restoreSession: vi.fn(),
      } },
    ] });
    const fixture = TestBed.createComponent(ShellComponent);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const link = element.querySelector<HTMLAnchorElement>('a[href="/cnis/grupos-terapeuticos"]');
    expect(!!link).toBe(expected);
    if (link) expect(link.closest('section')?.querySelector('h2')?.textContent).toBe('Proyectos en Salud');
  });
});
