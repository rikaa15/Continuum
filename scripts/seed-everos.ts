import { personaA, personaB } from "@/lib/demo/personas";

const baseUrl = (process.env.EVEROS_BASE_URL ?? "https://api.evermind.ai").replace(
  /\/$/,
  "",
);
const apiKey = process.env.EVEROS_API_KEY;
if (!apiKey) throw new Error("EVEROS_API_KEY is missing");

async function request(path: string, body: object) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      app_id: process.env.EVEROS_APP_ID ?? "continuum",
      project_id: process.env.EVEROS_PROJECT_ID ?? "hackathon",
      ...body,
    }),
  });
  if (!response.ok) {
    throw new Error(`${path} failed (${response.status}): ${await response.text()}`);
  }
}

for (const profile of [personaA, personaB]) {
  const sessionId = `continuum-profile-${profile.userId}`;
  await request("/api/v2/memory/add", {
    session_id: sessionId,
    async_mode: false,
    messages: [
      {
        sender_id: profile.userId,
        role: "user",
        timestamp: Date.now(),
        content: `CONTINUUM_PROFILE_V1:${JSON.stringify(profile)}`,
      },
    ],
  });
  console.log(`Seeded synthetic profile: ${profile.displayName}`);
}
