export interface PerformanceMetric {
  id: string;
  name: string;
  description: string;
  type: 'numeric' | 'percentage' | 'boolean' | 'rating';
  unit?: string;
  minValue?: number;
  maxValue?: number;
  weight: number; // Weight in overall performance calculation
  category: 'productivity' | 'quality' | 'collaboration' | 'innovation' | 'leadership';
}

export interface UserPerformanceData {
  userId: string;
  evaluationPeriod: {
    startDate: Date;
    endDate: Date;
  };
  metrics: {
    [metricId: string]: {
      value: number | boolean;
      evidence?: string[];
      selfAssessment?: number;
      managerAssessment?: number;
      peerAssessments?: number[];
    };
  };
  overallScore: number;
  status: 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected';
  submittedAt?: Date;
  reviewedAt?: Date;
  reviewedBy?: string;
  comments?: string;
}

export interface PerformanceEvaluation {
  id: string;
  title: string;
  description: string;
  period: {
    startDate: Date;
    endDate: Date;
  };
  evaluationType: 'annual' | 'quarterly' | 'monthly' | 'project-based';
  metrics: PerformanceMetric[];
  participants: string[]; // User IDs
  evaluators: string[]; // Manager/HR IDs
  status: 'active' | 'completed' | 'cancelled';
  deadlines: {
    selfAssessmentDeadline: Date;
    managerReviewDeadline: Date;
    finalReviewDeadline: Date;
  };
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface RewardTier {
  id: string;
  name: string;
  minScore: number;
  maxScore: number;
  multiplier: number; // Base reward multiplier
  benefits: string[];
  color: string; // For UI display
}

export interface RewardCalculation {
  userId: string;
  evaluationId: string;
  baseAmount: number;
  performanceScore: number;
  tier: RewardTier;
  bonusMultiplier: number;
  finalAmount: number;
  breakdown: {
    [category: string]: {
      score: number;
      weight: number;
      contribution: number;
    };
  };
  calculatedAt: Date;
  status: 'calculated' | 'approved' | 'distributed';
}

export interface PerformanceReward {
  id: string;
  userId: string;
  evaluationId: string;
  amount: number;
  tokenType: 'performance_token' | 'bonus_token';
  tier: string;
  reason: string;
  distributedAt: Date;
  transactionHash?: string;
}

export interface PerformanceDashboard {
  userId: string;
  currentPeriod: {
    score: number;
    tier: string;
    ranking: number;
    totalParticipants: number;
  };
  historicalData: {
    period: string;
    score: number;
    tier: string;
    reward: number;
  }[];
  upcomingEvaluations: PerformanceEvaluation[];
  achievements: {
    id: string;
    name: string;
    description: string;
    earnedAt: Date;
    icon: string;
  }[];
}

export interface PeerFeedback {
  id: string;
  fromUserId: string;
  toUserId: string;
  evaluationId: string;
  feedback: {
    [metricId: string]: {
      rating: number;
      comment?: string;
    };
  };
  submittedAt: Date;
  isAnonymous: boolean;
}

export interface PerformanceGoal {
  id: string;
  userId: string;
  title: string;
  description: string;
  category: string;
  targetValue: number;
  currentValue: number;
  unit: string;
  deadline: Date;
  status: 'active' | 'completed' | 'overdue' | 'cancelled';
  progress: number; // Percentage
  milestones: {
    id: string;
    title: string;
    targetValue: number;
    completedAt?: Date;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

export interface PerformanceAnalytics {
  organizationId: string;
  period: {
    startDate: Date;
    endDate: Date;
  };
  summary: {
    totalParticipants: number;
    averageScore: number;
    completionRate: number;
    totalRewardsDistributed: number;
  };
  scoreDistribution: {
    [tierName: string]: number;
  };
  departmentPerformance: {
    [departmentId: string]: {
      averageScore: number;
      participantCount: number;
      topPerformers: string[];
    };
  };
  trends: {
    scoreImprovement: number;
    participationTrend: number;
    rewardEfficiency: number;
  };
}