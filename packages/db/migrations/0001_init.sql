-- items: feed corpus for morning-brief (and future products)
CREATE TABLE items (
  id TEXT PRIMARY KEY,
  url TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL,
  section TEXT NOT NULL,
  published_at INTEGER NOT NULL,
  ingested_at INTEGER NOT NULL,
  keywords_hint TEXT NOT NULL DEFAULT '[]'
);

CREATE INDEX items_section_published ON items (section, published_at DESC);
CREATE INDEX items_published ON items (published_at DESC);

-- metering: append-only
CREATE TABLE revenue_events (
  id TEXT PRIMARY KEY,
  request_id TEXT NOT NULL,
  sku TEXT NOT NULL,
  price_usdc REAL NOT NULL,
  payer TEXT,
  tx_id TEXT,
  network TEXT NOT NULL,
  settled_at INTEGER NOT NULL
);

CREATE INDEX revenue_settled ON revenue_events (settled_at DESC);
CREATE INDEX revenue_network ON revenue_events (network, settled_at DESC);

CREATE TABLE cost_events (
  id TEXT PRIMARY KEY,
  request_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  provider TEXT,
  model TEXT,
  tokens_in INTEGER,
  tokens_out INTEGER,
  cost_usd REAL NOT NULL,
  skip_reason TEXT,
  created_at INTEGER NOT NULL
);

CREATE INDEX cost_created ON cost_events (created_at DESC);

CREATE TABLE daily_journal (
  day TEXT NOT NULL,
  category TEXT NOT NULL,
  amount_usd REAL NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  PRIMARY KEY (day, category, note)
);
