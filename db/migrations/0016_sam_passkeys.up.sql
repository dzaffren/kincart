CREATE TABLE IF NOT EXISTS sam_passkeys (
  id bigint PRIMARY KEY REFERENCES households (id) ON DELETE CASCADE,
  credential_id text NOT NULL,
  public_key bytea NOT NULL,
  made_at timestamptz NOT NULL DEFAULT now()
);
