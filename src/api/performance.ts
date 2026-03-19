import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const PerformanceDataSchema = z.object({
  employeeId: z.string().min(1, 'Employee ID is required'),
  period: z.string().min(1, 'Performance period is required'),
  kpiScores: z.record(z.string(), z.number().min(0).max(100)),
  goalAchievements: z.array(z.object({
    goalId: z.string(),
    targetValue: z.number(),
    actualValue: z.number(),
    achievementRate: z.number().min(0).max(200),
    weight: z.number().min(0).max(1)
  })),
  qualitativeRatings: z.object({
    leadership: z.number().min(1).max(5).optional(),
    teamwork: z.number().min(1).max(5).optional(),
    innovation: z.number().min(1).max(5).optional(),
    customerFocus: z.number().min(1).max(5).optional(),
    communication: z.number().min(1).max(5).optional()
  }).optional(),
  overallScore: z.number().min(0).max(100),
  reviewerComments: z.string().optional(),
  employeeSelfAssessment: z.string().optional(),
  submittedAt: z.string().datetime().optional(),
  reviewedAt: z.string().datetime().optional(),
  status: z.enum(['draft', 'submitted', 'under_review', 'approved', 'rejected']).default('draft')
});

type PerformanceData = z.infer<typeof PerformanceDataSchema>;

// In-memory storage (replace with database in production)
const performanceRecords: PerformanceData[] = [];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate the request body
    const validationResult = PerformanceDataSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Validation failed', 
          details: validationResult.error.errors 
        },
        { status: 400 }
      );
    }

    const performanceData = validationResult.data;
    
    // Add timestamp if not provided
    if (!performanceData.submittedAt) {
      performanceData.submittedAt = new Date().toISOString();
    }

    // Calculate performance tier based on overall score
    const performanceTier = calculatePerformanceTier(performanceData.overallScore);
    
    // Calculate bonus eligibility
    const bonusCalculation = calculatePerformanceBonus(performanceData);

    // Store the performance record
    const recordWithId = {
      ...performanceData,
      id: generateId(),
      performanceTier,
      bonusCalculation,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    performanceRecords.push(recordWithId);

    return NextResponse.json({
      success: true,
      data: recordWithId,
      message: 'Performance data submitted successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('Error processing performance data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employeeId');
    const period = searchParams.get('period');
    const status = searchParams.get('status');

    let filteredRecords = performanceRecords;

    if (employeeId) {
      filteredRecords = filteredRecords.filter(record => record.employeeId === employeeId);
    }

    if (period) {
      filteredRecords = filteredRecords.filter(record => record.period === period);
    }

    if (status) {
      filteredRecords = filteredRecords.filter(record => record.status === status);
    }

    return NextResponse.json({
      success: true,
      data: filteredRecords,
      total: filteredRecords.length
    });

  } catch (error) {
    console.error('Error retrieving performance data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function calculatePerformanceTier(overallScore: number): string {
  if (overallScore >= 90) return 'S';
  if (overallScore >= 80) return 'A';
  if (overallScore >= 70) return 'B';
  if (overallScore >= 60) return 'C';
  return 'D';
}

function calculatePerformanceBonus(performanceData: PerformanceData) {
  const baseMultiplier = getBaseMultiplier(performanceData.overallScore);
  const goalBonusMultiplier = calculateGoalBonusMultiplier(performanceData.goalAchievements);
  const qualitativeBonusMultiplier = calculateQualitativeBonusMultiplier(performanceData.qualitativeRatings);

  const totalMultiplier = baseMultiplier * (1 + goalBonusMultiplier + qualitativeBonusMultiplier);

  return {
    baseMultiplier,
    goalBonusMultiplier,
    qualitativeBonusMultiplier,
    totalMultiplier: Math.min(totalMultiplier, 3.0), // Cap at 300%
    tier: calculatePerformanceTier(performanceData.overallScore),
    eligibleForBonus: performanceData.overallScore >= 60
  };
}

function getBaseMultiplier(overallScore: number): number {
  if (overallScore >= 90) return 2.0;
  if (overallScore >= 80) return 1.5;
  if (overallScore >= 70) return 1.2;
  if (overallScore >= 60) return 1.0;
  return 0.0;
}

function calculateGoalBonusMultiplier(goalAchievements: PerformanceData['goalAchievements']): number {
  if (!goalAchievements.length) return 0;
  
  const weightedAchievement = goalAchievements.reduce((sum, goal) => {
    return sum + (goal.achievementRate * goal.weight);
  }, 0);

  const totalWeight = goalAchievements.reduce((sum, goal) => sum + goal.weight, 0);
  const averageAchievement = totalWeight > 0 ? weightedAchievement / totalWeight : 0;

  if (averageAchievement > 120) return 0.3;
  if (averageAchievement > 110) return 0.2;
  if (averageAchievement > 100) return 0.1;
  return 0;
}

function calculateQualitativeBonusMultiplier(qualitativeRatings?: PerformanceData['qualitativeRatings']): number {
  if (!qualitativeRatings) return 0;

  const ratings = Object.values(qualitativeRatings).filter(rating => rating !== undefined) as number[];
  if (ratings.length === 0) return 0;

  const averageRating = ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;

  if (averageRating >= 4.5) return 0.2;
  if (averageRating >= 4.0) return 0.15;
  if (averageRating >= 3.5) return 0.1;
  if (averageRating >= 3.0) return 0.05;
  return 0;
}

function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}