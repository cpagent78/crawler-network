export interface RewardData {
  url: string;
  reward: number;
  timestamp: Date;
  userFeedback?: 'positive' | 'negative' | 'neutral';
  crawlSuccess: boolean;
  responseTime: number;
  contentQuality?: number;
  relevanceScore?: number;
}

export interface FeedbackResult {
  totalRewards: number;
  averageReward: number;
  successRate: number;
  lastUpdated: Date;
  feedbackCount: number;
  positiveCount: number;
  negativeCount: number;
  neutralCount: number;
}

export interface CrawlerStatistics {
  totalCrawls: number;
  successfulCrawls: number;
  failedCrawls: number;
  averageResponseTime: number;
  averageContentQuality: number;
  averageRelevanceScore: number;
  topPerformingUrls: string[];
  poorPerformingUrls: string[];
  dailyStats: {
    date: Date;
    crawlCount: number;
    successRate: number;
    averageReward: number;
  }[];
  weeklyTrends: {
    week: string;
    performance: number;
    improvement: number;
  }[];
}

export interface LearningMetrics {
  modelAccuracy: number;
  predictionConfidence: number;
  learningProgress: number;
  adaptationRate: number;
  lastTrainingDate: Date;
  trainingDataSize: number;
}