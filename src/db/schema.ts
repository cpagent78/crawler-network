import {
  pgTable,
  pgSchema,
  text,
  timestamp,
  integer,
  real,
  jsonb,
  uniqueIndex,
  index,
  uuid,
  pgEnum,
} from "drizzle-orm/pg-core";

// crawler 스키마 (cprice DB와 분리)
export const crawlerSchema = pgSchema("crawler");

// Enums
export const submissionStatusEnum = crawlerSchema.enum("submission_status", [
  "pending",
  "adopted",
  "rejected",
]);

export const rewardTypeEnum = crawlerSchema.enum("reward_type", [
  "adoption",
  "performance",
]);

export const crawlerStatusEnum = crawlerSchema.enum("crawler_status", [
  "active",
  "inactive",
  "suspended",
]);

// 크롤러 등록/관리
export const crawlers = crawlerSchema.table("crawlers", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  apiKey: text("api_key").notNull().unique(),
  currentVersion: text("current_version").notNull(),
  strategy: text("strategy"),
  status: crawlerStatusEnum("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// 수집 정보 저장 (임시)
export const submissions = pgTable(
  "submissions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    crawlerId: uuid("crawler_id")
      .notNull()
      .references(() => crawlers.id),
    crawlerVersion: text("crawler_version").notNull(),
    sourceUrl: text("source_url").notNull(),
    sourceSite: text("source_site").notNull(),
    title: text("title").notNull(),
    content: text("content").notNull(),
    discoveredAt: timestamp("discovered_at", { withTimezone: true }).notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    viewCount: integer("view_count"),
    imageUrls: jsonb("image_urls").$type<string[]>(),
    language: text("language"),
    tags: jsonb("tags").$type<string[]>(),
    status: submissionStatusEnum("status").notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("submissions_source_url_idx").on(table.sourceUrl),
    index("submissions_crawler_id_idx").on(table.crawlerId),
    index("submissions_status_idx").on(table.status),
    index("submissions_created_at_idx").on(table.createdAt),
  ]
);

// 채택 기록
export const adoptions = pgTable(
  "adoptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    submissionId: uuid("submission_id")
      .notNull()
      .references(() => submissions.id),
    service: text("service").notNull(),
    pageId: text("page_id"),
    pageUrl: text("page_url"),
    adoptedAt: timestamp("adopted_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("adoptions_submission_id_idx").on(table.submissionId),
    index("adoptions_service_idx").on(table.service),
  ]
);

// 성과 기록 (스냅샷)
export const performance = pgTable(
  "performance",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    pageId: text("page_id").notNull(),
    service: text("service").notNull(),
    period: text("period").notNull(),
    visitors: integer("visitors").default(0),
    clicks: integer("clicks").default(0),
    conversions: integer("conversions").default(0),
    engagementScore: real("engagement_score").default(0),
    recordedAt: timestamp("recorded_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("performance_page_id_idx").on(table.pageId),
    index("performance_service_idx").on(table.service),
  ]
);

// 보상 기록 (영구 보관)
export const rewards = pgTable(
  "rewards",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    crawlerId: uuid("crawler_id")
      .notNull()
      .references(() => crawlers.id),
    crawlerVersion: text("crawler_version").notNull(),
    submissionId: uuid("submission_id")
      .notNull()
      .references(() => submissions.id),
    type: rewardTypeEnum("type").notNull(),
    service: text("service").notNull(),
    amount: real("amount").notNull(),
    reason: text("reason"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("rewards_crawler_id_idx").on(table.crawlerId),
    index("rewards_submission_id_idx").on(table.submissionId),
  ]
);

// 크롤러 학습 요약 (영구 보관)
export const crawlerStats = pgTable(
  "crawler_stats",
  {
    crawlerId: uuid("crawler_id")
      .notNull()
      .references(() => crawlers.id),
    crawlerVersion: text("crawler_version").notNull(),
    sourceSite: text("source_site").notNull(),
    adoptionRate: real("adoption_rate").default(0),
    avgReward: real("avg_reward").default(0),
    totalSubmissions: integer("total_submissions").default(0),
    totalAdoptions: integer("total_adoptions").default(0),
    lastUpdated: timestamp("last_updated", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("crawler_stats_crawler_id_idx").on(table.crawlerId),
    index("crawler_stats_version_idx").on(
      table.crawlerId,
      table.crawlerVersion
    ),
  ]
);

// 서비스 등록/상태
export const services = crawlerSchema.table("services", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  displayName: text("display_name").notNull(),
  apiKey: text("api_key").notNull().unique(),
  webhookUrl: text("webhook_url"),
  dailyLimit: integer("daily_limit").default(100),
  todayCount: integer("today_count").default(0),
  active: integer("active").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
