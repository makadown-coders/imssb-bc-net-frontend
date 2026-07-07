import { Routes } from '@angular/router';
import { adminTicGuard, authGuard, guestGuard, solicitudesGuard } from './core/guards/auth.guard';
import { DashboardComponent } from './presentation/dashboard/dashboard.component';
import { LoginComponent } from './presentation/auth/login/login.component';
import { AdminCatalogosComponent } from './presentation/admin/catalogos/admin-catalogos.component';
import { AdminPersonasComponent } from './presentation/admin/personas/admin-personas.component';
import { AdminUsersComponent } from './presentation/admin/users/admin-users.component';
import { ChangePasswordComponent } from './presentation/account/change-password/change-password.component';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  { path: 'login', component: LoginComponent, canActivate: [guestGuard] },
  { path: 'dashboard', component: DashboardComponent, canActivate: [authGuard] },
  { path: 'solicitudes', loadComponent: () => import('./presentation/solicitudes/solicitudes.component').then((module) => module.SolicitudesComponent), canActivate: [authGuard, solicitudesGuard], title: 'Solicitudes de abasto' },
  { path: 'solicitudes-config', loadComponent: () => import('./presentation/solicitudes-config/solicitudes-config.component').then((module) => module.SolicitudesConfigComponent), canActivate: [authGuard, adminTicGuard], title: 'Configuración de solicitudes' },
  { path: 'cambiar-contrasena', component: ChangePasswordComponent, canActivate: [authGuard] },
  { path: 'catalogos', component: AdminCatalogosComponent, canActivate: [authGuard, adminTicGuard] },
  { path: 'personas', component: AdminPersonasComponent, canActivate: [authGuard, adminTicGuard] },
  { path: 'usuarios', component: AdminUsersComponent, canActivate: [authGuard, adminTicGuard] },
  { path: '**', redirectTo: 'dashboard' },
];
