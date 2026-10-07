import os
from pathlib import Path
import secrets


def main():
    if not os.environ.get("JWT_SECRET"):
        secret_path = Path("database/.jwt-secret")
        secret_path.parent.mkdir(parents=True, exist_ok=True)
        try:
            descriptor = os.open(secret_path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        except FileExistsError:
            pass
        else:
            with os.fdopen(descriptor, "w") as secret_file:
                secret_file.write(secrets.token_urlsafe(48))
        os.environ["JWT_SECRET"] = secret_path.read_text().strip()
        if not os.environ["JWT_SECRET"]:
            raise RuntimeError("La clave JWT persistida esta vacia")

    os.execvp("uvicorn", [
        "uvicorn", "main:app",
        "--host", os.environ["API_HOST"],
        "--port", os.environ["API_PORT"],
        "--reload",
        "--reload-dir", "/workspace/services/trackflow-api",
        "--reload-dir", "/workspace/packages",
    ])


if __name__ == "__main__":
    main()