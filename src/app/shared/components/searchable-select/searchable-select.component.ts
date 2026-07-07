import { Component, HostListener, computed, input, output, signal } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCheck, lucideChevronsUpDown, lucideSearch } from '@ng-icons/lucide';
import { HlmInput } from '@spartan-ng/helm/input';

export type SearchableSelectValue = string | number | boolean | null;

export interface SearchableSelectOption {
  label: string;
  value: SearchableSelectValue;
  keywords?: string;
}

@Component({
  selector: 'app-searchable-select',
  imports: [NgIcon, HlmInput],
  providers: [provideIcons({ lucideCheck, lucideChevronsUpDown, lucideSearch })],
  templateUrl: './searchable-select.component.html',
  styleUrl: './searchable-select.component.scss',
})
export class SearchableSelectComponent {
  readonly label = input.required<string>();
  readonly placeholder = input('Selecciona una opcion');
  readonly searchPlaceholder = input('Escribe para filtrar');
  readonly emptyLabel = input('Sin coincidencias');
  readonly options = input<readonly SearchableSelectOption[]>([]);
  readonly value = input<SearchableSelectValue>(null);
  readonly disabled = input(false);
  readonly valueChange = output<SearchableSelectValue>();

  readonly open = signal(false);
  readonly search = signal('');

  private readonly instanceId = `searchable-select-${Math.random().toString(36).slice(2, 10)}`;

  readonly selectedOption = computed(() =>
    this.options().find((option) => Object.is(option.value, this.value())) ?? null,
  );

  readonly filteredOptions = computed(() => {
    const term = normalize(this.search());
    if (!term) {
      return this.options();
    }

    return this.options().filter((option) => {
      const haystack = normalize(`${option.label} ${option.keywords ?? ''}`);
      return haystack.includes(term);
    });
  });

  toggle(): void {
    if (this.disabled()) {
      return;
    }

    this.open.update((current) => {
      const next = !current;
      if (next) {
        this.search.set('');
      }
      return next;
    });
  }

  close(): void {
    this.open.set(false);
    this.search.set('');
  }

  updateSearch(value: string): void {
    this.search.set(value);
  }

  select(option: SearchableSelectOption): void {
    this.valueChange.emit(option.value);
    this.close();
  }

  @HostListener('document:click', ['$event.target'])
  handleDocumentClick(target: EventTarget | null): void {
    if (!(target instanceof Element) || !this.open()) {
      return;
    }

    if (target.closest(`[data-searchable-select-id="${this.instanceId}"]`)) {
      return;
    }

    this.close();
  }

  protected readonly rootId = this.instanceId;
  protected readonly isSelected = Object.is;
}

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}
