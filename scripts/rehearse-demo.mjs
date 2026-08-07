const baseUrl = process.env.CONTINUUM_URL ?? "http://localhost:3000";
const routeSequence = [
  "/runway",
  "/alerts/stem-opt-employer-check-2026",
  "/profile",
  "/economics",
];

for (let rehearsal = 1; rehearsal <= 3; rehearsal += 1) {
  const startedAt = performance.now();
  for (const path of routeSequence) {
    const response = await fetch(`${baseUrl}${path}`, { redirect: "manual" });
    if (!response.ok) {
      throw new Error(`Rehearsal ${rehearsal}: ${path} returned ${response.status}`);
    }
    const body = await response.text();
    if (!body.includes("Continuum")) {
      throw new Error(`Rehearsal ${rehearsal}: ${path} did not render Continuum`);
    }
  }
  const elapsedSeconds = (performance.now() - startedAt) / 1000;
  if (elapsedSeconds > 180) {
    throw new Error(`Rehearsal ${rehearsal} exceeded three minutes`);
  }
  console.log(`Rehearsal ${rehearsal} passed in ${elapsedSeconds.toFixed(2)}s`);
}
