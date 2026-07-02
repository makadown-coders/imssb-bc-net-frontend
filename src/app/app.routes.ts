import { Routes } from '@angular/router';
import { adminTicGuard, authGuard, guestGuard } from './core/guards/auth.guard';
import { DashboardComponent } from './presentation/dashboard/dashboard.component';
import { LoginComponent } from './presentation/auth/login/login.component';
import { AdminCatalogosComponent } from './presentation/admin/catalogos/admin-catalogos.component';
import { AdminPersonasComponent } from './presentation/admin/personas/admin-personas.component';
import { AdminUsersComponent } from './presentation/admin/users/admin-users.component';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  { path: 'login', component: LoginComponent, canActivate: [guestGuard] },
  { path: 'dashboard', component: DashboardComponent, canActivate: [authGuard] },
  { path: 'catalogos', component: AdminCatalogosComponent, canActivate: [authGuard, adminTicGuard] },
  { path: 'personas', component: AdminPersonasComponent, canActivate: [authGuard, adminTicGuard] },
  { path: 'usuarios', component: AdminUsersComponent, canActivate: [authGuard, adminTicGuard] },
  { path: '**', redirectTo: 'dashboard' },
];
