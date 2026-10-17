export interface SessionUser {
  username: string;
  expires_at: string | null;
}

export async function fetchMe(): Promise<SessionUser | null> {
  try {
    const r = await fetch("/api/auth/me", { credentials: "include" });
    if (!r.ok) return null;
    return (await r.json()) as SessionUser;
  } catch {
    return null;
  }
}

export async function login(username: string, password: string): Promise<SessionUser> {
  const r = await fetch("/api/auth/login", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!r.ok) {
    const detail = await r.json().catch(() => ({}));
    throw new Error((detail as { detail?: string }).detail ?? `login failed (${r.status})`);
  }
  return (await r.json()) as SessionUser;
}

export async function logout(): Promise<void> {
  await fetch("/api/auth/logout", { method: "POST", credentials: "include" }).catch(() => {});
}
