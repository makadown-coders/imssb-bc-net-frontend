import { Component, OnInit } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
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
  constructor(readonly authStore: AuthStore) {}

  ngOnInit(): void {
    this.authStore.restoreSession();
    if (this.authStore.isAuthenticated() && !this.authStore.currentUser()) {
      this.authStore.loadCurrentUser().subscribe({ error: () => undefined });
    }
  }
}
