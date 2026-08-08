-- Rename section → topic; add kind / external_id / payload for Wave1 aggregator.
-- SQLite/D1: RENAME COLUMN + ADD COLUMN with defaults for existing rows.

ALTER TABLE items RENAME COLUMN section TO topic;

DROP INDEX IF EXISTS items_section_published;
CREATE INDEX IF NOT EXISTS items_topic_published ON items (topic, published_at DESC);

ALTER TABLE items ADD COLUMN kind TEXT NOT NULL DEFAULT 'article';
ALTER TABLE items ADD COLUMN external_id TEXT NOT NULL DEFAULT '';
ALTER TABLE items ADD COLUMN payload TEXT NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS items_kind_published ON items (kind, published_at DESC);
