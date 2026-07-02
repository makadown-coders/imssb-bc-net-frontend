import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Observable, Subject, debounceTime, distinctUntilChanged, finalize } from 'rxjs';
import { UnidadMedica } from '../../../domain/catalogos/models/catalogo.model';
import { Persona, Role } from '../../../domain/personas/models/persona.model';
import { CatalogosApiService } from '../../../infrastructure/catalogos/api/catalogos-api.service';
import { PersonaRequest, PersonasApiService, ProvisionarUsuarioRequest } from '../../../infrastructure/personas/api/personas-api.service';
import { PersonaFormDialogComponent } from './persona-form-dialog.component';
import { ProvisionarUsuarioDialogComponent } from './provisionar-usuario-dialog.component';
import { ResetPasswordDialogComponent } from './reset-password-dialog.component';
import { TokenStoragePort } from '../../../infrastructure/auth/storage/token-storage.port';
import { hasTokenRole } from '../../../core/auth/jwt-claims';

@Component({
  selector: 'app-admin-personas',
  imports: [MatAutocompleteModule, MatButtonModule, MatDialogModule, MatFormFieldModule, MatIconModule, MatInputModule, MatProgressSpinnerModule, MatSnackBarModule, MatTooltipModule],
  templateUrl: './admin-personas.component.html',
  styleUrl: './admin-personas.component.scss',
})
export class AdminPersonasComponent implements OnInit {
  private readonly api = inject(PersonasApiService);
  private readonly catalogosApi = inject(CatalogosApiService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly tokenStorage = inject(TokenStoragePort);
  private readonly destroyRef = inject(DestroyRef);
  private readonly queryChanges = new Subject<string>();

  readonly personas = signal<Persona[]>([]);
  readonly unidadesMedicas = signal<UnidadMedica[]>([]);
  readonly roles = signal<Role[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly query = signal('');
  readonly unidadMedicaId = signal<number | null>(null);
  readonly activo = signal<boolean | null>(null);
  readonly unidadSearch = signal('');
  readonly estadoSearch = signal('');
  readonly estados = [
    { label: 'Todos los estados', value: null },
    { label: 'Activas', value: true },
    { label: 'Bajas', value: false },
  ] as const;
  readonly unidadesFiltradas = computed(() => {
    // Si el texto coincide con la selección actual, al reabrir se muestran todas las opciones.
    const selectedLabel = this.unidadMedicaId() === null
      ? 'Todas las unidades'
      : this.unidadesMedicas().find((unidad) => unidad.id === this.unidadMedicaId())?.nombre ?? '';
    const enteredSearch = normalize(this.unidadSearch());
    const search = enteredSearch === normalize(selectedLabel) ? '' : enteredSearch;
    return search
      ? this.unidadesMedicas().filter((unidad) => normalize(unidad.nombre).includes(search))
      : this.unidadesMedicas();
  });
  readonly estadosFiltrados = computed(() => {
    const selectedLabel = this.estados.find((estado) => estado.value === this.activo())?.label ?? '';
    const enteredSearch = normalize(this.estadoSearch());
    const search = enteredSearch === normalize(selectedLabel) ? '' : enteredSearch;
    return search ? this.estados.filter((estado) => normalize(estado.label).includes(search)) : this.estados;
  });
  readonly isAdminTic = signal(hasTokenRole(this.tokenStorage.getAccessToken(), 'ADMIN_TIC'));

  ngOnInit(): void {
    this.queryChanges.pipe(
      debounceTime(350),
      distinctUntilChanged(),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(() => this.loadPersonas());
    this.catalogosApi.getUnidadesMedicas({ activo: true }).subscribe((items) => this.unidadesMedicas.set(items));
    this.api.getRoles().subscribe({
      next: (items) => this.roles.set(items),
      error: () => this.showError('No fue posible cargar los roles.'),
    });
    this.loadPersonas();
  }

  loadPersonas(): void {
    this.loading.set(true);
    this.api
      .getPersonas({
        q: this.query().trim(),
        unidadMedicaId: this.unidadMedicaId(),
        activo: this.activo(),
      })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({ next: (items) => this.personas.set(items), error: () => this.showError('No fue posible cargar las personas.') });
  }

  search(value: string): void {
    this.query.set(value);
    this.queryChanges.next(value.trim());
  }

  searchUnidad(value: string): void {
    this.unidadSearch.set(value);
  }

  filterByUnidad(value: number | null): void {
    this.unidadMedicaId.set(value);
    this.unidadSearch.set(value === null ? 'Todas las unidades' : this.unidadesMedicas().find((unidad) => unidad.id === value)?.nombre ?? '');
    this.loadPersonas();
  }

  searchEstado(value: string): void {
    this.estadoSearch.set(value);
  }

  filterByStatus(value: boolean | null): void {
    this.activo.set(value);
    this.estadoSearch.set(this.estados.find((estado) => estado.value === value)?.label ?? '');
    this.loadPersonas();
  }

  clearFilters(): void {
    this.query.set('');
    this.unidadMedicaId.set(null);
    this.activo.set(null);
    this.unidadSearch.set('');
    this.estadoSearch.set('');
    this.loadPersonas();
  }

  openForm(persona: Persona | null): void {
    this.dialog
      .open(PersonaFormDialogComponent, { width: '760px', maxWidth: '96vw', data: { persona, unidadesMedicas: this.unidadesMedicas() } })
      .afterClosed()
      .subscribe((request: PersonaRequest | undefined) => {
        if (!request) return;
        this.saving.set(true);
        const action$: Observable<unknown> = persona
          ? this.api.updatePersona(persona.id, request)
          : this.api.createPersona(request);
        action$.pipe(finalize(() => this.saving.set(false))).subscribe({
          next: () => { this.snackBar.open(persona ? 'Persona actualizada.' : 'Persona creada.', 'Cerrar', { duration: 2800 }); this.loadPersonas(); },
          error: () => this.showError('No fue posible guardar la persona.'),
        });
      });
  }

  deactivate(persona: Persona): void {
    if (!window.confirm(`¿Dar de baja a ${persona.nombreCompleto}?`)) return;
    this.saving.set(true);
    this.api.deactivatePersona(persona.id).pipe(finalize(() => this.saving.set(false))).subscribe({
      next: () => { this.snackBar.open('Persona dada de baja.', 'Cerrar', { duration: 2800 }); this.loadPersonas(); },
      error: () => this.showError('No fue posible dar de baja a la persona.'),
    });
  }

  provisionarUsuario(persona: Persona): void {
    if (!persona.correoPrincipal) {
      this.showError('La persona necesita un correo principal antes de crear su cuenta.');
      return;
    }
    this.dialog
      .open(ProvisionarUsuarioDialogComponent, { width: '520px', maxWidth: '94vw', data: { persona, roles: this.roles() } })
      .afterClosed()
      .subscribe((request: ProvisionarUsuarioRequest | undefined) => {
        if (!request) return;
        this.saving.set(true);
        this.api.provisionarUsuario(persona.id, request).pipe(finalize(() => this.saving.set(false))).subscribe({
          next: () => { this.snackBar.open('Cuenta creada y vinculada.', 'Cerrar', { duration: 3000 }); this.loadPersonas(); },
          error: () => this.showError('No fue posible crear la cuenta. Revisa el correo y el rol.'),
        });
      });
  }

  resetPassword(persona: Persona): void {
    if (!this.isAdminTic() || !persona.userId) return;
    this.dialog
      .open(ResetPasswordDialogComponent, { width: '520px', maxWidth: '94vw', data: persona })
      .afterClosed()
      .subscribe((newPassword: string | undefined) => {
        if (!newPassword || !persona.userId) return;
        this.saving.set(true);
        this.api.resetPassword(persona.userId, newPassword).pipe(finalize(() => this.saving.set(false))).subscribe({
          next: () => this.snackBar.open('Contraseña restablecida correctamente.', 'Cerrar', { duration: 3500 }),
          error: () => this.showError('No fue posible restablecer la contraseña.'),
        });
      });
  }

  private showError(message: string): void {
    this.snackBar.open(message, 'Cerrar', { duration: 4000 });
  }
}

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}
