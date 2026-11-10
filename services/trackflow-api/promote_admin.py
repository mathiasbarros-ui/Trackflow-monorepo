import sys

from app.auth.services import get_user_by_email, update_user


def main() -> int:
    if len(sys.argv) != 2:
        print("Uso: python promote_admin.py <email>")
        return 2

    user = get_user_by_email(sys.argv[1])
    if not user:
        print("No existe una cuenta con ese email")
        return 1

    if user.get("role") == "superadmin":
        print("La cuenta ya es superadmin; no se modificaron sus permisos")
        return 1

    update_user(user["id"], {"role": "admin"})
    print(f"Permisos de administrador asignados a {user['email']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())