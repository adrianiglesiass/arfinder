export interface ErrorResponse {
  code?: string;
  detail: string | FieldValidationError[] | FastApiValidationError[];
}

export interface FieldValidationError {
  field: string;
  message: string;
}

export interface FastApiValidationError {
  loc: (string | number)[];
  msg: string;
  type: string;
}

export function isFieldValidationErrors(detail: unknown): detail is FieldValidationError[] {
  return (
    Array.isArray(detail) &&
    detail.length > 0 &&
    detail.every((d) => typeof d === 'object' && 'field' in d && 'message' in d)
  );
}

export function isFastApiError(error: unknown): error is { detail: FastApiValidationError[] } {
  const err = error as Record<string, unknown>;
  return (
    err &&
    Array.isArray(err['detail']) &&
    err['detail'].length > 0 &&
    typeof err['detail'][0] === 'object' &&
    err['detail'][0] !== null &&
    'loc' in (err['detail'][0] as object) &&
    'msg' in (err['detail'][0] as object)
  );
}

export function isErrorResponse(error: unknown): error is ErrorResponse {
  return typeof error === 'object' && error !== null && 'detail' in error;
}

export interface InsForgeErrorLike {
  statusCode: number;
  message?: string;
  error?: string;
}

export function isInsForgeError(error: unknown): error is InsForgeErrorLike {
  return (
    typeof error === 'object' &&
    error !== null &&
    'statusCode' in error &&
    typeof (error as { statusCode: unknown }).statusCode === 'number'
  );
}
