import { HttpContextToken, HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';

import { environment } from '@env/environment';
import { catchError, from, switchMap, throwError } from 'rxjs';

import { AuthService } from '@core/auth/auth.service';

const AUTH_RETRY = new HttpContextToken<boolean>(() => false);

function isOwnApiRequest(url: string): boolean {
  const base = environment.APIURL;
  return Boolean(base) && url.startsWith(base);
}

export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  if (!isOwnApiRequest(req.url)) {
    return next(req);
  }

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
  const isRetry = req.context.get(AUTH_RETRY);

  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      if (!isOwnApiRequest(req.url) || err.status !== 401 || isRetry) {
        if (isOwnApiRequest(req.url) && err.status === 401 && isRetry) {
          void authService.invalidateSession();
        }
        return throwError(() => err);
      }

      return from(authService.forceRefreshToken()).pipe(
        switchMap((newToken) => {
          if (!newToken) {
            void authService.invalidateSession();
            return throwError(() => err);
          }
          const retryReq = req.clone({
            setHeaders: {
              Authorization: `Bearer ${newToken}`,
            },
            context: req.context.set(AUTH_RETRY, true),
          });
          return next(retryReq);
        })
      );
    })
  );
};
