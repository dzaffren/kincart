DELETE FROM purchase_requests WHERE household_id <> 1;
DELETE FROM push_subscriptions WHERE household_id <> 1;
DELETE FROM paypal_vault WHERE id <> 1;
DELETE FROM rose_search WHERE id <> 1;
DELETE FROM price_limit WHERE id <> 1;
DELETE FROM total_limit WHERE id <> 1;

ALTER TABLE push_subscriptions DROP COLUMN IF EXISTS household_id;
DROP INDEX IF EXISTS purchase_requests_one_open_per_household;
ALTER TABLE purchase_requests DROP COLUMN IF EXISTS household_id;
CREATE UNIQUE INDEX IF NOT EXISTS purchase_requests_one_open
  ON purchase_requests ((true)) WHERE status IN ('waiting', 'paying');

ALTER TABLE paypal_vault DROP CONSTRAINT IF EXISTS paypal_vault_household_fkey, ALTER COLUMN id TYPE smallint,
  ADD CONSTRAINT paypal_vault_id_check CHECK (id = 1);
ALTER TABLE rose_search DROP CONSTRAINT IF EXISTS rose_search_household_fkey, ALTER COLUMN id TYPE smallint,
  ADD CONSTRAINT rose_search_id_check CHECK (id = 1);
ALTER TABLE price_limit DROP CONSTRAINT IF EXISTS price_limit_household_fkey, ALTER COLUMN id TYPE smallint,
  ADD CONSTRAINT price_limit_id_check CHECK (id = 1);
ALTER TABLE total_limit DROP CONSTRAINT IF EXISTS total_limit_household_fkey, ALTER COLUMN id TYPE smallint,
  ADD CONSTRAINT total_limit_id_check CHECK (id = 1);

DROP TABLE IF EXISTS households;
