import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideCircleAlert,
  lucideClipboardList,
  lucideRefreshCw,
  lucideSave,
  lucideSettings2,
  lucideSlidersHorizontal,
} from '@ng-icons/lucide';
import { toast } from '@spartan-ng/brain/sonner';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmSpinner } from '@spartan-ng/helm/spinner';
import { debounceTime, distinctUntilChanged, finalize, map } from 'rxjs';
import {
  EffectiveFlags,
  FlagKey,
  FlagScope,
  NivelSolicitud,
  UnidadAllowlist,
  UpsertFlagPayload,
} from '../../domain/solicitudes/models/feature-flag.model';
import { SolicitudesConfigApiService } from '../../infrastructure/solicitudes/api/solicitudes-config-api.service';
import { SearchableSelectComponent, SearchableSelectOption, SearchableSelectValue } from '../../shared/components/searchable-select/searchable-select.component';
import { HlmAlert, HlmAlertDescription, HlmAlertTitle } from '../../shared/ui/alert/src';

interface FlagDefinition {
  key: FlagKey;
  title: string;
  description: string;
  kind: 'boolean' | 'json';
}

@Component({
  selector: 'app-solicitudes-config',
  imports: [ReactiveFormsModule, NgIcon, HlmButton, HlmCardImports, HlmSpinner, SearchableSelectComponent, HlmAlert, HlmAlertTitle, HlmAlertDescription],
  providers: [provideIcons({ lucideCircleAlert, lucideClipboardList, lucideRefreshCw, lucideSave, lucideSettings2, lucideSlidersHorizontal })],
  templateUrl: './solicitudes-config.component.html',
  styleUrl: './solicitudes-config.component.scss',
})
export class SolicitudesConfigComponent {
  private readonly api = inject(SolicitudesConfigApiService);
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  readonly definitions: readonly FlagDefinition[] = [
    { key: 'EDIT_CPMS', title: 'Edición de CPMs', description: 'Permite que la unidad ajuste sus CPMs directamente.', kind: 'boolean' },
    { key: 'SOLO_CPMS', title: 'Solo CPMs', description: 'En segundo nivel, restringe la captura a claves presentes en CPM.', kind: 'boolean' },
    { key: 'BUSCAR_EXISTENCIA_EN_CLUES', title: 'Validar existencias por CLUES', description: 'Consulta si la unidad elegida ya cuenta con existencias para advertir al usuario.', kind: 'boolean' },
    { key: 'APLICAR_ENCUESTAS', title: 'Aplicar encuestas', description: 'Activa micro-encuestas asociadas a la captura de solicitudes.', kind: 'boolean' },
    { key: 'APLICAR_EQUIVALENCIAS', title: 'Aplicar equivalencias', description: 'Sugiere claves equivalentes cuando no hay disponibilidad.', kind: 'boolean' },
    { key: 'IMPORT_LIMIT_TO_KIT', title: 'Limitar importación al KIT', description: 'Restringe la importación masiva a claves del KIT asignado a la unidad.', kind: 'boolean' },
    { key: 'CLUES_EXISTENCIAS_ALLOWLIST', title: 'Allowlist de existencias por CLUES', description: 'Lista de alias habilitados para la consulta de existencias por unidad.', kind: 'json' },
  ];

  readonly scopeForm = this.formBuilder.group({
    scope: this.formBuilder.control<FlagScope>('global', Validators.required),
    nivel: this.formBuilder.control<NivelSolicitud>('SEGUNDO_NIVEL', Validators.required),
    cluesimb: this.formBuilder.control(''),
  });

  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly unitsLoading = signal(false);
  readonly metadataLoading = signal(false);
  readonly units = signal<UnidadAllowlist[]>([]);
  readonly allRowsCount = signal(0);
  readonly loadedFlags = signal<EffectiveFlags>({});
  readonly draftFlags = signal<Record<string, unknown>>({});

  readonly unitOptions = computed<SearchableSelectOption[]>(() => this.units().map((unit) => ({
    label: `${unit.nombre} · ${unit.cluesimb}`,
    value: unit.cluesimb,
    keywords: `${unit.alias_dash} ${unit.nombre} ${unit.cluesimb}`,
  })));

  readonly selectedScopeLabel = computed(() => {
    const scope = this.scopeForm.controls.scope.value;
    if (scope === 'nivel') {
      return this.scopeForm.controls.nivel.value === 'PRIMER_NIVEL' ? 'Nivel: Primer nivel' : 'Nivel: Segundo nivel';
    }
    if (scope === 'clues') {
      const cluesimb = this.scopeForm.controls.cluesimb.value;
      const found = this.units().find((item) => item.cluesimb === cluesimb);
      return found ? `Unidad: ${found.nombre}` : 'Unidad específica';
    }
    return 'Ámbito global';
  });

  readonly pendingChanges = computed(() => this.definitions
    .filter((definition) => !valuesEqual(this.loadedFlags()[definition.key], this.draftFlags()[definition.key]))
    .map((definition) => definition.key));

  readonly canSave = computed(() => !this.loading() && !this.saving() && this.pendingChanges().length > 0);
  readonly canEditFlags = computed(() => !this.loading() && !this.saving() && this.isScopeReady());
  readonly currentAllowlistText = computed(() => stringifyAllowlist(this.draftFlags()['CLUES_EXISTENCIAS_ALLOWLIST']));

  constructor() {
    this.scopeForm.valueChanges.pipe(
      takeUntilDestroyed(this.destroyRef),
      debounceTime(150),
      map(() => this.buildContextKey()),
      distinctUntilChanged(),
    ).subscribe(() => {
      if (this.scopeForm.controls.scope.value === 'clues') {
        this.ensureUnitsLoaded();
      }
      this.loadEffectiveFlags();
    });

    this.loadMetadata();
    this.loadEffectiveFlags();
  }

  reload(): void {
    this.loadMetadata();
    this.loadEffectiveFlags();
  }

  selectScope(scope: FlagScope): void {
    this.scopeForm.controls.scope.setValue(scope);
    if (scope !== 'clues') {
      this.scopeForm.controls.cluesimb.setValue('');
    }
  }

  onUnidadChange(value: SearchableSelectValue): void {
    this.scopeForm.controls.cluesimb.setValue(typeof value === 'string' ? value : '');
  }

  flagEnabled(key: FlagKey): boolean {
    return Boolean(this.draftFlags()[key]);
  }

  updateFlag(key: FlagKey, checked: boolean): void {
    if (!this.canEditFlags()) {
      return;
    }

    this.draftFlags.update((current) => ({ ...current, [key]: checked }));
  }

  updateAllowlist(value: string): void {
    this.draftFlags.update((current) => ({
      ...current,
      CLUES_EXISTENCIAS_ALLOWLIST: {
        list: value.split(/[\r\n,]+/).map((item) => item.trim()).filter(Boolean),
      },
    }));
  }

  resetDraft(): void {
    this.draftFlags.set(cloneFlags(this.loadedFlags()));
  }

  save(): void {
    if (!this.canSave()) {
      return;
    }

    const payload = this.pendingChanges().map((key): UpsertFlagPayload => ({
      flag_key: key,
      scope: this.scopeForm.controls.scope.value,
      scope_id: this.resolveScopeId(),
      value: this.draftFlags()[key],
    }));

    this.saving.set(true);
    this.api.patchFlags(payload).pipe(finalize(() => this.saving.set(false))).subscribe({
      next: () => {
        this.loadedFlags.set(cloneFlags(this.draftFlags()));
        toast.success('Configuración guardada correctamente.');
      },
      error: () => toast.error('No fue posible guardar la configuración.'),
    });
  }

  private loadMetadata(): void {
    this.metadataLoading.set(true);
    this.api.listFlags().pipe(finalize(() => this.metadataLoading.set(false))).subscribe({
      next: (rows) => this.allRowsCount.set(rows.length),
      error: () => this.allRowsCount.set(0),
    });
  }

  private ensureUnitsLoaded(): void {
    if (this.unitsLoading() || this.units().length > 0) {
      return;
    }

    this.unitsLoading.set(true);
    this.api.getAllowlistUnidades().pipe(finalize(() => this.unitsLoading.set(false))).subscribe({
      next: (units) => this.units.set(units),
      error: () => toast.error('No fue posible cargar la allowlist de unidades.'),
    });
  }

  private loadEffectiveFlags(): void {
    if (!this.isScopeReady()) {
      this.loadedFlags.set({});
      this.draftFlags.set({});
      return;
    }

    this.loading.set(true);
    this.api.getEffective({
      nivel: this.scopeForm.controls.scope.value === 'nivel' ? this.scopeForm.controls.nivel.value : undefined,
      cluesimb: this.scopeForm.controls.scope.value === 'clues' ? this.scopeForm.controls.cluesimb.value || undefined : undefined,
    }).pipe(finalize(() => this.loading.set(false))).subscribe({
      next: (flags) => {
        this.loadedFlags.set(mergeKnownFlags(flags));
        this.draftFlags.set(cloneFlags(mergeKnownFlags(flags)));
      },
      error: () => {
        this.loadedFlags.set({});
        this.draftFlags.set({});
        toast.error('No fue posible cargar la configuración del ámbito seleccionado.');
      },
    });
  }

  private isScopeReady(): boolean {
    const scope = this.scopeForm.controls.scope.value;
    return scope !== 'clues' || !!this.scopeForm.controls.cluesimb.value.trim();
  }

  private resolveScopeId(): string | null {
    const scope = this.scopeForm.controls.scope.value;
    if (scope === 'global') {
      return 'global';
    }
    if (scope === 'nivel') {
      return this.scopeForm.controls.nivel.value;
    }
    return this.scopeForm.controls.cluesimb.value.trim().toUpperCase();
  }

  private buildContextKey(): string {
    return [
      this.scopeForm.controls.scope.value,
      this.scopeForm.controls.nivel.value,
      this.scopeForm.controls.cluesimb.value.trim().toUpperCase(),
    ].join('|');
  }
}

function mergeKnownFlags(flags: EffectiveFlags): EffectiveFlags {
  return {
    EDIT_CPMS: Boolean(flags['EDIT_CPMS']),
    SOLO_CPMS: Boolean(flags['SOLO_CPMS']),
    BUSCAR_EXISTENCIA_EN_CLUES: Boolean(flags['BUSCAR_EXISTENCIA_EN_CLUES']),
    APLICAR_ENCUESTAS: Boolean(flags['APLICAR_ENCUESTAS']),
    APLICAR_EQUIVALENCIAS: Boolean(flags['APLICAR_EQUIVALENCIAS']),
    IMPORT_LIMIT_TO_KIT: Boolean(flags['IMPORT_LIMIT_TO_KIT']),
    CLUES_EXISTENCIAS_ALLOWLIST: normalizeAllowlist(flags['CLUES_EXISTENCIAS_ALLOWLIST']),
  };
}

function cloneFlags(flags: EffectiveFlags): Record<string, unknown> {
  return JSON.parse(JSON.stringify(flags ?? {})) as Record<string, unknown>;
}

function normalizeAllowlist(value: unknown): { list: string[] } {
  if (value && typeof value === 'object' && Array.isArray((value as { list?: unknown }).list)) {
    return { list: ((value as { list: unknown[] }).list).map((item) => String(item).trim()).filter(Boolean) };
  }

  if (Array.isArray(value)) {
    return { list: value.map((item) => String(item).trim()).filter(Boolean) };
  }

  return { list: [] };
}

function stringifyAllowlist(value: unknown): string {
  return normalizeAllowlist(value).list.join('\n');
}

function valuesEqual(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}
