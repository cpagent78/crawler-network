interface AdoptionReward {
  baseReward: number;
  speedBonus: number;
  contentRichnessScore: number;
  totalReward: number;
}

interface ContentMetrics {
  wordCount: number;
  hasCodeExamples: boolean;
  hasImages: boolean;
  hasLinks: number;
  hasFormatting: boolean;
}

class RewardSystem {
  private static readonly BASE_ADOPTION_REWARD = 50;
  private static readonly MAX_SPEED_BONUS = 30;
  private static readonly MAX_CONTENT_BONUS = 20;
  private static readonly SPEED_BONUS_THRESHOLD_HOURS = 24;

  static calculateAdoptionReward(
    timeToAdoptionMs: number,
    content: string,
    contentMetrics?: ContentMetrics
  ): AdoptionReward {
    const baseReward = this.BASE_ADOPTION_REWARD;
    const speedBonus = this.calculateSpeedBonus(timeToAdoptionMs);
    const contentRichnessScore = this.calculateContentRichnessScore(content, contentMetrics);
    const totalReward = baseReward + speedBonus + contentRichnessScore;

    return {
      baseReward,
      speedBonus,
      contentRichnessScore,
      totalReward
    };
  }

  private static calculateSpeedBonus(timeToAdoptionMs: number): number {
    const hoursToAdoption = timeToAdoptionMs / (1000 * 60 * 60);
    
    if (hoursToAdoption <= 1) {
      return this.MAX_SPEED_BONUS;
    }
    
    if (hoursToAdoption >= this.SPEED_BONUS_THRESHOLD_HOURS) {
      return 0;
    }

    const speedRatio = 1 - (hoursToAdoption - 1) / (this.SPEED_BONUS_THRESHOLD_HOURS - 1);
    return Math.round(this.MAX_SPEED_BONUS * speedRatio);
  }

  private static calculateContentRichnessScore(
    content: string,
    metrics?: ContentMetrics
  ): number {
    let score = 0;
    
    const contentMetrics = metrics || this.analyzeContent(content);
    
    // Word count scoring (0-8 points)
    if (contentMetrics.wordCount >= 100) {
      score += 8;
    } else if (contentMetrics.wordCount >= 50) {
      score += 5;
    } else if (contentMetrics.wordCount >= 20) {
      score += 3;
    }

    // Code examples (0-5 points)
    if (contentMetrics.hasCodeExamples) {
      score += 5;
    }

    // Images (0-3 points)
    if (contentMetrics.hasImages) {
      score += 3;
    }

    // External links (0-2 points)
    if (contentMetrics.hasLinks > 0) {
      score += Math.min(2, contentMetrics.hasLinks);
    }

    // Formatting (0-2 points)
    if (contentMetrics.hasFormatting) {
      score += 2;
    }

    return Math.min(score, this.MAX_CONTENT_BONUS);
  }

  private static analyzeContent(content: string): ContentMetrics {
    const wordCount = content.trim().split(/\s+/).length;
    const hasCodeExamples = /```[\s\S]*?```|`[^`]+`/.test(content);
    const hasImages = /!\[.*?\]\(.*?\)/.test(content);
    const linkMatches = content.match(/\[.*?\]\(.*?\)/g);
    const hasLinks = linkMatches ? linkMatches.length : 0;
    const hasFormatting = /(\*\*.*?\*\*)|(\*.*?\*)|(__.*?__)|(_.*?_)|(#{1,6}\s)/.test(content);

    return {
      wordCount,
      hasCodeExamples,
      hasImages,
      hasLinks,
      hasFormatting
    };
  }

  static calculateUserTotalRewards(adoptionRewards: AdoptionReward[]): number {
    return adoptionRewards.reduce((total, reward) => total + reward.totalReward, 0);
  }

  static getRewardBreakdown(reward: AdoptionReward): string {
    return `Base: ${reward.baseReward} + Speed: ${reward.speedBonus} + Content: ${reward.contentRichnessScore} = ${reward.totalReward} points`;
  }
}

export { RewardSystem, type AdoptionReward, type ContentMetrics };