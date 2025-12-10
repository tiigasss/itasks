import { Routes } from '@angular/router';
import { authGuard, roleGuard } from './guards/role.guard';

export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./login/login/login').then(m => m.Login) },
  { path: 'board', loadComponent: () => import('./board/board').then(m => m.Board), canActivate: [authGuard] },

  { path: 'users', loadComponent: () => import('./users/user-management/user-management').then(m => m.UserManagementComponent), canActivate: [authGuard, roleGuard(['Gestor'])] },
  { path: 'types', loadComponent: () => import('./types/type-management/type-management').then(m => m.TypeManagementComponent), canActivate: [authGuard, roleGuard(['Gestor'])] },

  { path: 'reports/programmer', loadComponent: () => import('./reports/programmer-completed/programmer-completed').then(m => m.ProgrammerCompletedComponent), canActivate: [authGuard] },
  { path: 'reports/manager/completed', loadComponent: () => import('./reports/manager-completed/manager-completed').then(m => m.ManagerCompletedComponent), canActivate: [authGuard, roleGuard(['Gestor'])] },
  { path: 'reports/manager/pending', loadComponent: () => import('./reports/manager-pending/manager-pending').then(m => m.ManagerPendingComponent), canActivate: [authGuard, roleGuard(['Gestor'])] },

  { path: '', redirectTo: 'board', pathMatch: 'full' },
  { path: '**', redirectTo: 'board' }
];
