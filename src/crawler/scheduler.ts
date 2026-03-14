/**
 * Crawl Scheduler
 *
 * Manages crawl timing per source site based on configured intervals:
 * - Tech News: 30 min
 * - Product launch sites: 1~2 hours
 * - YouTube trends: 2~3 hours
 * - General blogs: 6 hours
 */

// TODO: Implement scheduling logic
// - Site-specific crawl intervals
// - Adaptive scheduling based on reward data
// - Crawl queue management via Redis
// - Pause/resume based on service availability

export interface CrawlTask {
  url: string;
  crawlerId: string;
  priority: number;
  scheduledAt: Date;
}

export async function getNextTasks(): Promise<CrawlTask[]> {
  throw new Error("Not implemented");
}
