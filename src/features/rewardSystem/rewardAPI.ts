import { calculatePerformance } from './performanceCalculator';

interface RewardRequest {
  userId: string;
  taskId: string;
  taskCompletionTime: number;
}

interface RewardResponse {
  userId: string;
  rewardPoints: number;
  message: string;
}

export function calculateReward(request: RewardRequest): RewardResponse {
  const performanceScore = calculatePerformance(request.taskCompletionTime);
  const rewardPoints = performanceScore * 10;  // Example calculation
  const message = `User ${request.userId} has earned ${rewardPoints} reward points.`;

  return {
    userId: request.userId,
    rewardPoints,
    message,
  };
}
