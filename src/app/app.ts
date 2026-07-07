import { Component } from '@angular/core';
import { ShellComponent } from './core/layout/shell/shell.component';
import { GlobalLoaderComponent } from './core/loading/global-loader.component';
import { HlmToaster } from '@spartan-ng/helm/sonner';

@Component({
  selector: 'app-root',
  imports: [ShellComponent, GlobalLoaderComponent, HlmToaster],
  template: '<app-shell /><app-global-loader /><hlm-toaster position="top-right" />',
})
export class App {}
