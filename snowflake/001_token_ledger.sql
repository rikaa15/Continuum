CREATE TABLE IF NOT EXISTS token_ledger (
  run_id VARCHAR NOT NULL,
  pseudonymous_user_id VARCHAR NOT NULL,
  rule_id VARCHAR NOT NULL,
  rule_version VARCHAR NOT NULL,
  profile_version INTEGER NOT NULL,
  model VARCHAR NOT NULL,
  decision VARCHAR NOT NULL,
  actual_input_tokens INTEGER NOT NULL,
  actual_output_tokens INTEGER NOT NULL,
  naive_input_tokens INTEGER NOT NULL,
  naive_output_tokens INTEGER NOT NULL,
  actual_cost NUMBER(18, 8) NOT NULL,
  naive_cost NUMBER(18, 8) NOT NULL,
  memory_hit BOOLEAN NOT NULL,
  measurement_type VARCHAR NOT NULL,
  created_at TIMESTAMP_TZ NOT NULL
);
