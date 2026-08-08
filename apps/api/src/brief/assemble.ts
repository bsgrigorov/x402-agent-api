import type { BriefItem, BriefResponse, FeedItem, TopicId } from "@x402-agent-api/shared";

function iso(sec: number): string {
  return new Date(sec * 1000).toISOString();
}

function toBriefItem(item: FeedItem): BriefItem {
  const summary =
    item.kind === "quote" && item.payload && item.payload !== "{}"
      ? `${item.summary || item.title} · ${item.payload}`
      : item.summary || item.title;
  return {
    headline: item.title,
    summary,
    why_it_matters: `Matched source ${item.source} (${item.topic}).`,
    references: [
      {
        title: item.title,
        url: item.url,
        published_at: iso(item.published_at),
      },
    ],
  };
}

function toMarkdown(topics: BriefResponse["topics"]): string {
  const parts: string[] = [`# Morning brief`, ``];
  for (const topic of topics) {
    parts.push(`## ${topic.id}`, ``);
    if (topic.items.length === 0) {
      parts.push(`_No matching items._`, ``);
      continue;
    }
    for (const item of topic.items) {
      parts.push(`### ${item.headline}`, ``);
      parts.push(item.summary, ``);
      parts.push(`- Why: ${item.why_it_matters}`);
      for (const ref of item.references) {
        parts.push(`- [${ref.title}](${ref.url}) (${ref.published_at})`);
      }
      parts.push(``);
    }
  }
  return parts.join("\n");
}

export function assembleExtractive(args: {
  byTopic: Map<TopicId, FeedItem[]>;
  priceUsdc: number;
  storeAgeS: number | null;
}): BriefResponse {
  const topics: BriefResponse["topics"] = [];
  let sources = 0;
  for (const [id, items] of args.byTopic) {
    const briefItems = items.map(toBriefItem);
    sources += briefItems.length;
    topics.push({ id, items: briefItems });
  }

  return {
    generated_at: new Date().toISOString(),
    brief_markdown: toMarkdown(topics),
    topics,
    meta: {
      model: "extractive",
      sources_used: sources,
      store_age_s: args.storeAgeS,
      synthesize: false,
      economics: { price_usdc: args.priceUsdc, llm_cost_usd: 0 },
    },
  };
}
