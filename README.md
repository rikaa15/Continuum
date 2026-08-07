# Continuum

Continuum is an immigration-planning web experience for international students
and early-career workers. It keeps a persistent profile, shows a personal
runway, evaluates a versioned rule deterministically, and uses an LLM only to
explain the result.

> Educational planning only. Continuum does not provide legal advice, determine
> eligibility, represent users, or submit filings.

## Architecture

- **Next.js 16 / TypeScript** — product UI, server actions, and orchestration.
- **EverOS v2** — optional structured-profile mirror and explicit reconciliation.
- **TypeScript rule engine** — three-state legal relevance decisions.
- **OpenAI** — constrained plain-language rewriting after a decision.
- **Snowflake** — measured token ledger and economics aggregation.

EverOS is never treated as proof that an absent fact is false. A canonical,
versioned profile payload is validated with Zod before mirroring or explicit
restore. The rule engine declares every required field; missing or invalid
required facts become `needs_review`.

## Local setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

### Demo data model

User profiles are stored in the browser with `localStorage`. No login or
database is required for the hackathon demo. Judges can open the deployed site,
create or switch profiles, and their facts stay on their device. Intake records
physical location, current U.S. basis, underlying classification, and pending
applications separately so overlapping cases are not forced into one answer.

EverOS is an optional server-side mirror used for the memory pitch. OpenAI
powers explanations. Snowflake remains optional and currently projected.

### EverOS

Continuum uses the hosted unified v2 flow:

1. `POST /api/v2/memory/add`
2. `POST /api/v2/memory/search`

The browser profile is the demo source of truth. A validated, versioned snapshot
is optionally mirrored to EverOS so the memory integration remains visible
without making semantic retrieval authoritative for legal decisions. The
Profile page can explicitly compare the local profile with the latest EverOS
snapshot and asks before restoring a newer remote version. There is no silent
overwrite and no cross-device account recovery without authentication.

### Snowflake

Run [`snowflake/001_token_ledger.sql`](snowflake/001_token_ledger.sql) with a
least-privilege role, then configure the `SNOWFLAKE_*` environment variables.
The app stores pseudonymous identifiers and usage metadata only—never raw
profile facts.

### OpenAI and economics

For each judged evaluation, Continuum sends the same explanation task twice:

- **Optimized:** deterministic result plus the selected facts.
- **Naive baseline:** result, complete fixture metadata, and full canonical
  profile.

Both use the same model and settings. Provider-reported usage is marked
`MEASURED`; local character-based estimates are marked `PROJECTED`. Cost
assumptions in [`lib/snowflake/client.ts`](lib/snowflake/client.ts) are dated to
the demo configuration and must be updated if the model changes.

## Safety model

Decision precedence:

1. A known, conclusive exclusion can produce `not_affected`.
2. Otherwise, an unclear rule stage produces `needs_review`.
3. Otherwise, any unknown required fact produces `needs_review`.
4. A known failed applicability predicate produces `not_affected`.
5. All required applicability predicates true produces `affected`.

The explanation prompt receives an allowlisted decision payload. Generated
copy is rejected if it introduces a form number or ISO date absent from that
payload. Deterministic template text remains available if the model fails.

The current fixture is a **non-counsel-reviewed demonstration check** based on
the DHS Study in the States STEM OPT overview. It must not be described as a
complete eligibility determination or as a newly enacted policy.

## Verification

```bash
npm run lint
npm test
npm run build
npm run smoke:everos
npm run smoke:live
```

`smoke:everos` verifies a Cloud add/flush/search round trip and removes its test
memory. `smoke:live` additionally requires Snowflake credentials and confirms a
real ledger query.

## Three-minute demo

1. Open Maya’s runway and identify the EverOS memory badge.
2. Open the STEM OPT employer check and show the matched profile facts.
3. Mark E-Verify unknown and show the safe `needs_review` result.
4. Switch to Daniel’s H-1B profile and show the conclusive `not_affected`
   result.
5. Open Judge View and show the Snowflake-backed sample size, measured tokens,
   and savings.

Before submission, complete the full sequence three times from a clean browser
session. Do not call the build submission-ready unless EverOS is live,
Snowflake contains measured rows, and the economics page shows `MEASURED`.
