VALID_STATUSES = {
    "open",
    "in_progress",
    "resolved",
    "discarded",
}

VALID_ORIGINS = {
    "customer",
    "branch",
    "internal",
}

VALID_CATEGORIES = {
    "pagos",
    "sistema",
    "pedidos",
    "atencion_cliente",
    "infraestructura",
}

VALID_BRANCHES = {
    "central",
    "sucursal_norte",
    "sucursal_centro",
    "sucursal_sur",
}

ALLOWED_TRANSITIONS = {
    "open": {
        "in_progress",
        "discarded",
    },
    "in_progress": {
        "resolved",
        "discarded",
    },
    "resolved": set(),
    "discarded": set(),
}


def require_text(field_name: str, value: str) -> str:
    clean_value = value.strip()

    if not clean_value:
        raise ValueError(f"{field_name} es obligatorio")

    return clean_value


def validate_choice(field_name: str, value: str, valid_values: set[str]) -> str:
    if value not in valid_values:
        raise ValueError(f"Valor invalido para {field_name}: {value}")

    return value


def validate_incident_data(
    *,
    title: str,
    description: str,
    category: str,
    status: str,
    origin: str,
    branch: str,
) -> dict:
    return {
        "title": require_text("title", title),
        "description": require_text("description", description),
        "category": validate_choice("category", category, VALID_CATEGORIES),
        "status": validate_choice("status", status, VALID_STATUSES),
        "origin": validate_choice("origin", origin, VALID_ORIGINS),
        "branch": validate_choice("branch", branch, VALID_BRANCHES),
    }


def validate_status_transition(current_status: str, new_status: str) -> None:
    validate_choice("status", new_status, VALID_STATUSES)

    allowed = ALLOWED_TRANSITIONS.get(current_status, set())

    if new_status not in allowed:
        raise ValueError(f"No se puede pasar de {current_status} a {new_status}")