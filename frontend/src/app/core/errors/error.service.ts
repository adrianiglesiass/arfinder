import { HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { FormGroup } from '@angular/forms';

import { DEFAULT_ERROR_MESSAGE, getErrorMessage } from '@core/errors/error-messages';
import {
  FieldValidationError,
  isErrorResponse,
  isFastApiError,
  isFieldValidationErrors,
} from '@core/errors/error-response.model';

@Injectable({
  providedIn: 'root',
})
export class ErrorService {
  getErrorMessage(error: HttpErrorResponse): string {
    const errorBody = error.error as unknown;

    if (isFastApiError(errorBody)) {
      return errorBody.detail.map((d) => d.msg).join('. ');
    }

    if (isErrorResponse(errorBody)) {
      const { code, detail } = errorBody;
      if (code) {
        return getErrorMessage(code);
      }
      if (typeof detail === 'string') {
        return detail;
      }
    }

    return DEFAULT_ERROR_MESSAGE;
  }

  getValidationErrors(error: HttpErrorResponse): FieldValidationError[] {
    if (isErrorResponse(error.error)) {
      const { code, detail } = error.error;

      if (code === 'VALIDATION_ERROR' && isFieldValidationErrors(detail)) {
        return detail;
      }
    }

    return [];
  }

  applyValidationErrors(form: FormGroup, validationErrors: FieldValidationError[]): void {
    validationErrors.forEach(({ field, message }) => {
      const control = form.get(field);
      if (control) {
        control.setErrors({ serverError: message });
        control.markAsTouched();
      }
    });
  }

  processError(error: HttpErrorResponse) {
    return {
      general: this.getErrorMessage(error),
      fieldErrors: this.getValidationErrors(error),
    };
  }
}
