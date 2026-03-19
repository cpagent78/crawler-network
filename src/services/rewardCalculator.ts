export interface PerformanceMetrics {
  userId: string;
  totalStaked: number;
  stakingDuration: number; // in days
  validatorUptime: number; // percentage
  slashingEvents: number;
  delegatorCount: number;
  networkContribution: number; // composite score
}

export interface RewardDistribution {
  userId: string;
  baseReward: number;
  performanceBonus: number;
  totalReward: number;
  rewardShare: number; // percentage of total pool
}

export class RewardCalculator {
  private static readonly PERFORMANCE_WINDOW_DAYS = 30;
  private static readonly MIN_STAKING_DURATION = 7; // minimum days for eligibility
  private static readonly PERFORMANCE_WEIGHTS = {
    stakingAmount: 0.3,
    duration: 0.2,
    uptime: 0.25,
    slashing: 0.15,
    networkContribution: 0.1
  };

  public static calculatePerformanceRewards(
    metrics: PerformanceMetrics[],
    totalRewardPool: number
  ): RewardDistribution[] {
    // Filter eligible participants
    const eligibleMetrics = metrics.filter(
      m => m.stakingDuration >= this.MIN_STAKING_DURATION
    );

    if (eligibleMetrics.length === 0) {
      return [];
    }

    // Calculate performance scores
    const scoredMetrics = this.calculatePerformanceScores(eligibleMetrics);
    
    // Calculate total weighted score
    const totalWeightedScore = scoredMetrics.reduce(
      (sum, metric) => sum + metric.weightedScore, 
      0
    );

    // Distribute rewards proportionally
    return scoredMetrics.map(metric => {
      const rewardShare = metric.weightedScore / totalWeightedScore;
      const baseReward = totalRewardPool * rewardShare * 0.7; // 70% base
      const performanceBonus = totalRewardPool * rewardShare * 0.3; // 30% bonus
      const totalReward = baseReward + performanceBonus;

      return {
        userId: metric.userId,
        baseReward,
        performanceBonus,
        totalReward,
        rewardShare: rewardShare * 100
      };
    });
  }

  private static calculatePerformanceScores(
    metrics: PerformanceMetrics[]
  ): (PerformanceMetrics & { weightedScore: number })[] {
    const maxValues = this.getMaxValues(metrics);

    return metrics.map(metric => {
      const normalizedScores = {
        stakingAmount: this.normalizeValue(metric.totalStaked, maxValues.totalStaked),
        duration: this.normalizeValue(metric.stakingDuration, maxValues.stakingDuration),
        uptime: metric.validatorUptime / 100, // already percentage
        slashing: Math.max(0, 1 - (metric.slashingEvents * 0.2)), // penalty for slashing
        networkContribution: this.normalizeValue(
          metric.networkContribution, 
          maxValues.networkContribution
        )
      };

      const weightedScore = 
        normalizedScores.stakingAmount * this.PERFORMANCE_WEIGHTS.stakingAmount +
        normalizedScores.duration * this.PERFORMANCE_WEIGHTS.duration +
        normalizedScores.uptime * this.PERFORMANCE_WEIGHTS.uptime +
        normalizedScores.slashing * this.PERFORMANCE_WEIGHTS.slashing +
        normalizedScores.networkContribution * this.PERFORMANCE_WEIGHTS.networkContribution;

      return {
        ...metric,
        weightedScore
      };
    });
  }

  private static getMaxValues(metrics: PerformanceMetrics[]) {
    return {
      totalStaked: Math.max(...metrics.map(m => m.totalStaked)),
      stakingDuration: Math.max(...metrics.map(m => m.stakingDuration)),
      networkContribution: Math.max(...metrics.map(m => m.networkContribution))
    };
  }

  private static normalizeValue(value: number, maxValue: number): number {
    return maxValue > 0 ? value / maxValue : 0;
  }

  public static calculateDailyRewardAllocation(
    totalDailyPool: number,
    daysSinceLastDistribution: number
  ): number {
    // Accumulate rewards over the performance window
    const maxAccumulationDays = this.PERFORMANCE_WINDOW_DAYS;
    const effectiveDays = Math.min(daysSinceLastDistribution, maxAccumulationDays);
    
    return totalDailyPool * effectiveDays;
  }

  public static getPerformanceWindowMetrics(
    userId: string,
    historicalData: any[]
  ): PerformanceMetrics | null {
    const windowStart = Date.now() - (this.PERFORMANCE_WINDOW_DAYS * 24 * 60 * 60 * 1000);
    const relevantData = historicalData.filter(
      data => data.timestamp >= windowStart && data.userId === userId
    );

    if (relevantData.length === 0) {
      return null;
    }

    // Aggregate metrics over the window
    const totalStaked = relevantData.reduce((sum, data) => sum + data.stakedAmount, 0) / relevantData.length;
    const avgUptime = relevantData.reduce((sum, data) => sum + data.uptime, 0) / relevantData.length;
    const totalSlashing = relevantData.reduce((sum, data) => sum + (data.slashingEvents || 0), 0);
    const stakingDuration = this.PERFORMANCE_WINDOW_DAYS;
    const delegatorCount = Math.max(...relevantData.map(data => data.delegatorCount || 0));
    const networkContribution = this.calculateNetworkContribution(relevantData);

    return {
      userId,
      totalStaked,
      stakingDuration,
      validatorUptime: avgUptime,
      slashingEvents: totalSlashing,
      delegatorCount,
      networkContribution
    };
  }

  private static calculateNetworkContribution(data: any[]): number {
    // Composite score based on various network health metrics
    const avgBlocksProduced = data.reduce((sum, d) => sum + (d.blocksProduced || 0), 0) / data.length;
    const avgTransactionsProcessed = data.reduce((sum, d) => sum + (d.transactionsProcessed || 0), 0) / data.length;
    const consistencyScore = this.calculateConsistencyScore(data);
    
    return (avgBlocksProduced * 0.4) + (avgTransactionsProcessed * 0.4) + (consistencyScore * 0.2);
  }

  private static calculateConsistencyScore(data: any[]): number {
    if (data.length < 2) return 1;
    
    const uptimes = data.map(d => d.uptime);
    const mean = uptimes.reduce((a, b) => a + b, 0) / uptimes.length;
    const variance = uptimes.reduce((sum, uptime) => sum + Math.pow(uptime - mean, 2), 0) / uptimes.length;
    const standardDeviation = Math.sqrt(variance);
    
    // Lower standard deviation = higher consistency = higher score
    return Math.max(0, 1 - (standardDeviation / 100));
  }
}