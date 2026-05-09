CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;

CREATE TYPE user_role AS ENUM ('admin', 'dispatcher', 'driver');
CREATE TYPE order_status AS ENUM (
  'CREATED',
  'GEOCODED',
  'ASSIGNED',
  'PICKED_UP',
  'IN_TRANSIT',
  'DELIVERED',
  'FAILED',
  'CANCELED'
);
CREATE TYPE notification_state AS ENUM ('queued', 'sent', 'failed');

CREATE TABLE companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  document text NOT NULL,
  timezone text NOT NULL DEFAULT 'America/Sao_Paulo',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id),
  name text NOT NULL,
  email citext NOT NULL,
  password_hash text NOT NULL,
  role user_role NOT NULL,
  driver_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE (company_id, email)
);

CREATE TABLE vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id),
  plate text NOT NULL,
  model text NOT NULL,
  capacity_kg numeric(10, 2),
  driver_id uuid,
  odometer_km numeric(12, 2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE (company_id, plate)
);

CREATE TABLE drivers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id),
  user_id uuid REFERENCES users(id),
  vehicle_id uuid REFERENCES vehicles(id),
  name text NOT NULL,
  phone text,
  region text,
  status text NOT NULL DEFAULT 'offline',
  current_position geography(Point, 4326),
  current_heading numeric(5, 2),
  current_speed numeric(7, 2),
  last_seen_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

ALTER TABLE users
  ADD CONSTRAINT fk_users_driver
  FOREIGN KEY (driver_id) REFERENCES drivers(id);

ALTER TABLE vehicles
  ADD CONSTRAINT fk_vehicles_driver
  FOREIGN KEY (driver_id) REFERENCES drivers(id);

CREATE TABLE orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id),
  code text NOT NULL,
  customer_name text NOT NULL,
  customer_email text,
  customer_phone text,
  recipient_name text NOT NULL,
  recipient_document text,
  recipient_phone text,
  pickup_address text NOT NULL,
  pickup_location geography(Point, 4326),
  delivery_address text NOT NULL,
  delivery_location geography(Point, 4326),
  region text,
  driver_id uuid REFERENCES drivers(id),
  status order_status NOT NULL DEFAULT 'CREATED',
  priority text NOT NULL DEFAULT 'Normal',
  scheduled_for timestamptz NOT NULL,
  due_at timestamptz NOT NULL,
  delivered_at timestamptz,
  distance_km numeric(10, 2),
  cost_estimate numeric(12, 2),
  proof_photo_url text,
  proof_signature_url text,
  proof_receiver_name text,
  proof_document text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE (company_id, code)
);

CREATE TABLE status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id),
  order_id uuid NOT NULL REFERENCES orders(id),
  from_status order_status,
  to_status order_status NOT NULL,
  actor_user_id uuid REFERENCES users(id),
  actor_name text NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE gps_positions (
  id bigserial PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES companies(id),
  driver_id uuid NOT NULL REFERENCES drivers(id),
  position geography(Point, 4326) NOT NULL,
  heading numeric(5, 2),
  speed numeric(7, 2),
  recorded_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE occurrences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id),
  order_id uuid NOT NULL REFERENCES orders(id),
  driver_id uuid REFERENCES drivers(id),
  type text NOT NULL,
  note text,
  position geography(Point, 4326),
  photo_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE notification_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id),
  order_id uuid REFERENCES orders(id),
  channel text NOT NULL,
  recipient text NOT NULL,
  template text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  state notification_state NOT NULL DEFAULT 'queued',
  attempts integer NOT NULL DEFAULT 0,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz
);

CREATE TABLE offline_sync_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id),
  driver_id uuid NOT NULL REFERENCES drivers(id),
  client_event_id text NOT NULL,
  event_type text NOT NULL,
  payload jsonb NOT NULL,
  occurred_at timestamptz NOT NULL,
  synced_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, driver_id, client_event_id)
);

CREATE INDEX idx_orders_company_status_date
  ON orders (company_id, status, scheduled_for DESC, id DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_orders_driver_date
  ON orders (company_id, driver_id, scheduled_for DESC, id DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_orders_region_date
  ON orders (company_id, region, scheduled_for DESC, id DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_orders_delivery_location
  ON orders USING gist (delivery_location)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_drivers_current_position
  ON drivers USING gist (current_position)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_gps_driver_recorded_at
  ON gps_positions (company_id, driver_id, recorded_at DESC);

CREATE INDEX idx_gps_position
  ON gps_positions USING gist (position);

CREATE INDEX idx_status_history_order_created_at
  ON status_history (company_id, order_id, created_at);

CREATE INDEX idx_notification_outbox_state_created_at
  ON notification_outbox (state, created_at)
  WHERE state = 'queued';

CREATE INDEX idx_offline_sync_driver_occurred_at
  ON offline_sync_events (company_id, driver_id, occurred_at DESC);

-- Examples:
-- Radius query:
-- SELECT *
-- FROM orders
-- WHERE company_id = $1
--   AND deleted_at IS NULL
--   AND ST_DWithin(delivery_location, ST_MakePoint($lng, $lat)::geography, $radius_meters);
--
-- Cursor pagination:
-- SELECT *
-- FROM orders
-- WHERE company_id = $1
--   AND deleted_at IS NULL
--   AND (scheduled_for, id) < ($last_scheduled_for, $last_id)
-- ORDER BY scheduled_for DESC, id DESC
-- LIMIT 100;
