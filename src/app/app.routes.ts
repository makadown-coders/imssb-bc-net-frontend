import { Routes } from '@angular/router';
import { adminTicGuard, authGuard, guestGuard, ibOncoGuard, proyectosSaludGuard, solicitudesGuard } from './core/guards/auth.guard';
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
  { path: 'homologos-config', loadComponent: () => import('./presentation/homologos-config/homologos-config.component').then((module) => module.HomologosConfigComponent), canActivate: [authGuard, proyectosSaludGuard], title: 'Relaciones de sustitución' },
  { path: 'ib-onco', loadComponent: () => import('./presentation/ib-onco/ib-onco-page.component').then((module) => module.IbOncoPageComponent), canActivate: [authGuard, ibOncoGuard], title: 'IB Onco' },
  { path: 'solicitudes', loadComponent: () => import('./presentation/solicitudes/layout/layout.component').then((module) => module.LayoutComponent), canActivate: [authGuard, solicitudesGuard], title: 'Solicitudes de abasto' },
  { path: 'solicitudes-config', loadComponent: () => import('./presentation/solicitudes-config/solicitudes-config.component').then((module) => module.SolicitudesConfigComponent), canActivate: [authGuard, adminTicGuard], title: 'Configuración de solicitudes' },
  { path: 'cambiar-contrasena', component: ChangePasswordComponent, canActivate: [authGuard] },
  { path: 'catalogos', component: AdminCatalogosComponent, canActivate: [authGuard, adminTicGuard] },
  { path: 'personas', component: AdminPersonasComponent, canActivate: [authGuard, adminTicGuard] },
  { path: 'usuarios', component: AdminUsersComponent, canActivate: [authGuard, adminTicGuard] },
  { path: '**', redirectTo: 'dashboard' },
];
