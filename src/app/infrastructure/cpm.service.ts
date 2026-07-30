// src/app/services/cpm.service.ts (FRONTEND - Angular)
import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {
  BehaviorSubject,
  finalize,
  firstValueFrom,
  forkJoin,
  map,
  Observable,
  of,
  shareReplay,
  tap,
  withLatestFrom
} from 'rxjs';
import { APP_CONFIG, AppConfig } from '../core/config/app-config';
import { CpmExpectedRow } from '../models/CpmExpectedRow';
import { CpmApiResponse } from '../models/CpmApiResponse';
import { CpmUnionRow } from '../models/CpmUnionRow';
import { StorageVariables } from '../shared/storage-variables';
import { FeatureFlagsService } from './feature-flags.service';

@Injectable({ providedIn: 'root' })
export class CpmService {
  private readonly http = inject(HttpClient);
  private readonly flags = inject(FeatureFlagsService);
  private readonly config = inject<AppConfig>(APP_CONFIG);
  private readonly baseUrl = this.url('/api');
  private readonly expectedUrl = `${this.baseUrl}/cpms/expected-vs`;
  private readonly unitCpmUrl = `${this.baseUrl}/cpms/by-unidad`;

  // =========================
  //   ESTADO "GLOBAL" LEGACY
  // =========================
  // UniÃ³n final (KIT âˆª CPM>0) de la *Ãºltima* unidad cargada explÃ­citamente
  private unionSubject = new BehaviorSubject<CpmUnionRow[]>([]);
  public cpms$ = this.unionSubject.asObservable();

  // Ã­ndices auxiliares "globales" (Ãºltima unidad)
  // TODO: hacerlo private kitSet = new Set<string[]>();
  private kitSet = new Set<string>();               // claves en KIT (normalizadas)
  private cpmIndex = new Map<string, number>();     // clave -> cpm (normalizada)

  private importRestrictToKit$ = new BehaviorSubject<boolean>(false);

  // =========================
  //   ESTADO POR UNIDAD ðŸ†•
  // =========================
  private unionsByUnit = new Map<string, BehaviorSubject<CpmUnionRow[]>>(); // cluesimb -> subject
  private inflightByUnit = new Map<string, Observable<CpmUnionRow[]>>();    // evitar duplicar fetches
  private kitsByUnit = new Map<string, Set<string>>(); // cluesimb -> Set(kit_codigo)
  private kitSetByUnit = new Map<string, Set<string>>();                    // cluesimb -> Set(claves)
  private cpmIndexByUnit = new Map<string, Map<string, number>>();          // cluesimb -> Map(clave,cpm)
  private restrictByUnit = new Map<string, BehaviorSubject<boolean>>();     // cluesimb -> flag subject

  // TODO: Adaptar kitSet y kitSetByUnit con el nuevo enfoque hacia los componentes...

  // =========================
  //   UTILS
  // =========================
  private url(path: string): string {
    return `${this.config.apiBaseUrl}${path}`;
  }

  private storageKeys(cluesimb: string) {
    const k = cluesimb.trim().toUpperCase();
    return {
      union: `cpm:union:${k}`,
      ts: `cpm:ts:${k}`,
    };
  }

  /**
   * Limpia todo el storage relacionado con CPM (Ãºtil para debugging)
   * todo lo que contenga "cpm:union:" o "cpm:ts:" para liberar espacio
   * en caso de QuotaExceededError.
   */
  private cleanCPMUnionTSStorage() {
    // limpiando claves legacy que pudieran persistir.
    // Ya no se usan pero por si acaso quedan residuos.
    localStorage.removeItem(StorageVariables.SOLICITUD_CPMS);
    localStorage.removeItem(StorageVariables.SOLICITUD_CLAVEGRUPOS);
    localStorage.removeItem(StorageVariables.SOLICITUD_CPMS_TS);
    try {
      const keysToRemove: string[] = [];

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key) continue;

        if (key.startsWith('cpm:union:') || key.startsWith('cpm:ts:')) {
          keysToRemove.push(key);
        }
      }

      keysToRemove.forEach(k => localStorage.removeItem(k));
    } catch { /* noop */ }
  }

  private normClave(c: string) { return (c || '').toUpperCase().trim(); }

  private hydrateUnion(cluesimb: string): CpmUnionRow[] {
    const { union } = this.storageKeys(cluesimb);
    try {
      const raw = localStorage.getItem(union);
      return raw ? (JSON.parse(raw) as CpmUnionRow[]) : [];
    } catch { return []; }
  }

  /*private persistUnion(cluesimb: string, rows: CpmUnionRow[]) {
    const { union, ts } = this.storageKeys(cluesimb);
    localStorage.setItem(union, JSON.stringify(rows));
    localStorage.setItem(ts, Date.now().toString());
  }*/
  private persistUnion(cluesimb: string, rows: CpmUnionRow[]) {
    const { union, ts } = this.storageKeys(cluesimb);

    const tryWrite = () => {
      localStorage.setItem(union, JSON.stringify(rows));
      localStorage.setItem(ts, Date.now().toString());
    };

    try {
      tryWrite();
    } catch (err: any) {
      // Cuota llena -> intentamos limpieza rÃ¡pida
      if (err?.name === 'QuotaExceededError') {
        this.evictOldCpmCache(); // ðŸ‘ˆ agrega este helper abajo
        try {
          tryWrite();
        } catch (err2) {
          // Segundo intento fallido
          try {
            // Ya mejor de plano Limpio el storage de CPM
            this.cleanCPMUnionTSStorage();
            tryWrite();
          } catch (err3) {
            // Tercer intento fallido
            console.warn('[CPM] Sin espacio en localStorage, no se persistirÃ¡', cluesimb);
            // Importante: NO lanzar error. Solo no persistir.
          }
        }
        return;
      }

      // Otro error raro: no tires el flujo tampoco
      console.warn('[CPM] persistUnion fallÃ³', cluesimb, err);
    }
  }

  private evictOldCpmCache(keepNewest = 10) {
    try {
      // Junta todas las claves cpm:ts:*
      const keys: { k: string; ts: number }[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i) || '';
        if (!k.startsWith('cpm:ts:')) continue;
        const ts = Number(localStorage.getItem(k) || 0);
        keys.push({ k, ts });
      }

      // Ordena por mas nuevo
      keys.sort((a, b) => b.ts - a.ts);

      // Borra todo excepto los keepNewest
      for (let i = keepNewest; i < keys.length; i++) {
        const tsKey = keys[i].k;
        const unit = tsKey.replace('cpm:ts:', '');
        localStorage.removeItem(tsKey);
        localStorage.removeItem(`cpm:union:${unit}`);
      }
    } catch {
      // si storage estÃ¡ bloqueado o algo, no pasa nada
    }
  }

  private shouldRefresh(cluesimb: string): boolean {
    const { ts } = this.storageKeys(cluesimb);
    const last = Number(localStorage.getItem(ts) || 0);
    if (!last) return true;
    const a = new Date(last), b = new Date();
    const sameDay = a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate();
    return !sameDay; // refresco diario
  }

  private subjectForUnit(key: string): BehaviorSubject<CpmUnionRow[]> { // ðŸ†•
    let subj = this.unionsByUnit.get(key);
    if (!subj) {
      subj = new BehaviorSubject<CpmUnionRow[]>([]);
      this.unionsByUnit.set(key, subj);
    }
    return subj;
  }

  private restrictFlagForUnit(key: string): BehaviorSubject<boolean> { // ðŸ†•
    let f = this.restrictByUnit.get(key);
    if (!f) {
      f = new BehaviorSubject<boolean>(false);
      this.restrictByUnit.set(key, f);
      // primer fetch async de la flag
      this.flags.getEffective({ cluesimb: key })
        .then(eff => f!.next(!!(eff as any)?.IMPORT_LIMIT_TO_KIT))
        .catch(() => f!.next(false));
    }
    return f;
  }

  // =========================
  //   API LEGACY (se mantiene)
  // =========================
  /*  public getKitCount(): number {
      return this.kitSet.size;
    }

    public getKitClaves(): string[] {
      return Array.from(this.kitSet);
    }*/

  /**
   * Carga por cluesimb, usa cachÃ© y consolida â€œexpected-vs âˆª by-unidadâ€.
   * Mantiene el *estado global* (Ãºltima unidad activa).
   */
  ensureForCluesimb(cluesimb: string, opts?: { force?: boolean }): Observable<CpmUnionRow[]> {
    const key = cluesimb?.trim().toUpperCase();
    if (!key) {
      this.unionSubject.next([]);
      this.kitSet.clear();
      this.cpmIndex.clear();
      this.importRestrictToKit$.next(false);
      return of([]);
    }

    // ðŸ†• ejecuta el flujo por-unidad y refleja en el global (compat)
    return this.ensureForUnit(key, opts).pipe(
      tap(union => {
        // copiar a estado global
        this.unionSubject.next(union);
        const set = this.kitSetByUnit.get(key) ?? new Set<string>();
        const idx = this.cpmIndexByUnit.get(key) ?? new Map<string, number>();
        this.kitSet = new Set(set);
        this.cpmIndex = new Map(idx);
        this.importRestrictToKit$.next(this.restrictFlagForUnit(key).value);
      })
    );
  }

  refreshForCluesimb(cluesimb: string): Observable<CpmUnionRow[]> {
    return this.ensureForCluesimb(cluesimb, { force: true });
  }

  // Helpers legacy (global)
  getCpmForClave(clave: string, cluesimb?: string): number {                 // ðŸ†• acepta cluesimb opcional
    if (cluesimb) {
      const m = this.cpmIndexByUnit.get(cluesimb.trim().toUpperCase());
      return m?.get(this.normClave(clave)) ?? 0;
    }
    return this.cpmIndex.get(this.normClave(clave)) ?? 0;
  }
  isClaveInKit(clave: string, cluesimb?: string): boolean {                  // ðŸ†• acepta cluesimb opcional
    if (cluesimb) {
      const s = this.kitSetByUnit.get(cluesimb.trim().toUpperCase());
      return s?.has(this.normClave(clave)) ?? false;
    }
    return this.kitSet.has(this.normClave(clave));
  }

  /**
  * Salida derivada global (LEGACY) para la pantalla de importaciÃ³n:
  * - flag ON  -> solo claves del KIT (en_kit === true)
  * - flag OFF -> mismas filas que cpms$ (sin filtrar)
  */
  public cpmsForImport$ = this.cpms$.pipe(
    withLatestFrom(this.importRestrictToKit$),
    map(([rows, restrict]) => restrict ? rows.filter(r => r.en_kit === true) : rows),
    shareReplay(1)
  );

  /** Â¿Puedo usar esta clave con la unidad "global"? (LEGACY) */
  public canUseClave(clave: string): Observable<boolean> {
    const cn = this.normClave(clave);
    return this.importRestrictToKit$.pipe(
      withLatestFrom(this.cpms$),
      map(([restrict, union]) => {
        if (!restrict) return true; // flag OFF -> permitido
        return union.some(r => r.en_kit && this.normClave(r.clave_cnis) === cn);
      })
    );
  }

  /** Helper sync-friendly (LEGACY) */
  public async ensureAllowedOrThrow(clave: string): Promise<void> {
    const ok = await firstValueFrom(this.canUseClave(clave));
    if (!ok) throw new Error('CLAVE_FUERA_DE_KIT');
  }

  // =========================
  //   API POR UNIDAD ðŸ†•
  // =========================

  /** Stream de la uniÃ³n (KIT âˆª CPM>0) *para una unidad* */
  cpmsFor(cluesimb: string, opts?: { force?: boolean }): Observable<CpmUnionRow[]> {
    const key = (cluesimb || '').trim().toUpperCase();
    if (!key) return of([]);
    return this.ensureForUnit(key, opts);
  }

  /** VersiÃ³n â€œimportâ€ *por unidad* respetando flag de esa unidad */
  cpmsForImport(cluesimb: string): Observable<CpmUnionRow[]> {
    const key = (cluesimb || '').trim().toUpperCase();
    if (!key) return of([]);
    return this.cpmsFor(key).pipe(
      withLatestFrom(this.restrictFlagForUnit(key)),
      map(([rows, restrict]) => restrict ? rows.filter(r => r.en_kit === true) : rows),
      shareReplay(1)
    );
  }

  /** Helpers por unidad */
  getKitCountFor(cluesimb: string): number {
    const set = this.kitSetByUnit.get((cluesimb || '').trim().toUpperCase());
    return set?.size ?? 0;
  }

  /** Â¿Puedo usar clave X para *esta* unidad? */
  public canUseClaveFor(clave: string, cluesimb: string): Observable<boolean> {
    const key = (cluesimb || '').trim().toUpperCase();
    const cn = this.normClave(clave);
    return this.restrictFlagForUnit(key).pipe(
      withLatestFrom(this.cpmsFor(key)),
      map(([restrict, union]) => {
        if (!restrict) return true;
        return union.some(r => r.en_kit && this.normClave(r.clave_cnis) === cn);
      })
    );
  }

  // =========================
  //   NÃºcleo de carga ðŸ§  (reutiliza lo tuyo)
  // =========================

  /**
   * Carga por clave de unidad (semilla desde localStorage si ya fue cargado anteriormente)
   * y devuelve la uniÃ³n (KIT âˆª CPM) *para esa unidad*.
   * Si ya hay fetch en curso para esta unidad, reusa.
   * @param key CLUES IMB de la unidad
   * @param opts Opciones extras; si { force: true } se fuerza la recarga
   * @returns Un Observable que emite la uniÃ³n (KIT âˆª CPM) *para esa unidad*
   */
  private ensureForUnit(key: string, opts?: { force?: boolean }): Observable<CpmUnionRow[]> {
    const subj = this.subjectForUnit(key);

    // Semilla desde localStorage
    const cached = this.hydrateUnion(key);
    if (!opts?.force && cached.length && !this.shouldRefresh(key)) {
      // reconstruye Ã­ndices por unidad y emite (si aÃºn no estÃ¡)
      if ((subj.value ?? []).length === 0) subj.next(cached);
      this.rebuildIndexesForUnit(key, cached);
      // flag ya estÃ¡ en restrictByUnit (lazy)
      return subj.asObservable();
    }

    // Si ya hay fetch en curso para esta unidad, reusa
    const inflight = this.inflightByUnit.get(key);
    if (inflight) return inflight;

    const req$ = forkJoin({
      expected: this.http.get<CpmApiResponse>(`${this.expectedUrl}?cluesimb=${encodeURIComponent(key)}`, {
        headers: { 'X-Skip-Loader': '1' }
      })
        .pipe(map(r => Array.isArray(r) ? r as CpmExpectedRow[] : (r.rows ?? []) as CpmExpectedRow[])),
      unit: this.http.get<CpmApiResponse>(`${this.unitCpmUrl}?cluesimb=${encodeURIComponent(key)}`, {
        headers: { 'X-Skip-Loader': '1' }
      })
        .pipe(map(r => Array.isArray(r) ? r as any[] : (r.rows ?? []) as any[])),
    }).pipe(
      map(({ expected, unit }) => this.mergeExpectedAndUnit(key, expected, unit)),
      tap(union => {
        this.persistUnion(key, union);
        this.rebuildIndexesForUnit(key, union);
        subj.next(union);
      }),
      shareReplay(1),
      finalize(() => this.inflightByUnit.delete(key))
    );

    this.inflightByUnit.set(key, req$);
    return req$;
  }

  private mergeExpectedAndUnit(
    cluesimb: string,
    expected: CpmExpectedRow[],
    unit: any[], // { clave_cnis, cpm, ... }
  ): CpmUnionRow[] {
    const byClave = new Map<string, CpmUnionRow>();

    // expected -> en_kit=true (cpm puede ser 0/null)
    for (const e of expected) {
      const clave = this.normClave(e.clave_cnis);
      if (!clave) continue;

      const cpmVal = Number(e.cpm ?? 0);
      const kits = (e.kit_codigos ?? []).map(k => (k || '').trim().toUpperCase()).filter(Boolean);

      const prev = byClave.get(clave);
      if (!prev) {
        byClave.set(clave, {
          cluesimb, clave_cnis: clave, cpm: cpmVal, en_kit: true,
          kit_codigos: kits.length ? Array.from(new Set(kits)) : undefined
        });
      } else {
        prev.cpm = Math.max(prev.cpm, cpmVal);
        prev.en_kit = true;
        // union de kits (sin duplicados)
        if (kits.length) {
          const set = new Set<string>(prev.kit_codigos ?? []);
          for (const k of kits) set.add(k);
          prev.kit_codigos = Array.from(set);
        }
      }
    }

    // unit (CPM>0) -> puede traer claves fuera de KIT
    for (const u of unit) {
      const clave = this.normClave(u.clave_cnis ?? u.clave);
      if (!clave) continue;

      const cpmVal = Number(u.cpm ?? 0);
      const prev = byClave.get(clave);

      if (!prev) {
        byClave.set(clave, { cluesimb, clave_cnis: clave, cpm: cpmVal, en_kit: false });
      } else {
        prev.cpm = Math.max(prev.cpm, cpmVal);
      }
    }

    return Array.from(byClave.values()).sort((a, b) => a.clave_cnis.localeCompare(b.clave_cnis));
  }

  private rebuildIndexesForUnit(cluesimb: string, union: CpmUnionRow[]) { // ðŸ†•
    const key = (cluesimb || '').trim().toUpperCase();

    const kitClaves = new Set<string>();
    const idx = new Map<string, number>();
    const kits = new Set<string>(); // ðŸ†•

    for (const r of union) {
      const clave = this.normClave(r.clave_cnis);

      if (r.en_kit) kitClaves.add(clave);
      idx.set(clave, Number(r.cpm || 0));

      for (const k of (r.kit_codigos ?? [])) {
        const kk = (k || '').trim().toUpperCase();
        if (kk) kits.add(kk);
      }
    }

    this.kitSetByUnit.set(key, kitClaves);
    this.cpmIndexByUnit.set(key, idx);
    this.kitsByUnit.set(key, kits); // ðŸ†•
  }

  getKitCodigosFor(cluesimb: string): string[] {
    const key = (cluesimb || '').trim().toUpperCase();
    return Array.from(this.kitsByUnit.get(key) ?? new Set<string>()).sort();
  }

  filterUnionByKit(cluesimb: string, kitCodigo?: string): CpmUnionRow[] {
    const key = (cluesimb || '').trim().toUpperCase();
    const kit = (kitCodigo || '').trim().toUpperCase();
    const rows = this.subjectForUnit(key).value ?? [];

    if (!kit) return rows;
    return rows.filter(r => (r.kit_codigos ?? []).includes(kit));
  }

  cpmsForKit(cluesimb: string, kitCodigo$: Observable<string>): Observable<CpmUnionRow[]> {
    const key = (cluesimb || '').trim().toUpperCase();
    return this.cpmsFor(key).pipe(
      withLatestFrom(kitCodigo$),
      map(([rows, kit]) => {
        const k = (kit || '').trim().toUpperCase();
        if (!k) return rows;
        return rows.filter(r => (r.kit_codigos ?? []).includes(k));
      }),
      shareReplay(1)
    );
  }
}
