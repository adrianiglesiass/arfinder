import { HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { FormGroup } from '@angular/forms';

import { DEFAULT_ERROR_MESSAGE, getErrorMessage } from './error-messages';
import {
  FieldValidationError,
  isErrorResponse,
  isFieldValidationErrors,
} from './error-response.model';

@Injectable({
  providedIn: 'root',
})
export class ErrorService {
  getErrorMessage(error: HttpErrorResponse): string {
    if (isErrorResponse(error.error)) {
      const { code } = error.error;
      return getErrorMessage(code);
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
