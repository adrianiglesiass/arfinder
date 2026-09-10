import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';

import { retry, timer } from 'rxjs';

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 300;
const MAX_DELAY_MS = 2000;

const RETRYABLE_STATUSES = new Set([0, 429, 500, 502, 503, 504]);
const RETRYABLE_METHODS = new Set(['GET', 'HEAD']);

export const retryInterceptor: HttpInterceptorFn = (req, next) => {
  if (!RETRYABLE_METHODS.has(req.method.toUpperCase())) {
    return next(req);
  }

  return next(req).pipe(
    retry({
      count: MAX_RETRIES,
      delay: (error, retryCount) => {
        if (!(error instanceof HttpErrorResponse) || !RETRYABLE_STATUSES.has(error.status)) {
          throw error;
        }
        const backoff = Math.min(
          BASE_DELAY_MS * 2 ** (retryCount - 1) + Math.random() * BASE_DELAY_MS,
          MAX_DELAY_MS
        );
        return timer(backoff);
      },
    })
  );
};
