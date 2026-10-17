export interface AskResult {
  answer: string;
  citations: string[];
  provider: string;
}

export interface ImpactResult {
  element: string;
  affected: string[];
  narrative: string;
  provider: string;
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const r = await fetch(path, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (r.status === 401) throw new Error("Sign in with an issued demo account to use AI features.");
  if (r.status === 429) throw new Error("Daily AI quota reached for this account. The record stays available; AI resumes tomorrow.");
  if (!r.ok) {
    const detail = await r.json().catch(() => ({}));
    throw new Error((detail as { detail?: string }).detail ?? `request failed (${r.status})`);
  }
  return (await r.json()) as T;
}

export function ask(question: string): Promise<AskResult> {
  return postJson<AskResult>("/api/ask", { question });
}

export function impact(elementId: string): Promise<ImpactResult> {
  return postJson<ImpactResult>("/api/impact", { element_id: elementId });
}
