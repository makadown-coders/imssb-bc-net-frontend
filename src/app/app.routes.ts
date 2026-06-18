import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/guards/auth.guard';
import { DashboardComponent } from './presentation/dashboard/dashboard.component';
import { LoginComponent } from './presentation/auth/login/login.component';
import { AdminCatalogosComponent } from './presentation/admin/catalogos/admin-catalogos.component';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  { path: 'login', component: LoginComponent, canActivate: [guestGuard] },
  { path: 'dashboard', component: DashboardComponent, canActivate: [authGuard] },
  { path: 'catalogos', component: AdminCatalogosComponent, canActivate: [authGuard] },
  { path: '**', redirectTo: 'dashboard' },
];
