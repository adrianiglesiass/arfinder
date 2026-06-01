# Modelo Relacional

> Nomenclatura en español, coherente con el diagrama EER. La equivalencia con los
> identificadores reales de la base de datos (en inglés) es la siguiente.

## Equivalencia con la base de datos real (inglés)

Los identificadores reales en `backend/app/models/*.py` están en inglés:

| Español (memoria)         | Real (código/BD)    |
| ------------------------- | ------------------- |
| usuario                   | user                |
| perfil                    | profile             |
| foto_perfil               | profile_photo       |
| conversacion              | conversation        |
| mensaje                   | message             |
| correo                    | email               |
| contraseña_hash           | password_hash       |
| creado_en                 | created_at          |
| usuario_id                | user_id             |
| nombre                    | name                |
| edad                      | age                 |
| ciudad                    | city                |
| presupuesto_max           | max_budget          |
| mascotas                  | has_pets            |
| fumador                   | is_smoker           |
| horario                   | schedule            |
| genero                    | gender              |
| disponible_desde          | available_from      |
| tipo                      | type                |
| descripcion_habitacion    | room_description    |
| perfil_id                 | profile_id          |
| url                       | photo_url           |
| orden                     | order               |
| es_principal              | is_main             |
| usuario1_id / usuario2_id | user1_id / user2_id |
| conversacion_id           | conversation_id     |
| emisor_id                 | sender_id           |
| contenido                 | content             |
| enviado_en                | sent_at             |
| leido                     | is_read             |
| leido_en                  | read_at             |
