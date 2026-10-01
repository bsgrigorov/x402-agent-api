import { declareDiscoveryExtension } from "@x402-avm/extensions";

/** Bazaar metadata for POST /v1/brief (cataloged after first successful settle). */
export const briefRouteExtensions = declareDiscoveryExtension({
  bodyType: "json",
  input: {
    keywords: ["kubernetes", "ai"],
    topics: ["tech", "security"],
    format: "json",
    max_items_per_topic: 5,
  },
  output: {
    example: {
      generated_at: "2026-01-01T00:00:00.000Z",
      topics: [
        {
          id: "tech",
          items: [
            {
              headline: "Example headline",
              summary: "Extractive summary from ingested feeds.",
              why_it_matters: "Context for the reader.",
              references: [
                {
                  title: "Source",
                  url: "https://example.com/article",
                  published_at: "2026-01-01T00:00:00.000Z",
                },
              ],
            },
          ],
        },
      ],
      meta: {
        model: "extractive",
        sources_used: 12,
        store_age_s: 3600,
        synthesize: false,
      },
    },
  },
});
