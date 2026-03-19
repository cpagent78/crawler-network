import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const crawlerId = searchParams.get('crawlerId');
    const type = searchParams.get('type'); // 'rewards' or 'adoption'

    if (!crawlerId) {
      return NextResponse.json(
        { error: 'Crawler ID is required' },
        { status: 400 }
      );
    }

    if (type === 'rewards') {
      // Get rewards feedback for crawler
      const rewards = await getRewardsFeedback(crawlerId);
      return NextResponse.json({ data: rewards });
    } else if (type === 'adoption') {
      // Get adoption results feedback for crawler
      const adoption = await getAdoptionFeedback(crawlerId);
      return NextResponse.json({ data: adoption });
    } else {
      // Get all feedback for crawler
      const feedback = await getAllFeedback(crawlerId);
      return NextResponse.json({ data: feedback });
    }
  } catch (error) {
    console.error('Error fetching feedback:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { crawlerId, type, feedback } = body;

    if (!crawlerId || !type || !feedback) {
      return NextResponse.json(
        { error: 'Crawler ID, type, and feedback are required' },
        { status: 400 }
      );
    }

    const result = await submitFeedback(crawlerId, type, feedback);
    return NextResponse.json({ data: result });
  } catch (error) {
    console.error('Error submitting feedback:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function getRewardsFeedback(crawlerId: string) {
  // Mock implementation - replace with actual database query
  return {
    crawlerId,
    rewards: {
      totalRewards: 150,
      rewardBreakdown: {
        dataQuality: 80,
        coverage: 40,
        timeliness: 30
      },
      rewardHistory: [
        { date: '2024-01-01', amount: 50, reason: 'High quality data' },
        { date: '2024-01-02', amount: 45, reason: 'Comprehensive coverage' },
        { date: '2024-01-03', amount: 55, reason: 'Timely delivery' }
      ]
    }
  };
}

async function getAdoptionFeedback(crawlerId: string) {
  // Mock implementation - replace with actual database query
  return {
    crawlerId,
    adoption: {
      adoptionRate: 0.75,
      usageMetrics: {
        totalDownloads: 1250,
        activeUsers: 45,
        avgRating: 4.2
      },
      adoptionTrends: [
        { period: '2024-01', downloads: 400, users: 35 },
        { period: '2024-02', downloads: 450, users: 42 },
        { period: '2024-03', downloads: 400, users: 38 }
      ]
    }
  };
}

async function getAllFeedback(crawlerId: string) {
  const rewards = await getRewardsFeedback(crawlerId);
  const adoption = await getAdoptionFeedback(crawlerId);
  
  return {
    crawlerId,
    rewards: rewards.rewards,
    adoption: adoption.adoption,
    lastUpdated: new Date().toISOString()
  };
}

async function submitFeedback(crawlerId: string, type: string, feedback: any) {
  // Mock implementation - replace with actual database operation
  const timestamp = new Date().toISOString();
  
  return {
    id: `feedback_${Date.now()}`,
    crawlerId,
    type,
    feedback,
    submittedAt: timestamp,
    status: 'processed'
  };
}