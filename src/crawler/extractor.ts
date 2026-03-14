import { extract } from "@extractus/article-extractor";
import * as cheerio from "cheerio";

export interface ExtractedContent {
  title: string;
  content: string;
  publishedAt: string | null;
  imageUrls: string[];
  language: string | null;
  viewCount: number | null;
  tags: string[];
}

/**
 * article-extractor로 URL에서 기사 추출
 */
export async function extractArticleContent(
  url: string
): Promise<ExtractedContent | null> {
  try {
    const article = await extract(url);
    if (!article || !article.title) return null;

    // HTML → 텍스트 변환
    const textContent = article.content
      ? cheerio.load(article.content)("body").text().trim()
      : "";

    if (textContent.length < 100) return null;

    return {
      title: article.title,
      content: textContent,
      publishedAt: article.published ?? null,
      imageUrls: article.image ? [article.image] : [],
      language: (article as Record<string, unknown>).language as string ?? null,
      viewCount: null,
      tags: ((article as Record<string, unknown>).tags as string[]) ?? [],
    };
  } catch (error) {
    console.error(`Extraction failed for ${url}:`, error);
    return null;
  }
}

/**
 * HTML에서 메타데이터 추가 추출 (viewCount 등)
 */
export function extractMetadata(html: string): {
  viewCount: number | null;
  publishedAt: string | null;
  tags: string[];
} {
  const $ = cheerio.load(html);

  // viewCount 추출 시도 (사이트마다 다름)
  let viewCount: number | null = null;

  // 일반적인 뷰카운트 패턴
  const viewPatterns = [
    /(\d[\d,]*)\s*views/i,
    /조회\s*(\d[\d,]*)/,
    /(\d[\d,]*)\s*읽음/,
  ];

  const bodyText = $("body").text();
  for (const pattern of viewPatterns) {
    const match = bodyText.match(pattern);
    if (match) {
      viewCount = parseInt(match[1].replace(/,/g, ""));
      break;
    }
  }

  // publishedAt 추출 (meta 태그)
  let publishedAt: string | null = null;
  const dateSelectors = [
    'meta[property="article:published_time"]',
    'meta[name="publish-date"]',
    'meta[name="date"]',
    'time[datetime]',
  ];

  for (const selector of dateSelectors) {
    const el = $(selector);
    if (el.length) {
      publishedAt = el.attr("content") ?? el.attr("datetime") ?? null;
      if (publishedAt) break;
    }
  }

  // 태그 추출
  const tags: string[] = [];
  $('meta[property="article:tag"]').each((_, el) => {
    const tag = $(el).attr("content");
    if (tag) tags.push(tag);
  });
  $('meta[name="keywords"]').each((_, el) => {
    const content = $(el).attr("content");
    if (content) {
      tags.push(...content.split(",").map((t) => t.trim()).filter(Boolean));
    }
  });

  return { viewCount, publishedAt, tags };
}
