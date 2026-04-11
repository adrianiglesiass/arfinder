import os

import sys


sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))  # noqa # isort: skip


from app.models.user import User

from app.models.profile_photo import ProfilePhoto

from app.models.profile import Profile, ScheduleEnum, TypeEnum

from app.models.message import Message

from app.models.conversation import Conversation

from app.db.database import SessionLocal

from datetime import UTC, date, datetime


SEED_USERS = [
    {
        "email": "adrian@arfinder.com",
        "password": "Arfinder2026!",
        "profile": {
            "name": "Adrián Iglesias",
            "age": 21,
            "city": "A Coruña",
            "bio": "Desarrollador Web. Me encantan los deportes, la música y viajar. Busco un piso tranquilo donde vivir y trabajar.",
            "max_budget": 700,
            "has_pets": True,
            "is_smoker": False,
            "schedule": ScheduleEnum.morning,
            "gender": "Hombre",
            "available_from": date(2025, 3, 1),
            "type": TypeEnum.looking_for_flat,
            "room_description": None,
        },
        "photos": [
            {
                "url": "https://picsum.photos/seed/adrian1/400/400",
                "order": 0,
                "is_main": True,
            },
            {
                "url": "https://picsum.photos/seed/adrian2/400/400",
                "order": 1,
                "is_main": False,
            },
        ],
    },
    {
        "email": "carlos@arfinder.com",
        "password": "Arfinder2026!",
        "profile": {
            "name": "Carlos Mendoza",
            "age": 31,
            "city": "Barcelona",
            "bio": "Ingeniero de software en startup. Trabajo desde casa a veces. Tranquilo, ordenado, aficionado al senderismo y la cerveza artesana.",
            "max_budget": 900,
            "has_pets": False,
            "is_smoker": False,
            "schedule": ScheduleEnum.flexible,
            "gender": "Hombre",
            "available_from": date(2025, 2, 15),
            "type": TypeEnum.looking_for_flat,
            "room_description": None,
        },
        "photos": [
            {
                "url": "https://picsum.photos/seed/carlos1/400/400",
                "order": 0,
                "is_main": True,
            },
            {
                "url": "https://picsum.photos/seed/carlos2/400/400",
                "order": 1,
                "is_main": False,
            },
        ],
    },
    {
        "email": "ana@arfinder.com",
        "password": "Arfinder2026!",
        "profile": {
            "name": "Ana Rodríguez",
            "age": 25,
            "city": "Sevilla",
            "bio": "Tengo un apartamento precioso en el centro de Sevilla con una habitación libre. Busco alguien tranquilo y responsable.",
            "max_budget": 550,
            "has_pets": False,
            "is_smoker": False,
            "schedule": ScheduleEnum.afternoon,
            "gender": "Mujer",
            "available_from": date(2025, 1, 1),
            "type": TypeEnum.looking_for_roommate,
            "room_description": "Habitación de 14m² amueblada con escritorio, armario empotrado y ventana a patio interior. Muy luminosa. Baño compartido.",
        },
        "photos": [
            {
                "url": "https://picsum.photos/seed/ana1/400/400",
                "order": 0,
                "is_main": True,
            },
            {
                "url": "https://picsum.photos/seed/ana2/400/400",
                "order": 1,
                "is_main": False,
            },
            {
                "url": "https://picsum.photos/seed/ana3/400/400",
                "order": 2,
                "is_main": False,
            },
        ],
    },
    {
        "email": "javier@arfinder.com",
        "password": "Arfinder2026!",
        "profile": {
            "name": "Javier Torres",
            "age": 29,
            "city": "Valencia",
            "bio": "Chef en restaurante. Horario nocturno, duermo por las mañanas. Muy limpio y organizado. Apasionado de la cocina y la música.",
            "max_budget": 650,
            "has_pets": True,
            "is_smoker": True,
            "schedule": ScheduleEnum.night,
            "gender": "Hombre",
            "available_from": date(2025, 4, 1),
            "type": TypeEnum.looking_for_flat,
            "room_description": None,
        },
        "photos": [
            {
                "url": "https://picsum.photos/seed/javier1/400/400",
                "order": 0,
                "is_main": True,
            },
        ],
    },
    {
        "email": "marta@arfinder.com",
        "password": "Arfinder2026!",
        "profile": {
            "name": "Marta Jiménez",
            "age": 23,
            "city": "Madrid",
            "bio": "Estudiante de medicina en tercer año. Necesito un entorno tranquilo para estudiar. Soy muy ordenada y respetuosa.",
            "max_budget": 500,
            "has_pets": False,
            "is_smoker": False,
            "schedule": ScheduleEnum.morning,
            "gender": "Mujer",
            "available_from": date(2025, 2, 1),
            "type": TypeEnum.looking_for_flat,
            "room_description": None,
        },
        "photos": [
            {
                "url": "https://picsum.photos/seed/marta1/400/400",
                "order": 0,
                "is_main": True,
            },
            {
                "url": "https://picsum.photos/seed/marta2/400/400",
                "order": 1,
                "is_main": False,
            },
        ],
    },
    {
        "email": "pablo@arfinder.com",
        "password": "Arfinder2026!",
        "profile": {
            "name": "Pablo González",
            "age": 34,
            "city": "Bilbao",
            "bio": "Arquitecto con piso de dos habitaciones en el Casco Viejo. Busco compañero/a para la segunda habitación. Piso reformado y muy luminoso.",
            "max_budget": 800,
            "has_pets": True,
            "is_smoker": False,
            "schedule": ScheduleEnum.flexible,
            "gender": "Hombre",
            "available_from": date(2025, 3, 15),
            "type": TypeEnum.looking_for_roommate,
            "room_description": "Habitación doble de 16m², amueblada con cama de 150, escritorio y dos ventanas con vistas al barrio. Baño completo. Cocina equipada, salón con terraza.",
        },
        "photos": [
            {
                "url": "https://picsum.photos/seed/pablo1/400/400",
                "order": 0,
                "is_main": True,
            },
            {
                "url": "https://picsum.photos/seed/pablo2/400/400",
                "order": 1,
                "is_main": False,
            },
            {
                "url": "https://picsum.photos/seed/pablo3/400/400",
                "order": 2,
                "is_main": False,
            },
        ],
    },
    {
        "email": "sofia@arfinder.com",
        "password": "Arfinder2026!",
        "profile": {
            "name": "Sofía Martín",
            "age": 28,
            "city": "Madrid",
            "bio": "Profesora de inglés. Tranquila, limpia y muy organizada. Me gusta la música y el cine. Busco piso céntrico.",
            "max_budget": 750,
            "has_pets": False,
            "is_smoker": False,
            "schedule": ScheduleEnum.morning,
            "gender": "Mujer",
            "available_from": date(2025, 3, 1),
            "type": TypeEnum.looking_for_flat,
            "room_description": None,
        },
        "photos": [
            {
                "url": "https://picsum.photos/seed/sofia1/400/400",
                "order": 0,
                "is_main": True,
            },
        ],
    },
    {
        "email": "miguel@arfinder.com",
        "profile": {
            "name": "Miguel Sánchez",
            "age": 32,
            "city": "A Coruña",
            "bio": "Tengo piso cerca de la playa con habitación libre. Trabajo en remoto, paso mucho tiempo en casa. Busco persona tranquila.",
            "max_budget": 600,
            "has_pets": False,
            "is_smoker": False,
            "schedule": ScheduleEnum.flexible,
            "gender": "Hombre",
            "available_from": date(2025, 2, 1),
            "type": TypeEnum.looking_for_roommate,
            "room_description": "Habitación de 12m² con vistas al mar, amueblada con cama individual y armario. Baño compartido. Cocina moderna y salón amplio.",
        },
        "photos": [
            {
                "url": "https://picsum.photos/seed/miguel1/400/400",
                "order": 0,
                "is_main": True,
            },
            {
                "url": "https://picsum.photos/seed/miguel2/400/400",
                "order": 1,
                "is_main": False,
            },
        ],
    },
]


SEED_CONVERSATIONS = [
    {
        "user1_email": "adrian@arfinder.com",
        "user2_email": "ana@arfinder.com",
        "messages": [
            {
                "sender_email": "adrian@arfinder.com",
                "content": "¡Hola Ana! Vi tu perfil y me parece que encajamos bien 😊",
            },
            {
                "sender_email": "ana@arfinder.com",
                "content": "¡Hola Adrián! Muchas gracias, tu perfil también me parece muy interesante.",
            },
            {
                "sender_email": "adrian@arfinder.com",
                "content": "¿Tienes disponibilidad para quedar esta semana y ver el piso?",
            },
            {
                "sender_email": "ana@arfinder.com",
                "content": "¡Claro! ¿El jueves por la tarde te viene bien?",
            },
        ],
    },
    {
        "user1_email": "carlos@arfinder.com",
        "user2_email": "pablo@arfinder.com",
        "messages": [
            {
                "sender_email": "carlos@arfinder.com",
                "content": "Hola Pablo, ¿podrías enviarme más fotos de la habitación?",
            },
            {
                "sender_email": "pablo@arfinder.com",
                "content": "¡Claro! Ahora mismo te las mando 📸",
            },
            {
                "sender_email": "pablo@arfinder.com",
                "content": "El precio incluye gastos de comunidad y suministros básicos 👍",
            },
        ],
    },
    {
        "user1_email": "adrian@arfinder.com",
        "user2_email": "miguel@arfinder.com",
        "messages": [
            {
                "sender_email": "miguel@arfinder.com",
                "content": "Hola Adrián, vi que también eres de A Coruña. ¿Sigues buscando piso?",
            },
            {
                "sender_email": "adrian@arfinder.com",
                "content": "¡Hola Miguel! Sí, todavía estoy buscando. ¿Cómo es el piso?",
            },
            {
                "sender_email": "miguel@arfinder.com",
                "content": "Está muy bien situado, cerca de la playa. Te mando fotos si quieres 🏖️",
            },
        ],
    },
]


def seed():

    db = SessionLocal()

    try:
        existing = db.query(User).filter(User.email == SEED_USERS[0]["email"]).first()

        if existing:
            print(
                "Seed ya ejecutado. Para volver a ejecutarlo hacer docker compose down -v primero."
            )

            return

        print("Iniciando seed...")

        created_users = {}

        for i, user_data in enumerate(SEED_USERS):
            user = User(
                email=user_data["email"],
                insforge_id=f"insforge_{i}",  # Ids deterministas para el seed
                password_hash=None,
            )

            db.add(user)

            db.flush()

            profile_data = user_data["profile"]

            profile = Profile(user_id=user.id, **profile_data)

            db.add(profile)

            db.flush()

            for photo_data in user_data["photos"]:
                photo = ProfilePhoto(
                    profile_id=profile.id,
                    photo_url=photo_data["url"],
                    order=photo_data["order"],
                    is_main=photo_data["is_main"],
                )

                db.add(photo)

            created_users[user_data["email"]] = user

            print(f"Usuario creado: {profile_data['name']} ({user_data['email']})")

        db.flush()

        for conv_data in SEED_CONVERSATIONS:
            u1 = created_users[conv_data["user1_email"]]

            u2 = created_users[conv_data["user2_email"]]

            lo, hi = sorted([u1.id, u2.id])

            conversation = Conversation(user1_id=lo, user2_id=hi)

            db.add(conversation)

            db.flush()

            for msg_data in conv_data["messages"]:
                sender = created_users[msg_data["sender_email"]]

                message = Message(
                    conversation_id=conversation.id,
                    sender_id=sender.id,
                    content=msg_data["content"],
                    sent_at=datetime.now(UTC),
                    is_read=True,
                )

                db.add(message)

            print(
                f"Conversación creada entre {conv_data['user1_email']} y {conv_data['user2_email']}"
            )

        db.commit()

        print("Seed completado correctamente.")

        print("\nUsuarios disponibles (todos con password: Arfinder2026!):")

        for u in SEED_USERS:
            print(f"  - {u['email']}")

    except Exception as e:
        db.rollback()

        print(f"Error durante el seed: {e}")

        raise

    finally:
        db.close()


if __name__ == "__main__":
    seed()
