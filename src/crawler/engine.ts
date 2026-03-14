import * as cheerio from "cheerio";
import { extract } from "@extractus/article-extractor";

export interface CrawlResult {
  sourceUrl: string;
  sourceSite: string;
  title: string;
  content: string;
  publishedAt: string | null;
  viewCount: number | null;
  imageUrls: string[];
  language: string | null;
  tags: string[];
}

// User-Agent 풀 (로테이션용)
const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.2 Safari/605.1.15",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
];

function getRandomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

// 요청 간격 랜덤화 (1~5초)
function getRandomDelay(): number {
  return 1000 + Math.random() * 4000;
}

export async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * URL에서 도메인 추출
 */
export function extractDomain(url: string): string {
  try {
    const hostname = new URL(url).hostname;
    return hostname.replace(/^www\./, "");
  } catch {
    return "unknown";
  }
}

/**
 * HTML 페이지를 fetch하고 내용을 추출
 */
export async function fetchPage(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": getRandomUserAgent(),
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        "Cache-Control": "no-cache",
      },
      signal: AbortSignal.timeout(15000), // 15초 타임아웃
    });

    if (!response.ok) {
      console.error(`Fetch failed: ${response.status} for ${url}`);
      return null;
    }

    return await response.text();
  } catch (error) {
    console.error(`Fetch error for ${url}:`, error);
    return null;
  }
}

/**
 * article-extractor로 콘텐츠 추출 (메인 방식)
 */
export async function extractArticle(url: string): Promise<CrawlResult | null> {
  try {
    const article = await extract(url);

    if (!article || !article.title) return null;

    // 본문을 텍스트로 변환 (HTML 태그 제거)
    const textContent = article.content
      ? cheerio.load(article.content)("body").text().trim()
      : "";

    if (textContent.length < 100) return null; // 너무 짧으면 스킵

    return {
      sourceUrl: url,
      sourceSite: extractDomain(url),
      title: article.title,
      content: textContent,
      publishedAt: article.published ?? null,
      viewCount: null,
      imageUrls: article.image ? [article.image] : [],
      language: (article as Record<string, unknown>).language as string ?? null,
      tags: ((article as Record<string, unknown>).tags as string[]) ?? [],
    };
  } catch (error) {
    console.error(`Article extraction failed for ${url}:`, error);
    return null;
  }
}

/**
 * HTML에서 기사 링크 추출 (소스 사이트의 목록 페이지용)
 */
export function extractLinks(html: string, baseUrl: string): string[] {
  const $ = cheerio.load(html);
  const links: string[] = [];
  const seen = new Set<string>();

  $("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    if (!href) return;

    try {
      const absoluteUrl = new URL(href, baseUrl).toString();
      // 기사 링크만 필터 (일반적인 기사 URL 패턴)
      if (
        !seen.has(absoluteUrl) &&
        !absoluteUrl.includes("#") &&
        !absoluteUrl.match(/\.(css|js|png|jpg|gif|svg|ico|pdf|zip)$/i) &&
        !absoluteUrl.includes("/tag/") &&
        !absoluteUrl.includes("/category/") &&
        !absoluteUrl.includes("/author/") &&
        !absoluteUrl.includes("/page/") &&
        absoluteUrl.startsWith("http")
      ) {
        seen.add(absoluteUrl);
        links.push(absoluteUrl);
      }
    } catch {
      // 잘못된 URL 무시
    }
  });

  return links;
}

/**
 * 소스 사이트를 크롤링하고 새 기사들을 추출
 */
export async function crawlSource(
  sourceUrl: string,
  maxArticles: number = 10
): Promise<CrawlResult[]> {
  const results: CrawlResult[] = [];

  // 1. 소스 사이트의 메인/목록 페이지에서 링크 수집
  const html = await fetchPage(sourceUrl);
  if (!html) return results;

  const links = extractLinks(html, sourceUrl);
  const sourceDomain = extractDomain(sourceUrl);

  // 같은 도메인 링크만 필터
  const sameDomainLinks = links.filter(
    (link) => extractDomain(link) === sourceDomain
  );

  // 최대 maxArticles개만 처리
  const targetLinks = sameDomainLinks.slice(0, maxArticles);

  // 2. 각 링크에서 기사 추출
  for (const link of targetLinks) {
    await delay(getRandomDelay()); // 랜덤 딜레이

    const article = await extractArticle(link);
    if (article) {
      results.push(article);
    }
  }

  return results;
}
