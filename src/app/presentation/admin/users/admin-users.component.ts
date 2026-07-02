import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subject, debounceTime, distinctUntilChanged, finalize, forkJoin } from 'rxjs';
import { UnidadMedica } from '../../../domain/catalogos/models/catalogo.model';
import { Role } from '../../../domain/personas/models/persona.model';
import { ManagedUser } from '../../../domain/users/models/managed-user.model';
import { CatalogosApiService } from '../../../infrastructure/catalogos/api/catalogos-api.service';
import { PersonasApiService } from '../../../infrastructure/personas/api/personas-api.service';
import { UsersApiService } from '../../../infrastructure/users/api/users-api.service';
import { ManageUserRolesDialogComponent } from './manage-user-roles-dialog.component';
import { UserPasswordDialogComponent } from './user-password-dialog.component';

@Component({
  selector: 'app-admin-users',
  imports: [MatButtonModule, MatChipsModule, MatDialogModule, MatFormFieldModule, MatIconModule, MatInputModule, MatProgressSpinnerModule, MatSelectModule, MatSnackBarModule, MatTooltipModule],
  templateUrl: './admin-users.component.html',
  styleUrl: './admin-users.component.scss',
})
export class AdminUsersComponent implements OnInit {
  private readonly api = inject(UsersApiService);
  private readonly catalogosApi = inject(CatalogosApiService);
  private readonly personasApi = inject(PersonasApiService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
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
  filterStatus(value: boolean | null): void { this.isActive.set(value); this.loadUsers(); }
  filterUnidad(value: number | null): void { this.unidadId.set(value); this.loadUsers(); }
  filterRole(value: string | null): void { this.roleCode.set(value); this.loadUsers(); }
  clearFilters(): void {
    this.query.set(''); this.isActive.set(null); this.unidadId.set(null); this.roleCode.set(null); this.loadUsers();
  }

  manageRoles(user: ManagedUser): void {
    this.dialog.open(ManageUserRolesDialogComponent, { width: '600px', maxWidth: '95vw', data: { user, availableRoles: this.roles() } })
      .afterClosed().subscribe((selectedRoles: string[] | undefined) => {
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
          next: () => { this.snackBar.open('Roles actualizados. Las sesiones persistentes fueron cerradas.', 'Cerrar', { duration: 4000 }); this.loadUsers(); },
          error: () => this.showError('No fue posible actualizar todos los roles.'),
        });
      });
  }

  resetPassword(user: ManagedUser): void {
    this.dialog.open(UserPasswordDialogComponent, { width: '520px', maxWidth: '94vw', data: user })
      .afterClosed().subscribe((password: string | undefined) => {
        if (!password) return;
        this.saving.set(true);
        this.api.resetPassword(user.id, password).pipe(finalize(() => this.saving.set(false))).subscribe({
          next: () => this.snackBar.open('Contraseña restablecida correctamente.', 'Cerrar', { duration: 3500 }),
          error: () => this.showError('No fue posible restablecer la contraseña.'),
        });
      });
  }

  private showError(message: string): void { this.snackBar.open(message, 'Cerrar', { duration: 4000 }); }
}
