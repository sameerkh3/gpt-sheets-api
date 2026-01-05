export function requireApiKey(req) {
    const key = req.headers["x-api-key"];
    if (!key || key !== process.env.API_KEY) {
      return { ok: false, status: 401, body: { error: "Unauthorized" } };
    }
    return { ok: true };
  }
  