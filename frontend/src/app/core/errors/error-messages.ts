export const ERROR_MESSAGES: Record<string, string> = {
  INVALID_CREDENTIALS: 'Correo o contraseña incorrectos.',

  EMAIL_ALREADY_REGISTERED: 'Este correo ya está registrado.',

  VALIDATION_ERROR: 'Por favor revisa los datos ingresados.',

  SERVER_ERROR: 'Error en el servidor.',

  NETWORK_ERROR: 'Error de conexión. Intenta de nuevo.',

  IMAGE_UPLOAD_FAILED: 'No pudimos subir la foto. Inténtalo de nuevo.',

  USER_REPORT_ALREADY_EXISTS: 'Ya habías reportado a esta persona.',

  CANNOT_REPORT_SELF: 'No puedes reportar tu propio perfil.',

  PHOTO_LIMIT_REACHED: 'Ya tienes el máximo de 6 fotos en tu perfil.',

  PAYLOAD_TOO_LARGE: 'La foto es demasiado grande. El máximo es 10 MB.',
};

export const DEFAULT_ERROR_MESSAGE = 'Ocurrió un error inesperado.';

export function getErrorMessage(code: string): string {
  return ERROR_MESSAGES[code] ?? DEFAULT_ERROR_MESSAGE;
}
