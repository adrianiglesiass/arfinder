import { Routes } from '@angular/router';

import { authGuard } from '@core/auth/auth-guard';
import { verifyEmailGuard } from '@core/auth/verify-email.guard';
import { Layout } from '@core/layout/layout';
import { profileGuard } from '@core/profile/profile-guard';

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
    path: 'onboarding',
    loadComponent: () => import('@features/onboarding/onboarding'),
    canActivate: [authGuard],
  },

  {
    path: '',
    component: Layout,
    canActivate: [authGuard, profileGuard],
    children: [],
  },

  {
    path: '**',
    redirectTo: 'login',
  },
];
