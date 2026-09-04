const siteUrl = process.env.SITE_URL;

export async function handler() {
  const startedAt = Date.now();

  try {
    const response = await fetch(siteUrl, {
      method: "GET",
      redirect: "follow",
      signal: AbortSignal.timeout(8_000),
      headers: {
        "user-agent": "poker-site-health/1.0",
      },
    });

    if (!response.ok) {
      throw new Error(`Unexpected HTTP status ${response.status}`);
    }

    console.log("Site health check passed", {
      siteUrl,
      status: response.status,
      durationMs: Date.now() - startedAt,
    });
  } catch (error) {
    console.error("Site health check failed", {
      siteUrl,
      error: error instanceof Error ? error.message : String(error),
      durationMs: Date.now() - startedAt,
    });
    throw error;
  }
}
