import { Component, ElementRef, HostListener, ViewChild, computed, effect, input, output, signal } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCheck, lucideChevronDown, lucideSearch } from '@ng-icons/lucide';
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
  providers: [provideIcons({ lucideCheck, lucideChevronDown, lucideSearch })],
  templateUrl: './searchable-select.component.html',
  styleUrl: './searchable-select.component.scss',
})
export class SearchableSelectComponent {
  @ViewChild('searchInput') private readonly searchInput?: ElementRef<HTMLInputElement>;

  readonly label = input.required<string>();
  readonly placeholder = input('Selecciona una opción');
  readonly searchPlaceholder = input('Escribe para buscar');
  readonly emptyLabel = input('Sin coincidencias');
  readonly options = input<readonly SearchableSelectOption[]>([]);
  readonly value = input<SearchableSelectValue>(null);
  readonly disabled = input(false);
  readonly valueChange = output<SearchableSelectValue>();

  readonly open = signal(false);
  readonly search = signal('');
  readonly searchDirty = signal(false);
  readonly highlightedIndex = signal(0);

  private readonly instanceId = `searchable-select-${Math.random().toString(36).slice(2, 10)}`;

  readonly selectedOption = computed(() =>
    this.options().find((option) => Object.is(option.value, this.value())) ?? null,
  );

  readonly filteredOptions = computed(() => {
    const allOptions = this.options();
    if (!this.searchDirty()) {
      return allOptions;
    }

    const term = normalize(this.search());
    if (!term) {
      return allOptions;
    }

    return allOptions.filter((option) => {
      const haystack = normalize(`${option.label} ${option.keywords ?? ''}`);
      return haystack.includes(term);
    });
  });

  constructor() {
    effect(() => {
      const selectedLabel = this.selectedOption()?.label ?? '';
      if (!this.open()) {
        this.search.set(selectedLabel);
        this.searchDirty.set(false);
        this.highlightedIndex.set(0);
      }
    });
  }

  openPanel(): void {
    if (this.disabled()) {
      return;
    }

    this.open.set(true);
    this.searchDirty.set(false);
    this.highlightedIndex.set(0);
  }

  close(): void {
    this.open.set(false);
    this.searchDirty.set(false);
    this.highlightedIndex.set(0);
    this.search.set(this.selectedOption()?.label ?? '');
  }

  handleFocus(): void {
    this.openPanel();
  }

  handleInput(value: string): void {
    if (this.disabled()) {
      return;
    }

    if (!this.open()) {
      this.openPanel();
    }

    this.search.set(value);
    this.searchDirty.set(true);
    this.highlightedIndex.set(0);
  }

  select(option: SearchableSelectOption): void {
    this.valueChange.emit(option.value);
    this.search.set(option.label);
    this.close();
  }

  clearSelection(): void {
    this.valueChange.emit(null);
    this.search.set('');
    this.searchDirty.set(true);
    this.openPanel();
    queueMicrotask(() => this.searchInput?.nativeElement.focus());
  }

  onKeyDown(event: KeyboardEvent): void {
    if (this.disabled()) {
      return;
    }

    const options = this.filteredOptions();

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (!this.open()) {
          this.openPanel();
          return;
        }
        if (options.length > 0) {
          this.highlightedIndex.update((index) => (index + 1) % options.length);
        }
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (!this.open()) {
          this.openPanel();
          return;
        }
        if (options.length > 0) {
          this.highlightedIndex.update((index) => (index - 1 + options.length) % options.length);
        }
        break;
      case 'Enter':
        if (this.open() && options.length > 0) {
          event.preventDefault();
          this.select(options[this.highlightedIndex()] ?? options[0]);
        }
        break;
      case 'Escape':
        if (this.open()) {
          event.preventDefault();
          this.close();
        }
        break;
      case 'Backspace':
        if (!this.searchDirty() && this.selectedOption() && this.search().length > 0) {
          this.search.set('');
          this.searchDirty.set(true);
          this.highlightedIndex.set(0);
          event.preventDefault();
        }
        break;
      default:
        break;
    }
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
