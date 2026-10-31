# Registro de actividades de tratamiento

_Documento interno · Última actualización: 31 de octubre de 2026 · Versión 1.1.0_

Registro de las actividades de tratamiento que realiza Arfinder como responsable, conforme al artículo 30 del Reglamento (UE) 2016/679 (RGPD). Se mantiene actualizado junto con la [Política de privacidad](privacy_policy.md) y con el resto de documentos legales.

## Datos del responsable

- **Responsable:** Adrian Iglesias Álvarez
- **País:** España
- **Email de contacto:** adrianiglesias010@gmail.com
- **Naturaleza:** proyecto académico sin ánimo de lucro, sin actividad comercial, publicidad ni cesión de datos con fines comerciales.
- **Delegado de Protección de Datos:** no designado (no concurren los supuestos del artículo 37 RGPD).

## Actividades de tratamiento

### 1. Cuentas y autenticación

| Campo | Detalle |
| --- | --- |
| Finalidad | Registrar y autenticar a la persona usuaria, verificar su email, iniciar sesión (email o proveedor externo) y conservar la prueba del consentimiento de los Términos y condiciones y de esta Política de privacidad, incluida la confirmación de mayoría de edad. |
| Categorías de interesados | Personas registradas en Arfinder. |
| Categorías de datos | Email; identificador de la cuenta de Google o Apple cuando se usa ese método; estado de verificación del email; fecha y versión de aceptación de los Términos y condiciones y de la Política de privacidad; confirmación de ser mayor de 18 años; tokens de sesión. No se almacenan contraseñas: las gestiona el proveedor de autenticación. |
| Base jurídica | Ejecución del contrato (art. 6.1.b RGPD). El registro del consentimiento se conserva como prueba de la relación contractual y de la licitud del tratamiento. |
| Destinatarios / encargados | InsForge (autenticación, verificación de email, inicio de sesión con Google o Apple y base de datos); Google y Apple, solo si la persona elige esos métodos de inicio de sesión. |
| Plazo de conservación | Mientras la cuenta permanezca activa. Se elimina al suprimir la cuenta, salvo copias de seguridad técnicas de los proveedores, que se purgan según sus ciclos habituales. |
| Medidas de seguridad | Autenticación delegada en un proveedor especializado; comunicaciones cifradas mediante HTTPS; tokens de sesión; acceso restringido a la base de datos; limitación de peticiones por IP y por usuario. |

### 2. Perfiles

| Campo | Detalle |
| --- | --- |
| Finalidad | Publicar el perfil de convivencia y permitir que otros usuarios registrados lo consulten y busquen perfiles compatibles mediante filtros. |
| Categorías de interesados | Personas registradas que crean un perfil. |
| Categorías de datos | Nombre, edad, ciudad, biografía, presupuesto máximo, mascotas, tabaquismo, horario, género (texto libre), fecha de disponibilidad, tipo de perfil (se busca habitación o se ofrece) y descripción de la habitación. Los campos de texto libre pueden contener datos de categorías especiales si la persona decide incluirlos. |
| Base jurídica | Ejecución del contrato (art. 6.1.b RGPD). Consentimiento explícito (art. 9.2.a RGPD) para los datos de categorías especiales que la persona decida incluir en campos de texto libre. |
| Destinatarios / encargados | InsForge (base de datos); Fly.io (alojamiento de la API). El perfil solo es accesible para usuarios autenticados: no existe consulta pública sin sesión. |
| Plazo de conservación | Mientras el perfil y la cuenta permanezcan activos. Se elimina al borrar el perfil o la cuenta. |
| Medidas de seguridad | Acceso restringido a usuarios autenticados; exclusión de perfiles bloqueados en búsquedas y detalles; email nunca visible para otras personas usuarias; limitación de peticiones; cabeceras de seguridad y `noindex` para evitar la indexación. |

### 3. Mensajería

| Campo | Detalle |
| --- | --- |
| Finalidad | Permitir el envío y la recepción de mensajes entre personas usuarias y mostrar el estado de lectura. |
| Categorías de interesados | Personas registradas que participan en una conversación. |
| Categorías de datos | Contenido de los mensajes, identificadores de las personas participantes, fecha de envío y estado de lectura. |
| Base jurídica | Ejecución del contrato (art. 6.1.b RGPD). |
| Destinatarios / encargados | InsForge (base de datos); Fly.io (alojamiento de la API y conexiones en tiempo real). |
| Plazo de conservación | Mientras la cuenta permanezca activa. Las conversaciones y mensajes se eliminan al borrar la cuenta. |
| Medidas de seguridad | Acceso limitado a las dos personas de la conversación; bloqueo de mensajería entre usuarios con un bloqueo activo; comunicaciones cifradas; limitación de mensajes por usuario. |

### 4. Fotos de perfil

| Campo | Detalle |
| --- | --- |
| Finalidad | Almacenar y mostrar las fotos que la persona usuaria sube a su perfil. |
| Categorías de interesados | Personas registradas que suben fotos. |
| Categorías de datos | Imágenes de perfil, identificadores de almacenamiento y orden de presentación. |
| Base jurídica | Ejecución del contrato (art. 6.1.b RGPD). |
| Destinatarios / encargados | Cloudinary (almacenamiento y entrega de imágenes); InsForge (base de datos con las referencias de las fotos). |
| Plazo de conservación | Mientras la foto, el perfil o la cuenta permanezcan activos. Al eliminar una foto, el perfil o la cuenta se solicita el borrado del archivo al proveedor; si no responde, la incidencia se registra para su eliminación posterior. |
| Medidas de seguridad | Validación del tipo de archivo por cabecera; límite de tamaño por subida; borrado del archivo en el proveedor al suprimir la foto o la cuenta; entrega mediante HTTPS. |

### 5. Búsqueda de ciudades

| Campo | Detalle |
| --- | --- |
| Finalidad | Autocompletar el nombre de la ciudad que la persona escribe. |
| Categorías de interesados | Personas que usan el autocompletado de ciudades, principalmente durante el alta o la edición del perfil. |
| Categorías de datos | Texto introducido en el buscador de ciudades. |
| Base jurídica | Ejecución del contrato (art. 6.1.b RGPD). |
| Destinatarios / encargados | OpenStreetMap Nominatim (OpenStreetMap Foundation), solo cuando la búsqueda local no devuelve resultados: recibe el texto de búsqueda desde el servidor, no la dirección IP de la persona. |
| Plazo de conservación | No se persiste en Arfinder: el texto se procesa para devolver resultados y no se almacena asociado a la persona usuaria. |
| Medidas de seguridad | Consulta al proveedor externo desde el servidor, sin exponer la IP de la persona; limitación de peticiones; respuesta desde un dataset local siempre que sea posible. |

### 6. Seguridad del servicio y prevención de abusos

| Campo | Detalle |
| --- | --- |
| Finalidad | Proteger la seguridad del servicio, prevenir abusos (bloqueos y reportes), aplicar límites de uso y resolver incidencias técnicas. |
| Categorías de interesados | Todas las personas que usan Arfinder y cualquier cliente que realice peticiones a la API. |
| Categorías de datos | Dirección IP y clave de limitación derivada de ella; identificadores de usuario; marcas temporales; contadores de peticiones en memoria; relaciones de bloqueo entre usuarios; motivos de los reportes; registros técnicos de errores. |
| Base jurídica | Interés legítimo (art. 6.1.f RGPD) en mantener un servicio seguro y disponible. |
| Destinatarios / encargados | Fly.io (alojamiento de la API y registros de infraestructura). |
| Plazo de conservación | Los contadores de limitación de peticiones se mantienen en memoria durante la ventana de limitación (un minuto). Los registros técnicos se conservan según el ciclo habitual del proveedor de alojamiento y no se usan para otras finalidades. |
| Medidas de seguridad | Limitación de peticiones por IP y por usuario; cabeceras de seguridad en todas las respuestas; autenticación obligatoria para acceder a perfiles; bloqueos y reportes entre usuarios; secretos fuera del repositorio. |

### 7. Ejercicio de derechos

| Campo | Detalle |
| --- | --- |
| Finalidad | Atender las solicitudes de acceso, rectificación, supresión, limitación, portabilidad y oposición, y acreditar su cumplimiento. |
| Categorías de interesados | Personas que ejercen sus derechos o presentan una consulta relacionada con la privacidad. |
| Categorías de datos | Email de contacto y email de la cuenta; contenido de la solicitud; derecho ejercido; fecha de la solicitud y de la respuesta; comprobaciones necesarias para verificar la identidad. |
| Base jurídica | Cumplimiento de una obligación legal (art. 6.1.c RGPD). |
| Destinatarios / encargados | Google (Gmail), que aloja el buzón de contacto del responsable; InsForge (base de datos). No se ceden a terceros salvo obligación legal. |
| Plazo de conservación | Durante el tiempo necesario para atender la solicitud y acreditar su cumplimiento, y después bloqueados durante los plazos de prescripción legalmente aplicables. |
| Medidas de seguridad | Acceso restringido al buzón de contacto; verificación de identidad antes de ejecutar la solicitud; registro de la fecha de respuesta. |

## Notas

- Los datos no se ceden a terceros salvo obligación legal. Los proveedores indicados actúan como encargados del tratamiento o como servicios técnicos necesarios.
- Las transferencias internacionales, cuando se producen, se amparan en las Cláusulas Contractuales Tipo de la Comisión Europea y/o en la certificación del proveedor en el Marco de Privacidad de Datos UE-EE. UU. (Data Privacy Framework), según corresponda. El detalle figura en la [Política de privacidad](privacy_policy.md).
- Estado de los encargados: los acuerdos de encargo (DPA) y las ubicaciones de tratamiento de Cloudinary, InsForge y Fly.io están pendientes de confirmación y firma. Este registro se actualizará cuando se completen.
