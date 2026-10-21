import type { ReactNode } from "react";

type AuthCardProps = {
  title: string;
  description?: string;
  children: ReactNode;
};

export default function AuthCard({ title, description, children }: AuthCardProps) {
  return (
    <main className="container">
      <section className="card authCard">
        <h1>{title}</h1>
        {description ? <p>{description}</p> : null}
        {children}
      </section>
    </main>
  );
}