import { Component } from '@angular/core';
import { ShellComponent } from './core/layout/shell/shell.component';
import { GlobalLoaderComponent } from './core/loading/global-loader.component';

@Component({
  selector: 'app-root',
  imports: [ShellComponent, GlobalLoaderComponent],
  template: '<app-shell /><app-global-loader />',
})
export class App {}
