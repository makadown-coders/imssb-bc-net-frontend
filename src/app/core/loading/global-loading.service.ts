import { Injectable, computed, signal } from '@angular/core';

interface PendingRequest {
  id: number;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class GlobalLoadingService {
  private readonly pending = signal<PendingRequest[]>([]);
  private nextId = 0;

  readonly isLoading = computed(() => this.pending().length > 0);
  readonly message = computed(() => this.pending().at(-1)?.message ?? 'Procesando solicitud…');

  begin(message: string): () => void {
    const request = { id: ++this.nextId, message };
    this.pending.update((items) => [...items, request]);
    let finished = false;

    return () => {
      if (finished) return;
      finished = true;
      this.pending.update((items) => items.filter((item) => item.id !== request.id));
    };
  }
}
