export interface ErrorResponse {
  code: string;
  detail: string | FieldValidationError[];
}

export interface FieldValidationError {
  field: string;
  message: string;
}

export function isFieldValidationErrors(detail: unknown): detail is FieldValidationError[] {
  return (
    Array.isArray(detail) &&
    detail.length > 0 &&
    detail.every((d) => typeof d === 'object' && 'field' in d && 'message' in d)
  );
}

export function isErrorResponse(error: unknown): error is ErrorResponse {
  return typeof error === 'object' && error !== null && 'code' in error && 'detail' in error;
}
