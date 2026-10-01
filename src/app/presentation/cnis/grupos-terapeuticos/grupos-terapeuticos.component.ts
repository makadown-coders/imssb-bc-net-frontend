import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmInput } from '@spartan-ng/helm/input';
import { HlmSpinner } from '@spartan-ng/helm/spinner';
import { HlmTableImports } from '@spartan-ng/helm/table';
import { EMPTY, Subject, catchError, defer, finalize, switchMap } from 'rxjs';
import { ArticuloGrupoTerapeutico, GrupoTerapeutico } from '../../../domain/cnis/models/grupo-terapeutico.model';
import { CnisApiService } from '../../../infrastructure/cnis/api/cnis-api.service';
import { SearchableSelectComponent, SearchableSelectValue } from '../../../shared/components/searchable-select/searchable-select.component';

@Component({
  selector: 'app-grupos-terapeuticos',
  imports: [SearchableSelectComponent, HlmButton, HlmInput, HlmSpinner, ...HlmTableImports],
  templateUrl: './grupos-terapeuticos.component.html',
  styleUrl: './grupos-terapeuticos.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GruposTerapeuticosComponent {
  private readonly api = inject(CnisApiService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly requests = new Subject<number | null>();
  readonly grupos = signal<GrupoTerapeutico[]>([]);
  readonly articulos = signal<ArticuloGrupoTerapeutico[]>([]);
  readonly grupoNumero = signal<number | null>(null);
  readonly loadingGrupos = signal(false);
  readonly loadingArticulos = signal(false);
  readonly errorGrupos = signal('');
  readonly errorArticulos = signal('');
  readonly search = signal('');
  readonly page = signal(1);
  readonly pageSize = 25;
  readonly grupo = computed(() => this.grupos().find((g) => g.numero === this.grupoNumero()));
  readonly options = computed(() => this.grupos().map((g) => ({ value: g.numero, label: `${g.numero} — ${g.nombre}` })));
  readonly filtered = computed(() => {
    const term = normalize(this.search());
    if (!term) return this.articulos();
    return this.articulos().filter((a) => normalize(a.clave).includes(term) || normalize(a.descripcion ?? '').includes(term));
  });
  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.filtered().length / this.pageSize)));
  readonly rows = computed(() => this.filtered().slice((this.page() - 1) * this.pageSize, this.page() * this.pageSize));
  readonly showingFrom = computed(() => this.filtered().length ? (this.page() - 1) * this.pageSize + 1 : 0);
  readonly showingTo = computed(() => Math.min(this.page() * this.pageSize, this.filtered().length));

  constructor() {
    this.requests.pipe(
      switchMap((numero) => defer(() => {
        this.articulos.set([]);
        this.errorArticulos.set('');
        this.page.set(1);
        if (numero === null) return EMPTY;
        this.loadingArticulos.set(true);
        return this.api.getArticulos(numero).pipe(
          catchError((error: unknown) => {
            this.errorArticulos.set(errorMessage(error, 'No fue posible cargar los artículos.'));
            return EMPTY;
          }),
          finalize(() => this.loadingArticulos.set(false)),
        );
      })),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe((rows) => this.articulos.set(rows));
    this.loadGrupos();
  }

  loadGrupos(): void {
    if (this.loadingGrupos()) return;
    this.loadingGrupos.set(true);
    this.errorGrupos.set('');
    this.api.getGrupos().pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.loadingGrupos.set(false)),
    ).subscribe({
      next: (grupos) => this.grupos.set([...grupos].sort((a, b) => a.numero - b.numero)),
      error: (error: unknown) => this.errorGrupos.set(errorMessage(error, 'No fue posible cargar los grupos terapéuticos.')),
    });
  }

  selectGrupo(value: SearchableSelectValue): void {
    const numero = typeof value === 'number' && this.grupos().some((g) => g.numero === value) ? value : null;
    this.grupoNumero.set(numero);
    this.search.set('');
    this.requests.next(numero);
  }

  retryArticulos(): void {
    this.requests.next(this.grupoNumero());
  }

  setSearch(value: string): void {
    this.search.set(value);
    this.page.set(1);
  }

  changePage(page: number): void {
    this.page.set(Math.min(Math.max(page, 1), this.totalPages()));
  }
}

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof HttpErrorResponse && error.status === 403
    ? 'No tienes permisos para consultar los grupos terapéuticos CNIS.'
    : fallback;
}
