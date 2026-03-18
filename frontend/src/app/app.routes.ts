import { Routes } from '@angular/router';
import { authGuard } from '@core/auth/auth-guard';
import { Layout } from '@core/layout/layout';

export const routes: Routes = [
  {
    path: 'login',
    // loadComponent: () => import('@features/auth/login'),
  },

  {
    path: 'register',
    // loadComponent: () => import('@features/auth/register'), cuando cree los componentes
  },

  {
    path: '',
    component: Layout,
    canActivate: [authGuard],
    children: [
      {
        path: '',
        redirectTo: 'search',
        pathMatch: 'full',
      },
    ],
  },

  {
    path: '**',
    redirectTo: 'login',
  },
];
