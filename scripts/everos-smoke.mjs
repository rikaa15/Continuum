import { randomUUID } from "node:crypto";

const baseUrl = (process.env.EVEROS_BASE_URL ?? "https://api.evermind.ai").replace(
  /\/$/,
  "",
);
const apiKey = process.env.EVEROS_API_KEY;
if (!apiKey) {
  console.error("EVEROS_API_KEY is missing from .env.local");
  process.exit(1);
}

const sessionId = `continuum-smoke-${randomUUID()}`;
const userId = `continuum-smoke-${randomUUID()}`;
const marker = `Continuum memory check ${randomUUID()}`;
const headers = {
  Authorization: `Bearer ${apiKey}`,
  "Content-Type": "application/json",
};

async function request(path, body) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      app_id: process.env.EVEROS_APP_ID ?? "continuum",
      project_id: process.env.EVEROS_PROJECT_ID ?? "hackathon",
      ...body,
    }),
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(`${path} failed (${response.status}): ${JSON.stringify(payload)}`);
  }
  return payload;
}

try {
  await request("/api/v2/memory/add", {
    session_id: sessionId,
    async_mode: false,
    messages: [
      {
        sender_id: userId,
        role: "user",
        timestamp: Date.now(),
        content: marker,
      },
    ],
  });
  await request("/api/v2/memory/flush", { session_id: sessionId });
  const result = await request("/api/v2/memory/search", {
    user_id: userId,
    query: marker,
    method: "hybrid",
    top_k: 5,
    filters: { session_id: sessionId },
  });
  if (!result?.data) throw new Error("Search response did not contain a data envelope");
  console.log("EverOS add, flush, and search passed");
} finally {
  await request("/api/v2/memory/delete", { user_id: userId, session_id: sessionId }).catch(
    () => {},
  );
}
