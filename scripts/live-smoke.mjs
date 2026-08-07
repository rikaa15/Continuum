import snowflake from "snowflake-sdk";

const required = [
  "EVEROS_BASE_URL",
  "SNOWFLAKE_ACCOUNT",
  "SNOWFLAKE_USERNAME",
  "SNOWFLAKE_PASSWORD",
  "SNOWFLAKE_WAREHOUSE",
  "SNOWFLAKE_DATABASE",
];

const missing = required.filter((name) => !process.env[name]);
if (missing.length) {
  console.error(`Missing configuration: ${missing.join(", ")}`);
  process.exit(1);
}

const everos = await fetch(`${process.env.EVEROS_BASE_URL.replace(/\/$/, "")}/health`, {
  headers: process.env.EVEROS_API_KEY
    ? { Authorization: `Bearer ${process.env.EVEROS_API_KEY}` }
    : {},
});
if (!everos.ok) throw new Error(`EverOS health check failed: ${everos.status}`);
console.log("EverOS health check passed");

const connection = snowflake.createConnection({
  account: process.env.SNOWFLAKE_ACCOUNT,
  username: process.env.SNOWFLAKE_USERNAME,
  password: process.env.SNOWFLAKE_PASSWORD,
  warehouse: process.env.SNOWFLAKE_WAREHOUSE,
  database: process.env.SNOWFLAKE_DATABASE,
  schema: process.env.SNOWFLAKE_SCHEMA ?? "PUBLIC",
  role: process.env.SNOWFLAKE_ROLE,
  application: "CONTINUUM_SMOKE_TEST",
});

await new Promise((resolve, reject) =>
  connection.connect((error) => (error ? reject(error) : resolve())),
);
const rows = await new Promise((resolve, reject) =>
  connection.execute({
    sqlText: "SELECT COUNT(*) AS RUNS FROM token_ledger",
    complete: (error, _statement, result) =>
      error ? reject(error) : resolve(result),
  }),
);
console.log(`Snowflake token ledger check passed (${rows[0].RUNS} rows)`);
connection.destroy(() => {});
