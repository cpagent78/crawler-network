import { calculateReward } from './rewardAPI';

describe('Reward API', () => {
  it('should calculate reward points correctly based on performance score', () => {
    const request = {
      userId: 'user123',
      taskId: 'task456',
      taskCompletionTime: 25,
    };

    const response = calculateReward(request);

    expect(response.rewardPoints).toBe(50);
    expect(response.message).toBe('User user123 has earned 50 reward points.');
  });

  it('should return appropriate reward for different performance scores', () => {
    const request = {
      userId: 'user789',
      taskId: 'task101',
      taskCompletionTime: 45,
    };

    const response = calculateReward(request);

    expect(response.rewardPoints).toBe(30);
    expect(response.message).toBe('User user789 has earned 30 reward points.');
  });
});
