import type { BriefItem, BriefResponse, FeedItem, SectionId } from "@x402-agent-api/shared";

function iso(sec: number): string {
  return new Date(sec * 1000).toISOString();
}

function toBriefItem(item: FeedItem): BriefItem {
  return {
    headline: item.title,
    summary: item.summary || item.title,
    why_it_matters: `Matched source ${item.source} (${item.section}).`,
    references: [
      {
        title: item.title,
        url: item.url,
        published_at: iso(item.published_at),
      },
    ],
  };
}

function toMarkdown(sections: BriefResponse["sections"]): string {
  const parts: string[] = [`# Morning brief`, ``];
  for (const section of sections) {
    parts.push(`## ${section.id}`, ``);
    if (section.items.length === 0) {
      parts.push(`_No matching items._`, ``);
      continue;
    }
    for (const item of section.items) {
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
  bySection: Map<SectionId, FeedItem[]>;
  priceUsdc: number;
  storeAgeS: number | null;
}): BriefResponse {
  const sections: BriefResponse["sections"] = [];
  let sources = 0;
  for (const [id, items] of args.bySection) {
    const briefItems = items.map(toBriefItem);
    sources += briefItems.length;
    sections.push({ id, items: briefItems });
  }

  return {
    generated_at: new Date().toISOString(),
    brief_markdown: toMarkdown(sections),
    sections,
    meta: {
      model: "extractive",
      sources_used: sources,
      store_age_s: args.storeAgeS,
      synthesize: false,
      economics: { price_usdc: args.priceUsdc, llm_cost_usd: 0 },
    },
  };
}
