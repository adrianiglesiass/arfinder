import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';

import { catchError, throwError } from 'rxjs';
import { from, switchMap } from 'rxjs';

import { AuthService } from '@core/auth/auth.service';

export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);

  return from(authService.getToken()).pipe(
    switchMap((token) => {
      if (token) {
        const newReq = req.clone({
          setHeaders: {
            Authorization: `Bearer ${token}`,
          },
        });
        return next(newReq);
      }
      return next(req);
    })
  );
};

export const authErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 401) {
        const authPaths = ['/login', '/register', '/verify-email'];
        const onAuthPage = authPaths.some((p) => router.url.startsWith(p));

        if (!onAuthPage) {
          from(authService.logout()).subscribe(() => {
            router.navigate(['/login']);
          });
        }
      }
      return throwError(() => err);
    })
  );
};
