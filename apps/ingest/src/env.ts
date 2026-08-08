export type Env = {
  DB: D1Database;
  /** Bearer token for POST /internal/run-ingest */
  INGEST_TOKEN: string;
};
