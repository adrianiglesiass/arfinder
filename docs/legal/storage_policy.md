# Política de cookies y almacenamiento local

_Última actualización: 28 de octubre de 2026 · Versión 1.0.0_

Esta política explica qué información guarda Arfinder en tu navegador, conforme al artículo 22.2 de la Ley 34/2002 de Servicios de la Sociedad de la Información y de Comercio Electrónico (LSSI).

## 1. Resumen

- Arfinder **no usa cookies** propias ni de terceros.
- **No usamos analítica, publicidad ni seguimiento.**
- Usamos el almacenamiento local del navegador (`localStorage` y `sessionStorage`) solo para elementos **estrictamente necesarios** para que la aplicación funcione o para recordar una elección que tú has hecho. Por eso no mostramos un banner de consentimiento.

## 2. Qué guardamos

### localStorage (persiste entre visitas hasta que se elimina)

| Clave | Finalidad |
| --- | --- |
| `arfinder.auth.access.v1` | Token de acceso para mantener tu sesión iniciada. |
| `arfinder.auth.refresh.v1` | Token para renovar la sesión sin volver a introducir tus credenciales. |
| `arfinder.pwa.iosHintDismissed.v1` | Recordar que has cerrado el aviso para instalar la aplicación en iOS. |
| `arfinder_pending_photos`, `arfinder_pending_photos_order` | Conservar las fotos seleccionadas durante el registro inicial. Se eliminan al subirlas o al cerrar sesión. |
| `arfinder.exploreView` | Recordar si prefieres ver los perfiles en tarjetas o en cuadrícula. |

### sessionStorage (se borra al cerrar la pestaña)

| Clave | Finalidad |
| --- | --- |
| `arfinder.profiles.me.v1`, `arfinder.profiles.byId.v1` | Caché temporal de perfiles para que la aplicación cargue más rápido. |
| `arfinder_onboarding_form`, `arfinder_current_step`, `arfinder_onboarding_user_id` | Guardar el progreso del formulario de registro inicial si recargas la página. |
| `arfinder_pending_email` | Recordar tu email mientras esperas a verificarlo. |
| `insforge_pkce_verifier` | Verificador temporal del inicio de sesión con Google o Apple. Lo crea el SDK del proveedor de autenticación y se elimina al completar el inicio de sesión. |

### Service worker

Arfinder es una aplicación web progresiva (PWA). El navegador guarda en caché los archivos de la aplicación (código, estilos, iconos y fuentes) para que cargue más rápido y funcione mejor con mala conexión. Esta caché no contiene datos personales.

## 3. Recursos de terceros

Las fuentes tipográficas se sirven desde nuestros propios servidores, por lo que tu navegador no se conecta a Google Fonts. Las fotos de perfil se cargan desde Cloudinary, que recibe la petición técnica de tu navegador (incluida tu dirección IP) para poder entregarlas.

## 4. Cómo borrar estos datos

Al cerrar sesión o eliminar tu cuenta se borran los tokens de autenticación y el progreso del registro inicial, incluidas las fotos pendientes de subir. También puedes borrar todos los datos del sitio desde la configuración de tu navegador; en ese caso tendrás que volver a iniciar sesión.

## 5. Contacto

Para cualquier consulta escribe a adrianiglesias010@gmail.com.
