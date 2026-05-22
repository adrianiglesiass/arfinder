import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';

import { retry, timer } from 'rxjs';

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 300;
const MAX_DELAY_MS = 2000;

const RETRYABLE_STATUSES = new Set([0, 502, 503]);

export const retryInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req).pipe(
    retry({
      count: MAX_RETRIES,
      delay: (error, retryCount) => {
        if (!(error instanceof HttpErrorResponse) || !RETRYABLE_STATUSES.has(error.status)) {
          throw error;
        }
        const backoff = Math.min(BASE_DELAY_MS * 2 ** (retryCount - 1), MAX_DELAY_MS);
        return timer(backoff);
      },
    })
  );
};
