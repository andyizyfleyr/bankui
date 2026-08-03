/** Envoie une requête d'auth avec 1 seule nouvelle tentative en cas d'erreur 5xx transitoire. */
export async function authRequest(
  url: string,
  payload: Record<string, string>
): Promise<{ ok: true } | { ok: false; error: string }> {
  let attempts = 0;
  while (attempts < 2) {
    attempts++;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const text = await res.text();
      let data: { error?: unknown } = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {}
      if (res.ok) return { ok: true };
      const message =
        typeof data.error === "string" && data.error
          ? data.error
          : `Erreur inattendue (code ${res.status}) — ${text.slice(0, 3000) || "réponse vide"}`;
      if (res.status >= 500 && attempts < 2) {
        await new Promise((r) => setTimeout(r, 700));
        continue;
      }
      return { ok: false, error: message };
    } catch {
      if (attempts < 2) continue;
      return { ok: false, error: "Connexion impossible, réessayez" };
    }
  }
  return { ok: false, error: "Erreur inattendue" };
}
