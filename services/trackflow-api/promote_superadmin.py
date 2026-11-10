import argparse

from app.auth.services import get_user_by_email, update_user


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Asigna superadmin a una cuenta activa existente."
    )
    parser.add_argument("email")
    args = parser.parse_args()
    user = get_user_by_email(args.email)
    if not user:
        print("No existe una cuenta con ese email.")
        return 1
    if not user["is_active"]:
        print("La cuenta está inactiva. Actívala antes de asignar superadmin.")
        return 1
    update_user(user["id"], {"role": "superadmin"})
    print("Permisos de superadmin asignados. Vuelve a iniciar sesión.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
