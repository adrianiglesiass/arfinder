export const ERROR_MESSAGES: Record<string, string> = {
  INVALID_CREDENTIALS: 'Correo o contraseña incorrectos.',

  EMAIL_ALREADY_REGISTERED: 'Este correo ya está registrado.',

  VALIDATION_ERROR: 'Por favor revisa los datos ingresados.',

  SERVER_ERROR: 'Error en el servidor.',

  NETWORK_ERROR: 'Error de conexión. Intenta de nuevo.',
};

export const DEFAULT_ERROR_MESSAGE = 'Ocurrió un error inesperado.';

export function getErrorMessage(code: string): string {
  return ERROR_MESSAGES[code] ?? DEFAULT_ERROR_MESSAGE;
}
