const COOKIE_NAME = "trackflow_handoff";

function json(data: unknown, status = 200, cookie?: string) {
  const headers = new Headers({
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
  });
  if (cookie) headers.set("Set-Cookie", cookie);
  return new Response(JSON.stringify(data), { status, headers });
}

export async function receiveSession(request: Request, adminOnly: boolean) {
  const origin = request.headers.get("origin");
  const allowedOrigins = [
    process.env.NEXT_PUBLIC_WEBSITE_URL ?? "http://localhost:3000",
    process.env.NEXT_PUBLIC_BACKOFFICE_URL ?? "http://localhost:3001",
  ].map((url) => new URL(url).origin);
  if (!origin || !allowedOrigins.includes(origin)) {
    return json({ detail: "Origen de sesion no permitido." }, 403);
  }

  const form = await request.formData();
  const token = form.get("token");
  if (typeof token !== "string" || !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token)) {
    return json({ detail: "Sesion invalida." }, 400);
  }

  let upstream: Response;
  try {
    upstream = await fetch(`${process.env.BACKEND_API_URL ?? "http://127.0.0.1:8000"}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
  } catch (error) {
    console.error("No se pudo validar la transferencia de sesion:", error);
    return json({ detail: "No se pudo conectar con el servidor." }, 502);
  }
  if (!upstream.ok) return json({ detail: "No se pudo validar la sesion." }, upstream.status);
  const user: { role: string } = await upstream.json();
  if (adminOnly && !["admin", "superadmin"].includes(user.role)) {
    return json({ detail: "Solo los administradores pueden acceder al backoffice." }, 403);
  }

  const destination = adminOnly
    ? process.env.NEXT_PUBLIC_BACKOFFICE_URL ?? "http://localhost:3001"
    : process.env.NEXT_PUBLIC_WEBSITE_URL ?? "http://localhost:3000";
  const secure = new URL(destination).protocol === "https:" ? "; Secure" : "";
  return new Response(null, {
    status: 303,
    headers: {
      Location: new URL(adminOnly ? (user.role === "superadmin" ? "/admin" : "/suppliers") : "/", destination).href,
      "Cache-Control": "no-store",
      "Set-Cookie": `${COOKIE_NAME}=${token}; HttpOnly; SameSite=Lax; Path=/session; Max-Age=60${secure}`,
    },
  });
}

export function consumeSession(request: Request) {
  const cookie = request.headers.get("cookie")?.split(";").map((part) => part.trim())
    .find((part) => part.startsWith(`${COOKIE_NAME}=`));
  const token = cookie?.slice(COOKIE_NAME.length + 1) ?? null;
  return json({ token }, 200, `${COOKIE_NAME}=; HttpOnly; SameSite=Lax; Path=/session; Max-Age=0`);
}

export function transferSession(destination: string, token: string) {
  // Transfer in a POST body, never in the URL or browser history.
  const form = document.createElement("form");
  form.method = "POST";
  form.action = new URL("/session", destination).href;
  const input = document.createElement("input");
  input.type = "hidden";
  input.name = "token";
  input.value = token;
  form.append(input);
  document.body.append(form);
  form.submit();
}
