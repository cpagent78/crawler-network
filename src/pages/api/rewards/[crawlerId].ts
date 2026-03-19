import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { crawlerId } = req.query;
    
    if (!crawlerId || typeof crawlerId !== 'string') {
      return res.status(400).json({ error: 'Invalid crawler ID' });
    }

    // Verify crawler ownership
    const crawler = await prisma.crawler.findFirst({
      where: {
        id: crawlerId,
        userId: session.user.id,
      },
    });

    if (!crawler) {
      return res.status(404).json({ error: 'Crawler not found' });
    }

    // Get reward history
    const rewards = await prisma.reward.findMany({
      where: {
        crawlerId: crawlerId,
      },
      include: {
        adoption: {
          select: {
            id: true,
            adoptedAt: true,
            status: true,
            buyer: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Calculate total rewards
    const totalRewards = rewards.reduce((sum, reward) => sum + reward.amount, 0);

    // Group rewards by type
    const rewardsByType = rewards.reduce((acc, reward) => {
      if (!acc[reward.type]) {
        acc[reward.type] = {
          count: 0,
          totalAmount: 0,
          rewards: [],
        };
      }
      acc[reward.type].count++;
      acc[reward.type].totalAmount += reward.amount;
      acc[reward.type].rewards.push(reward);
      return acc;
    }, {} as Record<string, any>);

    // Get adoption statistics
    const adoptionStats = await prisma.adoption.aggregate({
      where: {
        crawlerId: crawlerId,
        status: 'COMPLETED',
      },
      _sum: {
        price: true,
      },
      _count: {
        id: true,
      },
    });

    const response = {
      crawlerId,
      totalRewards,
      totalAdoptions: adoptionStats._count.id || 0,
      totalAdoptionRevenue: adoptionStats._sum.price || 0,
      rewardsByType,
      rewards: rewards.map(reward => ({
        id: reward.id,
        type: reward.type,
        amount: reward.amount,
        description: reward.description,
        createdAt: reward.createdAt,
        adoption: reward.adoption ? {
          id: reward.adoption.id,
          adoptedAt: reward.adoption.adoptedAt,
          status: reward.adoption.status,
          buyer: reward.adoption.buyer,
        } : null,
      })),
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Error fetching rewards:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    await prisma.$disconnect();
  }
}