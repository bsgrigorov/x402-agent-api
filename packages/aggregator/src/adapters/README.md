/**
 * Adapters (per source / family) extract RawCandidate[].
 * Aggregate gate + pipeline are source-agnostic.
 *
 *   adapters/     extract only (rss, tldr, cisa, quotes, …)
 *   aggregate/    gate, dedupe, store orchestration
 *   lib/          shared parsers (rss xml)
 *
 * New RSS source: registry JSON only.
 * New special source: adapters/<name>.ts + register in adapters/resolve.ts.
 */
