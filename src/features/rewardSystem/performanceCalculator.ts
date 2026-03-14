export function calculatePerformance(taskCompletionTime: number): number {
  if (taskCompletionTime < 30) {
    return 5;
  } else if (taskCompletionTime < 60) {
    return 3;
  } else {
    return 1;
  }
}
