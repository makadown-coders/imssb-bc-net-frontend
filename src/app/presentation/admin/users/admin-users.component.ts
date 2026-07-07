import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideEraser, lucideKeyRound, lucideRefreshCw, lucideSearch, lucideShieldCheck } from '@ng-icons/lucide';
import { toast } from '@spartan-ng/brain/sonner';
import { HlmBadge } from '@spartan-ng/helm/badge';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmDialogService } from '@spartan-ng/helm/dialog';
import { HlmInput } from '@spartan-ng/helm/input';
import { HlmSpinner } from '@spartan-ng/helm/spinner';
import { Subject, debounceTime, distinctUntilChanged, finalize, forkJoin } from 'rxjs';
import { UnidadMedica } from '../../../domain/catalogos/models/catalogo.model';
import { Role } from '../../../domain/personas/models/persona.model';
import { ManagedUser } from '../../../domain/users/models/managed-user.model';
import { CatalogosApiService } from '../../../infrastructure/catalogos/api/catalogos-api.service';
import { PersonasApiService } from '../../../infrastructure/personas/api/personas-api.service';
import { UsersApiService } from '../../../infrastructure/users/api/users-api.service';
import { SearchableSelectComponent, SearchableSelectValue } from '../../../shared/components/searchable-select/searchable-select.component';
import { ManageUserRolesDialogComponent } from './manage-user-roles-dialog.component';
import { UserPasswordDialogComponent } from './user-password-dialog.component';

@Component({
  selector: 'app-admin-users',
  imports: [NgIcon, HlmBadge, HlmButton, HlmInput, HlmSpinner, SearchableSelectComponent],
  providers: [provideIcons({ lucideEraser, lucideKeyRound, lucideRefreshCw, lucideSearch, lucideShieldCheck })],
  templateUrl: './admin-users.component.html',
  styleUrl: './admin-users.component.scss',
})
export class AdminUsersComponent implements OnInit {
  private readonly api = inject(UsersApiService);
  private readonly catalogosApi = inject(CatalogosApiService);
  private readonly personasApi = inject(PersonasApiService);
  private readonly dialog = inject(HlmDialogService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly queryChanges = new Subject<string>();

  readonly users = signal<ManagedUser[]>([]);
  readonly unidades = signal<UnidadMedica[]>([]);
  readonly roles = signal<Role[]>([]);
  readonly query = signal('');
  readonly isActive = signal<boolean | null>(null);
  readonly unidadId = signal<number | null>(null);
  readonly roleCode = signal<string | null>(null);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly unidadOptions = computed(() => [
    { label: 'Todas las unidades', value: null, keywords: 'todas' },
    ...this.unidades().map((unidad) => ({
      label: unidad.nombre,
      value: unidad.id,
      keywords: `${unidad.cluessa ?? ''} ${unidad.cluesimb ?? ''} ${unidad.nombreMunicipio ?? ''}`,
    })),
  ]);
  readonly roleOptions = computed(() => [
    { label: 'Todos los roles', value: null, keywords: 'todos' },
    ...this.roles().map((role) => ({
      label: role.descripcion,
      value: role.code,
      keywords: role.code,
    })),
  ]);
  readonly statusOptions = [
    { label: 'Todos los estados', value: null, keywords: 'todos' },
    { label: 'Activos', value: true, keywords: 'activo habilitado' },
    { label: 'Inactivos', value: false, keywords: 'inactivo deshabilitado' },
  ];

  ngOnInit(): void {
    this.queryChanges.pipe(debounceTime(350), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.loadUsers());
    this.catalogosApi.getUnidadesMedicas({ activo: true }).subscribe((items) => this.unidades.set(items));
    this.personasApi.getRoles().subscribe({ next: (items) => this.roles.set(items), error: () => this.showError('No fue posible cargar los roles.') });
    this.loadUsers();
  }

  loadUsers(): void {
    this.loading.set(true);
    this.api.getUsers({ q: this.query().trim(), isActive: this.isActive(), unidadId: this.unidadId(), roleCode: this.roleCode() })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({ next: (users) => this.users.set(users), error: () => this.showError('No fue posible cargar los usuarios.') });
  }

  search(value: string): void { this.query.set(value); this.queryChanges.next(value.trim()); }
  onUnidadChange(value: SearchableSelectValue): void { this.filterUnidad(typeof value === 'number' || value === null ? value : null); }
  onRoleChange(value: SearchableSelectValue): void { this.filterRole(typeof value === 'string' || value === null ? value : null); }
  onStatusChange(value: SearchableSelectValue): void { this.filterStatus(typeof value === 'boolean' || value === null ? value : null); }
  filterStatus(value: boolean | null): void { this.isActive.set(value); this.loadUsers(); }
  filterUnidad(value: number | null): void { this.unidadId.set(value); this.loadUsers(); }
  filterRole(value: string | null): void { this.roleCode.set(value); this.loadUsers(); }
  clearFilters(): void {
    this.query.set(''); this.isActive.set(null); this.unidadId.set(null); this.roleCode.set(null); this.loadUsers();
  }

  manageRoles(user: ManagedUser): void {
    this.dialog.open(ManageUserRolesDialogComponent, { contentClass: 'sm:max-w-[600px]', context: { user, availableRoles: this.roles() } })
      .closed$.subscribe((result) => {
        const selectedRoles = result as string[] | undefined;
        if (!selectedRoles) return;
        const current = user.roles.filter((role) => role.code !== 'ADMIN_TIC').map((role) => role.code);
        const additions = selectedRoles.filter((role) => !current.includes(role));
        const removals = current.filter((role) => !selectedRoles.includes(role));
        const actions = [
          ...additions.map((role) => this.api.assignRole(user.id, role)),
          ...removals.map((role) => this.api.revokeRole(user.id, role)),
        ];
        if (!actions.length) return;
        this.saving.set(true);
        forkJoin(actions).pipe(finalize(() => this.saving.set(false))).subscribe({
          next: () => { toast.success('Roles actualizados. Las sesiones persistentes fueron cerradas.'); this.loadUsers(); },
          error: () => this.showError('No fue posible actualizar todos los roles.'),
        });
      });
  }

  resetPassword(user: ManagedUser): void {
    this.dialog.open(UserPasswordDialogComponent, { contentClass: 'sm:max-w-[520px]', context: user })
      .closed$.subscribe((result) => {
        const password = result as string | undefined;
        if (!password) return;
        this.saving.set(true);
        this.api.resetPassword(user.id, password).pipe(finalize(() => this.saving.set(false))).subscribe({
          next: () => toast.success('Contrasena restablecida correctamente.'),
          error: () => this.showError('No fue posible restablecer la contrasena.'),
        });
      });
  }

  private showError(message: string): void { toast.error(message); }
}
