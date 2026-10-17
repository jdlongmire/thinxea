import { Link } from "react-router-dom";
import { marked } from "marked";

export function ElementChip({ id }: { id: string }) {
  return (
    <Link className="chip" to={`/artifact/${encodeURIComponent(id)}`}>
      {id}
    </Link>
  );
}

export function Markdown({ text }: { text: string }) {
  const html = marked.parse(text ?? "") as string;
  return <div className="md" dangerouslySetInnerHTML={{ __html: html }} />;
}

export function GateBadge({ ok, label }: { ok: boolean; label: string }) {
  return <span className={ok ? "badge ok" : "badge bad"}>{label}</span>;
}

export function Loading() {
  return <p className="muted">Loading the record...</p>;
}
