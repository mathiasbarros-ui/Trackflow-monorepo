import type {
  SKU,
  StockEntryCreate,
  StockEntryResponse,
  StockExitCreate,
  StockExitResponse,
  StockMovement,
} from "@/types/inventory";

export type AuthenticatedFetch = (
  input: string,
  init?: RequestInit,
) => Promise<Response>;

type FastApiError = {
  detail?: string | Array<{ msg?: string }>;
  message?: string;
};

export class InventoryApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "InventoryApiError";
  }
}

function messageFromBody(body: FastApiError | null, fallback: string): string {
  if (typeof body?.detail === "string") return body.detail;

  if (Array.isArray(body?.detail)) {
    const messages = body.detail
      .map((item) => item.msg)
      .filter((message): message is string => Boolean(message));

    if (messages.length > 0) return messages.join("; ");
  }

  return body?.message ?? fallback;
}

async function inventoryRequest<T>(
  authFetch: AuthenticatedFetch,
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await authFetch(`/backend/inventory${path}`, {
    ...init,
    headers,
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as FastApiError | null;
    throw new InventoryApiError(
      messageFromBody(body, `Error ${response.status}: ${response.statusText}`),
      response.status,
    );
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export function listProducts(authFetch: AuthenticatedFetch) {
  return inventoryRequest<SKU[]>(authFetch, "/products");
}

export function getProduct(authFetch: AuthenticatedFetch, id: number) {
  return inventoryRequest<SKU>(authFetch, `/products/${id}`);
}

export function createInboundOrder(
  authFetch: AuthenticatedFetch,
  body: StockEntryCreate,
) {
  return inventoryRequest<StockEntryResponse>(authFetch, "/orders/inbound", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function createOutboundOrder(
  authFetch: AuthenticatedFetch,
  body: StockExitCreate,
) {
  return inventoryRequest<StockExitResponse>(authFetch, "/orders/outbound", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function listOrders(authFetch: AuthenticatedFetch) {
  return inventoryRequest<StockMovement[]>(authFetch, "/orders");
}