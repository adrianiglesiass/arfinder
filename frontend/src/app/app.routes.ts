import { Routes } from '@angular/router';

import { Layout } from '@layout/layout';

import { authGuard } from '@core/auth/auth-guard';
import { guestGuard } from '@core/auth/guest-guard';
import { verifyEmailGuard } from '@core/auth/verify-email.guard';
import { unsavedChangesGuard } from '@core/navigation/unsaved-changes.guard';
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
    path: 'privacidad',
    loadComponent: () => import('@features/legal/privacy/privacy'),
  },
  {
    path: 'terminos',
    loadComponent: () => import('@features/legal/terms/terms'),
  },
  {
    path: 'cookies',
    loadComponent: () => import('@features/legal/cookies/cookies'),
  },
  {
    path: 'aviso-legal',
    loadComponent: () => import('@features/legal/legal-notice/legal-notice'),
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
        canDeactivate: [unsavedChangesGuard],
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
      {
        path: 'favoritos',
        loadComponent: () => import('@features/favorites/favorites'),
        canActivate: [authGuard],
      },
      {
        path: 'bloqueados',
        loadComponent: () => import('@features/blocked/blocked'),
        canActivate: [authGuard],
      },
    ],
  },

  {
    path: '**',
    redirectTo: 'explorar',
  },
];
