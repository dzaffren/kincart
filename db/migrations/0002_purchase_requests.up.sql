CREATE TABLE IF NOT EXISTS paypal_vault (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  payment_token text NOT NULL,
  linked_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS purchase_requests (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  item_id text NOT NULL,
  item_name text NOT NULL,
  amount_cents integer NOT NULL CHECK (amount_cents > 0),
  status text NOT NULL DEFAULT 'waiting'
    CHECK (status IN ('waiting', 'paying', 'paid', 'declined', 'failed')),
  asked_at timestamptz NOT NULL DEFAULT now(),
  answered_at timestamptz,
  paypal_order_id text,
  paypal_capture_id text,
  failure_reason text
);
