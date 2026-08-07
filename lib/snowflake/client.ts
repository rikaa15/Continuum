import "server-only";

import snowflake from "snowflake-sdk";
import type { DecisionResult } from "@/lib/domain/rules";
import type { TokenUsage } from "@/lib/ai/explain";

export type LedgerInput = {
  runId: string;
  pseudonymousUserId: string;
  result: DecisionResult;
  optimized: TokenUsage;
  baseline: TokenUsage;
  memorySource: "everos" | "demo-fallback";
};

export type EconomicsSummary = {
  runs: number;
  actualTokens: number;
  naiveTokens: number;
  actualCost: number;
  naiveCost: number;
  savingsPercent: number;
  memoryHits: number;
  measurement: "measured" | "projected";
};

let pool: ReturnType<typeof snowflake.createPool> | null = null;

function getPool() {
  if (pool) return pool;
  if (!isSnowflakeConfigured()) throw new Error("Snowflake is not configured");
  pool = snowflake.createPool(
    {
      account: process.env.SNOWFLAKE_ACCOUNT!,
      username: process.env.SNOWFLAKE_USERNAME!,
      password: process.env.SNOWFLAKE_PASSWORD!,
      warehouse: process.env.SNOWFLAKE_WAREHOUSE!,
      database: process.env.SNOWFLAKE_DATABASE!,
      schema: process.env.SNOWFLAKE_SCHEMA ?? "PUBLIC",
      role: process.env.SNOWFLAKE_ROLE,
      application: "CONTINUUM_MVP",
    },
    { max: 2, min: 0 },
  );
  return pool;
}

async function execute<T>(sqlText: string, binds: Array<string | number | boolean>) {
  return getPool().use(
    (connection) =>
      new Promise<T[]>((resolve, reject) => {
        connection.execute({
          sqlText,
          binds,
          complete: (error, _statement, rows) => {
            if (error) reject(error);
            else resolve((rows ?? []) as T[]);
          },
        });
      }),
  );
}

const PRICE_PER_MILLION_INPUT = 0.25;
const PRICE_PER_MILLION_OUTPUT = 2.0;

function cost(usage: TokenUsage) {
  return (
    (usage.inputTokens * PRICE_PER_MILLION_INPUT +
      usage.outputTokens * PRICE_PER_MILLION_OUTPUT) /
    1_000_000
  );
}

export async function writeLedger(input: LedgerInput) {
  if (!isSnowflakeConfigured()) return false;
  await execute(
    `INSERT INTO token_ledger (
      run_id, pseudonymous_user_id, rule_id, rule_version, profile_version,
      model, decision, actual_input_tokens, actual_output_tokens,
      naive_input_tokens, naive_output_tokens, actual_cost, naive_cost,
      memory_hit, measurement_type, created_at
    ) SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP()`,
    [
      input.runId,
      input.pseudonymousUserId,
      input.result.ruleId,
      input.result.ruleVersion,
      input.result.profileVersion,
      input.optimized.model,
      input.result.decision,
      input.optimized.inputTokens,
      input.optimized.outputTokens,
      input.baseline.inputTokens,
      input.baseline.outputTokens,
      cost(input.optimized),
      cost(input.baseline),
      input.memorySource === "everos",
      input.optimized.measured && input.baseline.measured ? "MEASURED" : "PROJECTED",
    ],
  );
  return true;
}

export async function getEconomicsSummary(): Promise<EconomicsSummary | null> {
  if (!isSnowflakeConfigured()) return null;
  const rows = await execute<Record<string, string | number>>(
    `SELECT COUNT(*) AS RUNS,
      COALESCE(SUM(actual_input_tokens + actual_output_tokens), 0) AS ACTUAL_TOKENS,
      COALESCE(SUM(naive_input_tokens + naive_output_tokens), 0) AS NAIVE_TOKENS,
      COALESCE(SUM(actual_cost), 0) AS ACTUAL_COST,
      COALESCE(SUM(naive_cost), 0) AS NAIVE_COST,
      COUNT_IF(memory_hit) AS MEMORY_HITS,
      IFF(COUNT_IF(measurement_type = 'PROJECTED') > 0, 'projected', 'measured') AS MEASUREMENT
    FROM token_ledger`,
    [],
  );
  const row = rows[0];
  if (!row) return null;
  const actual = Number(row.ACTUAL_TOKENS);
  const naive = Number(row.NAIVE_TOKENS);
  return {
    runs: Number(row.RUNS),
    actualTokens: actual,
    naiveTokens: naive,
    actualCost: Number(row.ACTUAL_COST),
    naiveCost: Number(row.NAIVE_COST),
    memoryHits: Number(row.MEMORY_HITS),
    savingsPercent: naive > 0 ? ((naive - actual) / naive) * 100 : 0,
    measurement: String(row.MEASUREMENT) as "measured" | "projected",
  };
}

export function isSnowflakeConfigured() {
  return Boolean(
    process.env.SNOWFLAKE_ACCOUNT &&
      process.env.SNOWFLAKE_USERNAME &&
      process.env.SNOWFLAKE_PASSWORD &&
      process.env.SNOWFLAKE_WAREHOUSE &&
      process.env.SNOWFLAKE_DATABASE,
  );
}
