export default async function Home() {
  const backofficeUrl = process.env.NEXT_PUBLIC_BACKOFFICE_URL ?? "http://localhost:3001";
  const apiUrl = process.env.BACKEND_API_URL ?? "http://127.0.0.1:8000";
  const apiAvailable = await fetch(`${apiUrl}/`, {
    cache: "no-store",
    signal: AbortSignal.timeout(3000),
  }).then((response) => response.ok).catch(() => false);

  return (
    <>
      <header className="navbar">
        <div className="container">TRACKFLOW</div>
      </header>
      <main className="container">
        <h1>TrackFlow</h1>
        <nav aria-label="Acceso">
          <a className="button" href={`${backofficeUrl}/login`}>Iniciar sesion</a>
          <a className="secondary" href={`${backofficeUrl}/register`}>Crear cuenta</a>
        </nav>
        <p className={apiAvailable ? "available" : "unavailable"}>
          {apiAvailable ? "API disponible" : "API no disponible"}
        </p>
      </main>
    </>
  );
}
