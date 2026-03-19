import { SourceMetrics } from './types';

export interface LearningConfig {
  minRewardThreshold: number;
  adaptationRate: number;
  frequencyMultiplier: {
    increase: number;
    decrease: number;
  };
  evaluationWindow: number; // hours
}

export interface SourcePerformance {
  sourceId: string;
  adoptionRate: number;
  averageReward: number;
  totalAttempts: number;
  successfulAttempts: number;
  lastEvaluated: Date;
}

export class LearningEngine {
  private config: LearningConfig;
  private performanceHistory: Map<string, SourcePerformance[]> = new Map();

  constructor(config: LearningConfig) {
    this.config = config;
  }

  analyzeSourceAdoptionRate(sourceId: string, metrics: SourceMetrics[]): number {
    const recentMetrics = this.getRecentMetrics(metrics);
    if (recentMetrics.length === 0) return 0;

    const successfulCrawls = recentMetrics.filter(m => m.status === 'success').length;
    return successfulCrawls / recentMetrics.length;
  }

  calculateAverageReward(sourceId: string, rewards: number[]): number {
    if (rewards.length === 0) return 0;
    return rewards.reduce((sum, reward) => sum + reward, 0) / rewards.length;
  }

  adjustCrawlingFrequency(
    sourceId: string,
    currentFrequency: number,
    adoptionRate: number,
    averageReward: number
  ): number {
    const performance = this.getLatestPerformance(sourceId);
    
    if (!performance) {
      return currentFrequency;
    }

    const rewardScore = this.calculateRewardScore(averageReward);
    const adoptionScore = adoptionRate;
    const combinedScore = (rewardScore * 0.6) + (adoptionScore * 0.4);

    let newFrequency = currentFrequency;

    if (combinedScore > 0.7 && averageReward > this.config.minRewardThreshold) {
      // High performance - increase frequency
      newFrequency = Math.min(
        currentFrequency * this.config.frequencyMultiplier.increase,
        60 // max 1 minute interval
      );
    } else if (combinedScore < 0.3 || averageReward < this.config.minRewardThreshold * 0.5) {
      // Poor performance - decrease frequency
      newFrequency = Math.max(
        currentFrequency * this.config.frequencyMultiplier.decrease,
        3600 // min 1 hour interval
      );
    }

    return Math.round(newFrequency);
  }

  updateSourcePerformance(
    sourceId: string,
    adoptionRate: number,
    averageReward: number,
    totalAttempts: number,
    successfulAttempts: number
  ): void {
    const performance: SourcePerformance = {
      sourceId,
      adoptionRate,
      averageReward,
      totalAttempts,
      successfulAttempts,
      lastEvaluated: new Date()
    };

    const history = this.performanceHistory.get(sourceId) || [];
    history.push(performance);

    // Keep only recent history (last 30 evaluations)
    if (history.length > 30) {
      history.shift();
    }

    this.performanceHistory.set(sourceId, history);
  }

  getSourceRecommendations(sourceId: string): {
    shouldIncrease: boolean;
    shouldDecrease: boolean;
    confidence: number;
    reason: string;
  } {
    const performance = this.getLatestPerformance(sourceId);
    
    if (!performance) {
      return {
        shouldIncrease: false,
        shouldDecrease: false,
        confidence: 0,
        reason: 'Insufficient data'
      };
    }

    const trend = this.calculatePerformanceTrend(sourceId);
    const rewardScore = this.calculateRewardScore(performance.averageReward);
    const adoptionScore = performance.adoptionRate;

    if (rewardScore > 0.7 && adoptionScore > 0.8 && trend > 0) {
      return {
        shouldIncrease: true,
        shouldDecrease: false,
        confidence: Math.min(rewardScore + adoptionScore, 1),
        reason: 'High reward and adoption rate with positive trend'
      };
    }

    if (rewardScore < 0.3 || adoptionScore < 0.2 || trend < -0.3) {
      return {
        shouldIncrease: false,
        shouldDecrease: true,
        confidence: Math.min(1 - rewardScore + (1 - adoptionScore), 1),
        reason: 'Low performance metrics or negative trend'
      };
    }

    return {
      shouldIncrease: false,
      shouldDecrease: false,
      confidence: 0.5,
      reason: 'Performance within acceptable range'
    };
  }

  private getRecentMetrics(metrics: SourceMetrics[]): SourceMetrics[] {
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - this.config.evaluationWindow);
    
    return metrics.filter(metric => new Date(metric.timestamp) > cutoffTime);
  }

  private getLatestPerformance(sourceId: string): SourcePerformance | null {
    const history = this.performanceHistory.get(sourceId);
    return history && history.length > 0 ? history[history.length - 1] : null;
  }

  private calculateRewardScore(reward: number): number {
    // Normalize reward to 0-1 scale based on threshold
    return Math.min(reward / this.config.minRewardThreshold, 1);
  }

  private calculatePerformanceTrend(sourceId: string): number {
    const history = this.performanceHistory.get(sourceId);
    
    if (!history || history.length < 3) {
      return 0;
    }

    const recent = history.slice(-5);
    const older = history.slice(-10, -5);

    if (older.length === 0) return 0;

    const recentAvg = recent.reduce((sum, p) => sum + p.averageReward, 0) / recent.length;
    const olderAvg = older.reduce((sum, p) => sum + p.averageReward, 0) / older.length;

    return olderAvg === 0 ? 0 : (recentAvg - olderAvg) / olderAvg;
  }
}

export const defaultLearningConfig: LearningConfig = {
  minRewardThreshold: 0.5,
  adaptationRate: 0.1,
  frequencyMultiplier: {
    increase: 0.8, // decrease interval (increase frequency)
    decrease: 1.5  // increase interval (decrease frequency)
  },
  evaluationWindow: 24
};

export const learningEngine = new LearningEngine(defaultLearningConfig);