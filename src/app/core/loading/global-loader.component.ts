import { Component, OnDestroy, effect, inject, signal } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { GlobalLoadingService } from './global-loading.service';

@Component({
  selector: 'app-global-loader',
  imports: [MatProgressSpinnerModule],
  templateUrl: './global-loader.component.html',
  styleUrl: './global-loader.component.scss',
})
export class GlobalLoaderComponent implements OnDestroy {
  readonly loading = inject(GlobalLoadingService);
  readonly visible = signal(false);
  readonly takingLonger = signal(false);
  private showTimer?: ReturnType<typeof setTimeout>;
  private longWaitTimer?: ReturnType<typeof setTimeout>;

  constructor() {
    effect(() => {
      if (this.loading.isLoading()) {
        this.startTimers();
      } else {
        this.clearTimers();
        this.visible.set(false);
        this.takingLonger.set(false);
      }
    });
  }

  ngOnDestroy(): void { this.clearTimers(); }

  private startTimers(): void {
    if (!this.showTimer && !this.visible()) {
      this.showTimer = setTimeout(() => {
        this.visible.set(true);
        this.showTimer = undefined;
      }, 250);
    }
    if (!this.longWaitTimer && !this.takingLonger()) {
      this.longWaitTimer = setTimeout(() => {
        this.takingLonger.set(true);
        this.longWaitTimer = undefined;
      }, 4000);
    }
  }

  private clearTimers(): void {
    clearTimeout(this.showTimer);
    clearTimeout(this.longWaitTimer);
    this.showTimer = undefined;
    this.longWaitTimer = undefined;
  }
}
