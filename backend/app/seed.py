"""One-shot seed script. Run with: docker exec zonca-api python -m app.seed"""
from app.database import SessionLocal
from app.models.user import User
from app.models.member import Member
from app.models.boat import Boat
from app.services.auth import hash_password


def main():
    db = SessionLocal()
    try:
        # Admin
        if not db.query(User).filter(User.email == "admin@scuolazonca.it").first():
            admin = User(
                email="admin@scuolazonca.it",
                password_hash=hash_password("admin123"),
                role="admin",
            )
            db.add(admin)
            print("Admin creato: admin@scuolazonca.it / admin123")

        # Pope member + user
        pope_member = db.query(Member).filter(Member.name == "Marco Venier").first()
        if not pope_member:
            pope_member = Member(
                name="Marco Venier",
                ruolo="pope",
                tessera="RC001",
                email="pope@example.it",
            )
            db.add(pope_member)
            db.flush()

        if not db.query(User).filter(User.email == "pope@example.it").first():
            db.add(
                User(
                    email="pope@example.it",
                    password_hash=hash_password("pope123"),
                    role="pope",
                    member_id=pope_member.id,
                )
            )
            print("Pope creato: pope@example.it / pope123")

        # Soci
        for name, ruolo, tessera in [
            ("Chiara Morosini", "provin", "RC002"),
            ("Luca Grimani", "paron", "RC003"),
            ("Sara Contarini", "ospite", None),
            ("Paolo Dandolo", "provin", "RC004"),
            ("Elena Foscarini", "pope", "RC005"),
        ]:
            if not db.query(Member).filter(Member.name == name).first():
                db.add(Member(name=name, ruolo=ruolo, tessera=tessera))

        # Barche
        boats_data = [
            ("Bissa Rossa", "mascareta", 1, "#c0392b"),
            ("Bissa Blu", "mascareta", 1, "#2d7d9a"),
            ("La Serena", "sandolo-w", 2, "#c8963e"),
            ("Laguna Viva", "sandolo-4", 4, "#27ae60"),
            ("Ca' d'Oro", "gondolino-4", 4, "#d35400"),
            ("Adriatica", "caorlina-6", 6, "#8e44ad"),
        ]
        for name, tipo, seats, color in boats_data:
            if not db.query(Boat).filter(Boat.name == name).first():
                db.add(
                    Boat(
                        name=name,
                        tipo=tipo,
                        seats=seats,
                        color=color,
                        status="attiva",
                    )
                )

        db.commit()
        print(f"Totale soci: {db.query(Member).count()}")
        print(f"Totale barche: {db.query(Boat).count()}")
        print(f"Totale utenti: {db.query(User).count()}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
