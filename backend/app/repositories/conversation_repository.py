from sqlalchemy.orm import Session
from app.models import Conversation


def get_conversation_by_id(db: Session, conversation_id: int) -> Conversation | None:
    return db.get(Conversation, conversation_id)


def get_conversation_between_users(
    db: Session, user1_id: int, user2_id: int
) -> Conversation | None:
    # En el modelo tengo que user1_id < user2_id con CheckConstraint, pero asi aseguramos que no importa
    #  el orden en que se pasen los ids de usuario a esta función
    min_id, max_id = sorted([user1_id, user2_id])
    return (
        db.query(Conversation)
        .filter(Conversation.user1_id == min_id, Conversation.user2_id == max_id)
        .first()
    )


def get_conversations_by_user(db: Session, user_id: int) -> list[Conversation]:
    return (
        db.query(Conversation)
        .filter((Conversation.user1_id == user_id) | (Conversation.user2_id == user_id))
        .order_by(Conversation.id.desc())
        .all()
    )


def create_conversation(db: Session, user1_id: int, user2_id: int) -> Conversation:
    conversation = Conversation(user1_id=user1_id, user2_id=user2_id)
    db.add(conversation)
    db.commit()
    db.refresh(conversation)
    return conversation
