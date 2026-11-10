"use client";

import { usePreferences } from "@/hooks/usePreferences";

import { FormEvent, useState } from "react";

import { useAuth } from "@/hooks/useAuth";


type QueryResponse = {
  answer?: string;
  detail?: string;
};


export default function KnowledgePage() {
  const { t } = usePreferences();
  const { authFetch } = useAuth();
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submitQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setAnswer("");

    try {
      const response = await authFetch("/backend/api/knowledge/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: question.trim() }),
      });
      const data = (await response.json().catch(() => null)) as QueryResponse | null;

      if (!response.ok) {
        throw new Error(data?.detail ?? "No se pudo consultar la base de conocimiento.");
      }

      setAnswer(data?.answer ?? "");
    } catch (queryError) {
      setError(
        queryError instanceof Error
          ? queryError.message
          : "Ocurrió un error inesperado al consultar.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="container knowledgePage">
      <header className="pageHeader">
        <h1>{t("Base de conocimiento")}</h1>
        <p>{t("Consulta políticas, procedimientos y documentos internos.")}</p>
      </header>

      <form className="knowledgeForm" onSubmit={submitQuestion}>
        <label htmlFor="knowledge-question">{t("¿Qué necesitas saber?")}</label>
        <textarea
          id="knowledge-question"
          name="question"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder={t("Escribe tu pregunta")}
          maxLength={4000}
          rows={4}
          required
        />
        <div className="knowledgeFormFooter">
          <span>{question.length}/4000</span>
          <button type="submit" disabled={loading || !question.trim()}>
            {loading ? t("Buscando…") : t("Consultar")}
          </button>
        </div>
      </form>

      {loading && (
        <p className="knowledgeStatus" role="status">{t(" Buscando información en los documentos… ")}</p>
      )}
      {error && <p className="knowledgeError" role="alert">{t(error)}</p>}
      {answer && (
        <section className="knowledgeAnswer" aria-live="polite">
          <h2>{t("Respuesta")}</h2>
          <p>{answer}</p>
        </section>
      )}
    </main>
  );
}