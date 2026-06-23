import { Component, OnInit, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Observable, finalize } from 'rxjs';
import { UnidadMedica } from '../../../domain/catalogos/models/catalogo.model';
import { Persona, Role } from '../../../domain/personas/models/persona.model';
import { CatalogosApiService } from '../../../infrastructure/catalogos/api/catalogos-api.service';
import { PersonaRequest, PersonasApiService, ProvisionarUsuarioRequest } from '../../../infrastructure/personas/api/personas-api.service';
import { PersonaFormDialogComponent } from './persona-form-dialog.component';
import { ProvisionarUsuarioDialogComponent } from './provisionar-usuario-dialog.component';

@Component({
  selector: 'app-admin-personas',
  imports: [MatButtonModule, MatDialogModule, MatFormFieldModule, MatIconModule, MatInputModule, MatProgressSpinnerModule, MatSnackBarModule, MatTooltipModule],
  templateUrl: './admin-personas.component.html',
  styleUrl: './admin-personas.component.scss',
})
export class AdminPersonasComponent implements OnInit {
  private readonly api = inject(PersonasApiService);
  private readonly catalogosApi = inject(CatalogosApiService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  readonly personas = signal<Persona[]>([]);
  readonly unidadesMedicas = signal<UnidadMedica[]>([]);
  readonly roles = signal<Role[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly query = signal('');

  ngOnInit(): void {
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
      .getPersonas({ q: this.query().trim(), activo: null })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({ next: (items) => this.personas.set(items), error: () => this.showError('No fue posible cargar las personas.') });
  }

  search(value: string): void {
    this.query.set(value);
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

  private showError(message: string): void {
    this.snackBar.open(message, 'Cerrar', { duration: 4000 });
  }
}
