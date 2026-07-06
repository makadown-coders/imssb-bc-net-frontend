import { Injectable } from '@angular/core';
import { BorradorSolicitud } from '../../../domain/solicitudes/models/solicitud.model';

const STORAGE_KEY = 'imssb.solicitudes.borrador.v1';

@Injectable({ providedIn: 'root' })
export class SolicitudDraftService {
  load(): BorradorSolicitud | null {
    try {
      const value = localStorage.getItem(STORAGE_KEY);
      return value ? JSON.parse(value) as BorradorSolicitud : null;
    } catch { return null; }
  }

  save(draft: Omit<BorradorSolicitud, 'version' | 'actualizadoEn'>): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...draft, version: 1, actualizadoEn: new Date().toISOString() }));
  }

  clear(): void { localStorage.removeItem(STORAGE_KEY); }
}
