import { extract } from "@extractus/article-extractor";

export interface ExtractedContent {
  title: string;
  content: string;
  publishedAt: string | null;
  image: string | null;
}

/**
 * Extract article content from a URL using @extractus/article-extractor.
 */
export async function extractContent(
  url: string
): Promise<ExtractedContent | null> {
  try {
    const article = await extract(url);
    if (!article) return null;

    return {
      title: article.title ?? "",
      content: article.content ?? "",
      publishedAt: article.published ?? null,
      image: article.image ?? null,
    };
  } catch {
    return null;
  }
}
