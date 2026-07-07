import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideEraser, lucideKeyRound, lucidePencil, lucideRefreshCw, lucideSearch, lucideUserMinus, lucideUserPlus, lucideUsersRound } from '@ng-icons/lucide';
import { toast } from '@spartan-ng/brain/sonner';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmDialogService } from '@spartan-ng/helm/dialog';
import { HlmInput } from '@spartan-ng/helm/input';
import { HlmSpinner } from '@spartan-ng/helm/spinner';
import { Observable, Subject, debounceTime, distinctUntilChanged, finalize } from 'rxjs';
import { hasTokenRole } from '../../../core/auth/jwt-claims';
import { UnidadMedica } from '../../../domain/catalogos/models/catalogo.model';
import { Persona, Role } from '../../../domain/personas/models/persona.model';
import { TokenStoragePort } from '../../../infrastructure/auth/storage/token-storage.port';
import { CatalogosApiService } from '../../../infrastructure/catalogos/api/catalogos-api.service';
import { PersonaRequest, PersonasApiService, ProvisionarUsuarioRequest } from '../../../infrastructure/personas/api/personas-api.service';
import { SearchableSelectComponent, SearchableSelectValue } from '../../../shared/components/searchable-select/searchable-select.component';
import { PersonaFormDialogComponent } from './persona-form-dialog.component';
import { ProvisionarUsuarioDialogComponent } from './provisionar-usuario-dialog.component';
import { ResetPasswordDialogComponent } from './reset-password-dialog.component';

@Component({
  selector: 'app-admin-personas',
  imports: [NgIcon, HlmButton, HlmInput, HlmSpinner, SearchableSelectComponent],
  providers: [provideIcons({ lucideEraser, lucideKeyRound, lucidePencil, lucideRefreshCw, lucideSearch, lucideUserMinus, lucideUserPlus, lucideUsersRound })],
  templateUrl: './admin-personas.component.html',
  styleUrl: './admin-personas.component.scss',
})
export class AdminPersonasComponent implements OnInit {
  private readonly api = inject(PersonasApiService);
  private readonly catalogosApi = inject(CatalogosApiService);
  private readonly dialog = inject(HlmDialogService);
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
  readonly estados = [
    { label: 'Todos los estados', value: null },
    { label: 'Activas', value: true },
    { label: 'Bajas', value: false },
  ] as const;
  readonly unidadOptions = computed(() => [
    { label: 'Todas las unidades', value: null, keywords: 'todas' },
    ...this.unidadesMedicas().map((unidad) => ({
      label: unidad.nombre,
      value: unidad.id,
      keywords: `${unidad.cluessa ?? ''} ${unidad.cluesimb ?? ''} ${unidad.nombreMunicipio ?? ''}`,
    })),
  ]);
  readonly statusOptions = this.estados.map((estado) => ({
    label: estado.label,
    value: estado.value,
    keywords: estado.label,
  }));
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

  onUnidadChange(value: SearchableSelectValue): void {
    this.filterByUnidad(typeof value === 'number' || value === null ? value : null);
  }

  onStatusChange(value: SearchableSelectValue): void {
    this.filterByStatus(typeof value === 'boolean' || value === null ? value : null);
  }

  filterByUnidad(value: number | null): void {
    this.unidadMedicaId.set(value);
    this.loadPersonas();
  }

  filterByStatus(value: boolean | null): void {
    this.activo.set(value);
    this.loadPersonas();
  }

  clearFilters(): void {
    this.query.set('');
    this.unidadMedicaId.set(null);
    this.activo.set(null);
    this.loadPersonas();
  }

  openForm(persona: Persona | null): void {
    this.dialog
      .open(PersonaFormDialogComponent, { contentClass: 'sm:max-w-[760px]', context: { persona, unidadesMedicas: this.unidadesMedicas() } })
      .closed$
      .subscribe((result) => {
        const request = result as PersonaRequest | undefined;
        if (!request) {
          return;
        }

        this.saving.set(true);
        const action$: Observable<unknown> = persona
          ? this.api.updatePersona(persona.id, request)
          : this.api.createPersona(request);

        action$.pipe(finalize(() => this.saving.set(false))).subscribe({
          next: () => {
            toast.success(persona ? 'Persona actualizada.' : 'Persona creada.');
            this.loadPersonas();
          },
          error: () => this.showError('No fue posible guardar la persona.'),
        });
      });
  }

  deactivate(persona: Persona): void {
    if (!window.confirm(`Dar de baja a ${persona.nombreCompleto}?`)) {
      return;
    }

    this.saving.set(true);
    this.api.deactivatePersona(persona.id).pipe(finalize(() => this.saving.set(false))).subscribe({
      next: () => {
        toast.success('Persona dada de baja.');
        this.loadPersonas();
      },
      error: () => this.showError('No fue posible dar de baja a la persona.'),
    });
  }

  provisionarUsuario(persona: Persona): void {
    if (!persona.correoPrincipal) {
      this.showError('La persona necesita un correo principal antes de crear su cuenta.');
      return;
    }

    this.dialog
      .open(ProvisionarUsuarioDialogComponent, { contentClass: 'sm:max-w-[520px]', context: { persona, roles: this.roles() } })
      .closed$
      .subscribe((result) => {
        const request = result as ProvisionarUsuarioRequest | undefined;
        if (!request) {
          return;
        }

        this.saving.set(true);
        this.api.provisionarUsuario(persona.id, request).pipe(finalize(() => this.saving.set(false))).subscribe({
          next: () => {
            toast.success('Cuenta creada y vinculada.');
            this.loadPersonas();
          },
          error: () => this.showError('No fue posible crear la cuenta. Revisa el correo y el rol.'),
        });
      });
  }

  resetPassword(persona: Persona): void {
    if (!this.isAdminTic() || !persona.userId) {
      return;
    }

    this.dialog
      .open(ResetPasswordDialogComponent, { contentClass: 'sm:max-w-[520px]', context: persona })
      .closed$
      .subscribe((result) => {
        const newPassword = result as string | undefined;
        if (!newPassword || !persona.userId) {
          return;
        }

        this.saving.set(true);
        this.api.resetPassword(persona.userId, newPassword).pipe(finalize(() => this.saving.set(false))).subscribe({
          next: () => toast.success('Contrasena restablecida correctamente.'),
          error: () => this.showError('No fue posible restablecer la contrasena.'),
        });
      });
  }

  private showError(message: string): void {
    toast.error(message);
  }
}
