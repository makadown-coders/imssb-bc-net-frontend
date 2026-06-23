import { Component, OnInit, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { AuthStore } from '../../../application/auth/state/auth.store';

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatButtonModule, MatToolbarModule, MatIconModule],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss',
})
export class ShellComponent implements OnInit {
  private readonly router = inject(Router);
  readonly showNavigation = signal(this.router.url !== '/login');

  constructor(readonly authStore: AuthStore) {}

  ngOnInit(): void {
    this.router.events.pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd)).subscribe((event) => {
      this.showNavigation.set(event.urlAfterRedirects !== '/login');
    });

    this.authStore.restoreSession();
    if (this.authStore.isAuthenticated() && !this.authStore.currentUser()) {
      this.authStore.loadCurrentUser().subscribe({ error: () => undefined });
    }
  }
}
