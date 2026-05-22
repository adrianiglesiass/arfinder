import { Routes } from '@angular/router';

import { Layout } from '@layout/layout';

import { authGuard } from '@core/auth/auth-guard';
import { guestGuard } from '@core/auth/guest-guard';
import { verifyEmailGuard } from '@core/auth/verify-email.guard';
import { onboardingGuard } from '@core/profile/onboarding.guard';
import { profileGuard } from '@core/profile/profile-guard';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('@features/auth/login/login'),
  },
  {
    path: 'registro',
    canActivate: [guestGuard],
    loadComponent: () => import('@features/auth/register/register'),
  },
  {
    path: 'verificar-email',
    canActivate: [verifyEmailGuard],
    loadComponent: () => import('@features/auth/verify-email/verify-email'),
  },
  {
    path: 'auth/callback',
    loadComponent: () => import('@features/auth/callback/callback'),
  },
  {
    path: 'bienvenida',
    loadComponent: () => import('@features/onboarding/onboarding'),
    canActivate: [authGuard, onboardingGuard],
  },

  {
    path: '',
    component: Layout,
    canActivate: [profileGuard],
    children: [
      { path: '', redirectTo: 'explorar', pathMatch: 'full' },
      {
        path: 'explorar',
        loadComponent: () => import('@features/search-profile/search-profile'),
      },
      {
        path: 'perfil',
        loadComponent: () => import('@features/profile/edit/profile-edit'),
        canActivate: [authGuard],
      },
      {
        path: 'perfil/:id',
        loadComponent: () => import('@features/profile/profile-detail'),
      },
      {
        path: 'mensajes',
        loadComponent: () => import('@features/messages/messages'),
        canActivate: [authGuard],
      },
      {
        path: 'mensajes/:conversationId',
        loadComponent: () => import('@features/messages/messages'),
        canActivate: [authGuard],
      },
    ],
  },

  {
    path: '**',
    redirectTo: 'explorar',
  },
];
