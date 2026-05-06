function buildLocalAliases(origin) {
  try {
    const url = new URL(origin);

    if (url.hostname === "localhost") {
      url.hostname = "127.0.0.1";
      return [origin, url.toString().replace(/\/$/, "")];
    }

    if (url.hostname === "127.0.0.1") {
      url.hostname = "localhost";
      return [origin, url.toString().replace(/\/$/, "")];
    }
  } catch (_error) {
    return [origin];
  }

  return [origin];
}

export function resolveAllowedOrigins() {
  const configuredOrigins = process.env.CLIENT_ORIGIN
    ?.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (!configuredOrigins?.length) {
    return true;
  }

  return [...new Set(configuredOrigins.flatMap(buildLocalAliases))];
}
