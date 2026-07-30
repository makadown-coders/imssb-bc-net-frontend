import { BreakpointObserver } from '@angular/cdk/layout';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideClipboardList, lucideLayoutDashboard, lucideListTree, lucideMenu, lucideSettings2, lucideUserCog, lucideUsers, lucideX } from '@ng-icons/lucide';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { HlmButton } from '@spartan-ng/helm/button';
import { filter } from 'rxjs';
import { AuthStore } from '../../../application/auth/state/auth.store';
import { TokenStoragePort } from '../../../infrastructure/auth/storage/token-storage.port';
import { hasTokenRole } from '../../auth/jwt-claims';

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, NgIcon, HlmButton],
  providers: [provideIcons({ lucideClipboardList, lucideLayoutDashboard, lucideListTree, lucideMenu, lucideSettings2, lucideUserCog, lucideUsers, lucideX })],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss',
})
export class ShellComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly tokenStorage = inject(TokenStoragePort);
  private readonly breakpointObserver = inject(BreakpointObserver);
  private readonly destroyRef = inject(DestroyRef);
  readonly showNavigation = signal(this.router.url !== '/login');
  readonly mobileNavigationOpen = signal(false);
  readonly isMobile = signal(false);
  readonly isAbastoRoute = signal(this.router.url.startsWith('/solicitudes'));
  readonly isAdminTic = computed(() => { this.authStore.isAuthenticated(); return hasTokenRole(this.tokenStorage.getAccessToken(), 'ADMIN_TIC'); });
  readonly isIBOnco = computed(() => { this.authStore.isAuthenticated(); return hasTokenRole(this.tokenStorage.getAccessToken(), 'IB_ONCO'); });
  readonly canAccessUnidadesMedicas = computed(() => { this.authStore.isAuthenticated(); const token = this.tokenStorage.getAccessToken(); return ['IB_ONCO', 'UNIDAD_MEDICA', 'ADMIN_TIC', 'COORDINACION', 'ENFERMERIA'].some((role) => hasTokenRole(token, role)); });
  readonly canAccessSolicitudes = computed(() => { this.authStore.isAuthenticated(); const token = this.tokenStorage.getAccessToken(); return ['IB_ONCO', 'SOLICITUDES_ABASTO', 'ADMIN_TIC', 'COORDINACION', 'ABASTO'].some((role) => hasTokenRole(token, role)); });

  constructor(readonly authStore: AuthStore) { }

  ngOnInit(): void {
    this.breakpointObserver.observe('(max-width: 900px)').pipe(takeUntilDestroyed(this.destroyRef)).subscribe(({ matches }) => { this.isMobile.set(matches); this.mobileNavigationOpen.set(false); });
    this.router.events.pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd), takeUntilDestroyed(this.destroyRef)).subscribe((event) => { this.showNavigation.set(event.urlAfterRedirects !== '/login'); this.mobileNavigationOpen.set(false); this.isAbastoRoute.set(event.urlAfterRedirects.startsWith('/solicitudes')); });
    this.authStore.restoreSession();
    if (this.authStore.isAuthenticated() && !this.authStore.currentUser()) this.authStore.loadCurrentUser().subscribe({ error: () => undefined });
  }
  toggleNavigation(): void { this.mobileNavigationOpen.update((open) => !open); }
  closeNavigation(): void { this.mobileNavigationOpen.set(false); }
}
