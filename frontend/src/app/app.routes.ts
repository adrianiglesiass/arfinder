import { Routes } from '@angular/router';

import { authGuard } from '@core/auth/auth-guard';
import { verifyEmailGuard } from '@core/auth/verify-email.guard';
import { Layout } from '@core/layout/layout';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('@features/auth/login/login'),
  },

  {
    path: 'register',
    loadComponent: () => import('@features/auth/register/register'),
  },
  {
    path: 'verify-email',
    canActivate: [verifyEmailGuard],
    loadComponent: () => import('@features/auth/verify-email/verify-email'),
  },

  {
    path: '',
    component: Layout,
    canActivate: [authGuard],
    children: [],
  },

  {
    path: '**',
    redirectTo: 'login',
  },
];
