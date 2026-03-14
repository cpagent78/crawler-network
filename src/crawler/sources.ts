/**
 * 초기 크롤링 소스 설정
 * 
 * 사이트별 탐색 주기:
 * - Tech News → 30분
 * - 제품 출시 → 1~2시간
 * - YouTube 트렌드 → 2~3시간
 * - 일반 블로그 → 6시간
 */

export interface CrawlSource {
  name: string;
  url: string;
  category: string;
  intervalMinutes: number; // 크롤링 간격 (분)
  maxArticles: number; // 한 번에 최대 추출 기사 수
  enabled: boolean;
}

export const INITIAL_SOURCES: CrawlSource[] = [
  // Tech News (30분 간격)
  {
    name: "TechCrunch",
    url: "https://techcrunch.com/",
    category: "tech_news",
    intervalMinutes: 30,
    maxArticles: 10,
    enabled: true,
  },
  {
    name: "The Verge",
    url: "https://www.theverge.com/",
    category: "tech_news",
    intervalMinutes: 30,
    maxArticles: 10,
    enabled: true,
  },
  {
    name: "Ars Technica",
    url: "https://arstechnica.com/",
    category: "tech_news",
    intervalMinutes: 30,
    maxArticles: 10,
    enabled: true,
  },
  {
    name: "Engadget",
    url: "https://www.engadget.com/",
    category: "tech_news",
    intervalMinutes: 30,
    maxArticles: 10,
    enabled: true,
  },
  {
    name: "Wired",
    url: "https://www.wired.com/",
    category: "tech_news",
    intervalMinutes: 30,
    maxArticles: 10,
    enabled: true,
  },
  {
    name: "CNET",
    url: "https://www.cnet.com/news/",
    category: "tech_news",
    intervalMinutes: 30,
    maxArticles: 10,
    enabled: true,
  },
  {
    name: "TechRadar",
    url: "https://www.techradar.com/news",
    category: "tech_news",
    intervalMinutes: 30,
    maxArticles: 10,
    enabled: true,
  },

  // 제품 출시 (1~2시간 간격)
  {
    name: "Product Hunt",
    url: "https://www.producthunt.com/",
    category: "product_launch",
    intervalMinutes: 60,
    maxArticles: 10,
    enabled: true,
  },
  {
    name: "Amazon New Releases - Electronics",
    url: "https://www.amazon.com/gp/new-releases/electronics",
    category: "product_launch",
    intervalMinutes: 120,
    maxArticles: 10,
    enabled: true,
  },
  {
    name: "Amazon Best Sellers - Electronics",
    url: "https://www.amazon.com/Best-Sellers-Electronics/zgbs/electronics",
    category: "product_launch",
    intervalMinutes: 120,
    maxArticles: 10,
    enabled: true,
  },

  // 트렌드 (2~3시간 간격)
  {
    name: "Hacker News",
    url: "https://news.ycombinator.com/",
    category: "trend",
    intervalMinutes: 120,
    maxArticles: 10,
    enabled: true,
  },
  {
    name: "Reddit - Technology",
    url: "https://www.reddit.com/r/technology/top/?t=day",
    category: "trend",
    intervalMinutes: 120,
    maxArticles: 5,
    enabled: true,
  },
  {
    name: "Reddit - Gadgets",
    url: "https://www.reddit.com/r/gadgets/top/?t=day",
    category: "trend",
    intervalMinutes: 120,
    maxArticles: 5,
    enabled: true,
  },
];

/**
 * 활성화된 소스만 반환
 */
export function getActiveSources(): CrawlSource[] {
  return INITIAL_SOURCES.filter((s) => s.enabled);
}

/**
 * 카테고리별 소스 반환
 */
export function getSourcesByCategory(category: string): CrawlSource[] {
  return INITIAL_SOURCES.filter((s) => s.enabled && s.category === category);
}
