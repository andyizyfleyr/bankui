export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    process.on("unhandledRejection", (reason) => {
      console.error("[unhandledRejection]", reason);
    });
    process.on("uncaughtException", (err) => {
      console.error("[uncaughtException]", err);
    });
  }
}

export async function onRequestError(
  err: unknown,
  request: { method?: string; path?: string; url?: string },
  context: { routeType?: string }
): Promise<void> {
  console.error(
    "[onRequestError]",
    context?.routeType ?? "unknown",
    request.method ?? "",
    request.path ?? request.url ?? "",
    err
  );
}
