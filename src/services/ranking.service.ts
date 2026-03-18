import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Crawler } from '../entities/crawler.entity';
import { CrawlingSession } from '../entities/crawling-session.entity';
import { CrawlingResult } from '../entities/crawling-result.entity';

export interface CrawlerPerformanceMetrics {
  crawlerId: string;
  crawlerName: string;
  adoptionRate: number;
  averageSpeed: number;
  successRate: number;
  totalSessions: number;
  totalResults: number;
  averageResponseTime: number;
  errorRate: number;
  score: number;
  rank: number;
}

export interface RankingPeriod {
  daily: Date;
  weekly: Date;
  monthly: Date;
}

@Injectable()
export class RankingService {
  constructor(
    @InjectRepository(Crawler)
    private crawlerRepository: Repository<Crawler>,
    @InjectRepository(CrawlingSession)
    private sessionRepository: Repository<CrawlingSession>,
    @InjectRepository(CrawlingResult)
    private resultRepository: Repository<CrawlingResult>,
  ) {}

  async getCrawlerRankings(period: 'daily' | 'weekly' | 'monthly' = 'weekly'): Promise<CrawlerPerformanceMetrics[]> {
    const dateRange = this.getDateRange(period);
    const crawlers = await this.crawlerRepository.find({ where: { isActive: true } });
    
    const rankings: CrawlerPerformanceMetrics[] = [];

    for (const crawler of crawlers) {
      const metrics = await this.calculateCrawlerMetrics(crawler.id, dateRange.start, dateRange.end);
      rankings.push(metrics);
    }

    return rankings
      .sort((a, b) => b.score - a.score)
      .map((ranking, index) => ({ ...ranking, rank: index + 1 }));
  }

  async calculateCrawlerMetrics(crawlerId: string, startDate: Date, endDate: Date): Promise<CrawlerPerformanceMetrics> {
    const crawler = await this.crawlerRepository.findOne({ where: { id: crawlerId } });
    
    const sessions = await this.sessionRepository
      .createQueryBuilder('session')
      .where('session.crawlerId = :crawlerId', { crawlerId })
      .andWhere('session.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate })
      .getMany();

    const results = await this.resultRepository
      .createQueryBuilder('result')
      .leftJoin('result.session', 'session')
      .where('session.crawlerId = :crawlerId', { crawlerId })
      .andWhere('result.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate })
      .getMany();

    const adoptionRate = await this.calculateAdoptionRate(crawlerId, startDate, endDate);
    const averageSpeed = this.calculateAverageSpeed(sessions);
    const successRate = this.calculateSuccessRate(sessions);
    const averageResponseTime = this.calculateAverageResponseTime(results);
    const errorRate = this.calculateErrorRate(sessions);
    
    const score = this.calculateOverallScore({
      adoptionRate,
      averageSpeed,
      successRate,
      averageResponseTime,
      errorRate,
    });

    return {
      crawlerId,
      crawlerName: crawler?.name || 'Unknown',
      adoptionRate,
      averageSpeed,
      successRate,
      totalSessions: sessions.length,
      totalResults: results.length,
      averageResponseTime,
      errorRate,
      score,
      rank: 0, // Will be set after sorting
    };
  }

  private async calculateAdoptionRate(crawlerId: string, startDate: Date, endDate: Date): Promise<number> {
    const totalSessions = await this.sessionRepository
      .createQueryBuilder('session')
      .where('session.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate })
      .getCount();

    const crawlerSessions = await this.sessionRepository
      .createQueryBuilder('session')
      .where('session.crawlerId = :crawlerId', { crawlerId })
      .andWhere('session.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate })
      .getCount();

    return totalSessions > 0 ? (crawlerSessions / totalSessions) * 100 : 0;
  }

  private calculateAverageSpeed(sessions: CrawlingSession[]): number {
    if (sessions.length === 0) return 0;

    const completedSessions = sessions.filter(s => s.status === 'completed' && s.endedAt && s.startedAt);
    if (completedSessions.length === 0) return 0;

    const totalDuration = completedSessions.reduce((sum, session) => {
      const duration = session.endedAt.getTime() - session.startedAt.getTime();
      return sum + duration;
    }, 0);

    const averageDurationMs = totalDuration / completedSessions.length;
    return Math.round((1 / (averageDurationMs / 1000)) * 100) / 100; // Operations per second
  }

  private calculateSuccessRate(sessions: CrawlingSession[]): number {
    if (sessions.length === 0) return 0;

    const successfulSessions = sessions.filter(s => s.status === 'completed').length;
    return (successfulSessions / sessions.length) * 100;
  }

  private calculateAverageResponseTime(results: CrawlingResult[]): number {
    if (results.length === 0) return 0;

    const responseTimes = results
      .filter(r => r.responseTime && r.responseTime > 0)
      .map(r => r.responseTime);

    if (responseTimes.length === 0) return 0;

    const totalResponseTime = responseTimes.reduce((sum, time) => sum + time, 0);
    return Math.round((totalResponseTime / responseTimes.length) * 100) / 100;
  }

  private calculateErrorRate(sessions: CrawlingSession[]): number {
    if (sessions.length === 0) return 0;

    const errorSessions = sessions.filter(s => s.status === 'failed' || s.status === 'error').length;
    return (errorSessions / sessions.length) * 100;
  }

  private calculateOverallScore(metrics: {
    adoptionRate: number;
    averageSpeed: number;
    successRate: number;
    averageResponseTime: number;
    errorRate: number;
  }): number {
    const weights = {
      adoptionRate: 0.2,
      speed: 0.25,
      successRate: 0.3,
      responseTime: 0.15,
      errorRate: 0.1,
    };

    // Normalize metrics to 0-100 scale
    const normalizedSpeed = Math.min(metrics.averageSpeed * 10, 100); // Cap at 100
    const normalizedResponseTime = Math.max(100 - (metrics.averageResponseTime / 10), 0); // Lower is better
    const normalizedErrorRate = 100 - metrics.errorRate; // Lower is better

    const score = 
      (metrics.adoptionRate * weights.adoptionRate) +
      (normalizedSpeed * weights.speed) +
      (metrics.successRate * weights.successRate) +
      (normalizedResponseTime * weights.responseTime) +
      (normalizedErrorRate * weights.errorRate);

    return Math.round(score * 100) / 100;
  }

  private getDateRange(period: 'daily' | 'weekly' | 'monthly'): { start: Date; end: Date } {
    const end = new Date();
    const start = new Date();

    switch (period) {
      case 'daily':
        start.setDate(end.getDate() - 1);
        break;
      case 'weekly':
        start.setDate(end.getDate() - 7);
        break;
      case 'monthly':
        start.setDate(end.getDate() - 30);
        break;
    }

    return { start, end };
  }

  async getTopPerformers(limit: number = 10, period: 'daily' | 'weekly' | 'monthly' = 'weekly'): Promise<CrawlerPerformanceMetrics[]> {
    const rankings = await this.getCrawlerRankings(period);
    return rankings.slice(0, limit);
  }

  async getCrawlerRank(crawlerId: string, period: 'daily' | 'weekly' | 'monthly' = 'weekly'): Promise<number> {
    const rankings = await this.getCrawlerRankings(period);
    const crawlerRanking = rankings.find(r => r.crawlerId === crawlerId);
    return crawlerRanking ? crawlerRanking.rank : -1;
  }

  async getCrawlerPerformanceHistory(crawlerId: string, days: number = 30): Promise<CrawlerPerformanceMetrics[]> {
    const history: CrawlerPerformanceMetrics[] = [];
    const endDate = new Date();

    for (let i = 0; i < days; i++) {
      const date = new Date(endDate);
      date.setDate(endDate.getDate() - i);
      
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);

      const metrics = await this.calculateCrawlerMetrics(crawlerId, dayStart, dayEnd);
      history.unshift(metrics);
    }

    return history;
  }

  async getLeaderboardStats(): Promise<{
    totalCrawlers: number;
    activeCrawlers: number;
    totalSessions: number;
    averageScore: number;
  }> {
    const totalCrawlers = await this.crawlerRepository.count();
    const activeCrawlers = await this.crawlerRepository.count({ where: { isActive: true } });
    
    const dateRange = this.getDateRange('weekly');
    const totalSessions = await this.sessionRepository
      .createQueryBuilder('session')
      .where('session.createdAt BETWEEN :startDate AND :endDate', { 
        startDate: dateRange.start, 
        endDate: dateRange.end 
      })
      .getCount();

    const rankings = await this.getCrawlerRankings('weekly');
    const averageScore = rankings.length > 0 
      ? rankings.reduce((sum, r) => sum + r.score, 0) / rankings.length 
      : 0;

    return {
      totalCrawlers,
      activeCrawlers,
      totalSessions,
      averageScore: Math.round(averageScore * 100) / 100,
    };
  }
}