import { CrawlerPerformance, CrawlerConfig } from '../types/crawler';

export interface EvolutionConfig {
  populationSize: number;
  eliteRatio: number;
  mutationRate: number;
  crossoverRate: number;
  resetThreshold: number;
  generationInterval: number;
}

export interface CrawlerGenes {
  requestDelay: number;
  maxRetries: number;
  timeout: number;
  concurrency: number;
  userAgentRotation: boolean;
  proxyRotation: boolean;
  respectRobotsTxt: boolean;
  maxDepth: number;
  followRedirects: boolean;
  parserId: string;
}

export class CrawlerEvolution {
  private config: EvolutionConfig;
  private generation: number = 0;
  private population: Map<string, CrawlerGenes> = new Map();
  private performanceHistory: Map<string, CrawlerPerformance[]> = new Map();

  constructor(config: EvolutionConfig) {
    this.config = config;
  }

  initializePopulation(crawlerConfigs: Map<string, CrawlerConfig>): void {
    this.population.clear();
    
    for (const [crawlerId, config] of crawlerConfigs) {
      this.population.set(crawlerId, this.configToGenes(config));
      this.performanceHistory.set(crawlerId, []);
    }
  }

  evolveGeneration(performances: Map<string, CrawlerPerformance>): Map<string, CrawlerConfig> {
    // Update performance history
    for (const [crawlerId, performance] of performances) {
      const history = this.performanceHistory.get(crawlerId) || [];
      history.push(performance);
      
      // Keep only recent history
      if (history.length > 10) {
        history.shift();
      }
      
      this.performanceHistory.set(crawlerId, history);
    }

    // Calculate fitness scores
    const fitnessScores = this.calculateFitness(performances);
    
    // Sort crawlers by fitness
    const sortedCrawlers = Array.from(fitnessScores.entries())
      .sort(([, a], [, b]) => b - a);

    // Reset underperforming crawlers
    this.resetUnderperformers(sortedCrawlers);

    // Clone and mutate top performers
    this.cloneAndMutateElite(sortedCrawlers);

    // Apply crossover
    this.applyCrossover(sortedCrawlers);

    this.generation++;

    return this.populationToConfigs();
  }

  private calculateFitness(performances: Map<string, CrawlerPerformance>): Map<string, number> {
    const fitness = new Map<string, number>();
    
    for (const [crawlerId, performance] of performances) {
      const score = this.calculateFitnessScore(performance);
      fitness.set(crawlerId, score);
    }

    return fitness;
  }

  private calculateFitnessScore(performance: CrawlerPerformance): number {
    const {
      successRate,
      avgResponseTime,
      throughput,
      errorRate,
      resourceUsage,
      dataQuality
    } = performance;

    // Weighted fitness calculation
    const weights = {
      successRate: 0.25,
      speed: 0.20, // inverse of response time
      throughput: 0.20,
      reliability: 0.15, // inverse of error rate
      efficiency: 0.10, // inverse of resource usage
      quality: 0.10
    };

    const normalizedSpeed = Math.max(0, 1 - (avgResponseTime / 10000)); // normalize to 0-1
    const normalizedEfficiency = Math.max(0, 1 - (resourceUsage.cpu / 100));
    const normalizedReliability = Math.max(0, 1 - errorRate);

    return (
      successRate * weights.successRate +
      normalizedSpeed * weights.speed +
      throughput * weights.throughput +
      normalizedReliability * weights.reliability +
      normalizedEfficiency * weights.efficiency +
      dataQuality * weights.quality
    );
  }

  private resetUnderperformers(sortedCrawlers: [string, number][]): void {
    const resetCount = Math.floor(sortedCrawlers.length * (1 - this.config.eliteRatio));
    const toReset = sortedCrawlers.slice(-resetCount);

    for (const [crawlerId, fitness] of toReset) {
      if (fitness < this.config.resetThreshold) {
        // Reset to random genes
        this.population.set(crawlerId, this.generateRandomGenes());
        
        // Clear performance history
        this.performanceHistory.set(crawlerId, []);
      }
    }
  }

  private cloneAndMutateElite(sortedCrawlers: [string, number][]): void {
    const eliteCount = Math.floor(sortedCrawlers.length * this.config.eliteRatio);
    const elite = sortedCrawlers.slice(0, eliteCount);

    // Clone elite performers to replace some underperformers
    for (let i = 0; i < elite.length && i < sortedCrawlers.length - eliteCount; i++) {
      const [eliteCrawlerId] = elite[i];
      const [targetCrawlerId] = sortedCrawlers[sortedCrawlers.length - 1 - i];
      
      const eliteGenes = this.population.get(eliteCrawlerId)!;
      const mutatedGenes = this.mutateGenes({ ...eliteGenes });
      
      this.population.set(targetCrawlerId, mutatedGenes);
    }
  }

  private applyCrossover(sortedCrawlers: [string, number][]): void {
    const eliteCount = Math.floor(sortedCrawlers.length * this.config.eliteRatio);
    
    for (let i = eliteCount; i < sortedCrawlers.length; i++) {
      if (Math.random() < this.config.crossoverRate) {
        const [crawlerId] = sortedCrawlers[i];
        
        // Select two elite parents
        const parent1Id = sortedCrawlers[Math.floor(Math.random() * eliteCount)][0];
        const parent2Id = sortedCrawlers[Math.floor(Math.random() * eliteCount)][0];
        
        const parent1 = this.population.get(parent1Id)!;
        const parent2 = this.population.get(parent2Id)!;
        
        const offspring = this.crossoverGenes(parent1, parent2);
        this.population.set(crawlerId, offspring);
      }
    }
  }

  private mutateGenes(genes: CrawlerGenes): CrawlerGenes {
    const mutated = { ...genes };

    if (Math.random() < this.config.mutationRate) {
      mutated.requestDelay = Math.max(100, Math.min(5000, 
        mutated.requestDelay + (Math.random() - 0.5) * 1000));
    }

    if (Math.random() < this.config.mutationRate) {
      mutated.maxRetries = Math.max(1, Math.min(10, 
        mutated.maxRetries + Math.floor((Math.random() - 0.5) * 4)));
    }

    if (Math.random() < this.config.mutationRate) {
      mutated.timeout = Math.max(5000, Math.min(60000, 
        mutated.timeout + (Math.random() - 0.5) * 10000));
    }

    if (Math.random() < this.config.mutationRate) {
      mutated.concurrency = Math.max(1, Math.min(20, 
        mutated.concurrency + Math.floor((Math.random() - 0.5) * 4)));
    }

    if (Math.random() < this.config.mutationRate) {
      mutated.maxDepth = Math.max(1, Math.min(10, 
        mutated.maxDepth + Math.floor((Math.random() - 0.5) * 2)));
    }

    // Boolean mutations
    if (Math.random() < this.config.mutationRate) {
      mutated.userAgentRotation = !mutated.userAgentRotation;
    }

    if (Math.random() < this.config.mutationRate) {
      mutated.proxyRotation = !mutated.proxyRotation;
    }

    if (Math.random() < this.config.mutationRate) {
      mutated.respectRobotsTxt = !mutated.respectRobotsTxt;
    }

    if (Math.random() < this.config.mutationRate) {
      mutated.followRedirects = !mutated.followRedirects;
    }

    return mutated;
  }

  private crossoverGenes(parent1: CrawlerGenes, parent2: CrawlerGenes): CrawlerGenes {
    return {
      requestDelay: Math.random() < 0.5 ? parent1.requestDelay : parent2.requestDelay,
      maxRetries: Math.random() < 0.5 ? parent1.maxRetries : parent2.maxRetries,
      timeout: Math.random() < 0.5 ? parent1.timeout : parent2.timeout,
      concurrency: Math.random() < 0.5 ? parent1.concurrency : parent2.concurrency,
      userAgentRotation: Math.random() < 0.5 ? parent1.userAgentRotation : parent2.userAgentRotation,
      proxyRotation: Math.random() < 0.5 ? parent1.proxyRotation : parent2.proxyRotation,
      respectRobotsTxt: Math.random() < 0.5 ? parent1.respectRobotsTxt : parent2.respectRobotsTxt,
      maxDepth: Math.random() < 0.5 ? parent1.maxDepth : parent2.maxDepth,
      followRedirects: Math.random() < 0.5 ? parent1.followRedirects : parent2.followRedirects,
      parserId: Math.random() < 0.5 ? parent1.parserId : parent2.parserId
    };
  }

  private generateRandomGenes(): CrawlerGenes {
    const parserIds = ['html', 'json', 'xml', 'csv'];
    
    return {
      requestDelay: Math.floor(Math.random() * 4900) + 100, // 100-5000ms
      maxRetries: Math.floor(Math.random() * 9) + 1, // 1-10
      timeout: Math.floor(Math.random() * 55000) + 5000, // 5-60 seconds
      concurrency: Math.floor(Math.random() * 19) + 1, // 1-20
      userAgentRotation: Math.random() < 0.7,
      proxyRotation: Math.random() < 0.3,
      respectRobotsTxt: Math.random() < 0.8,
      maxDepth: Math.floor(Math.random() * 9) + 1, // 1-10
      followRedirects: Math.random() < 0.9,
      parserId: parserIds[Math.floor(Math.random() * parserIds.length)]
    };
  }

  private configToGenes(config: CrawlerConfig): CrawlerGenes {
    return {
      requestDelay: config.requestDelay || 1000,
      maxRetries: config.maxRetries || 3,
      timeout: config.timeout || 30000,
      concurrency: config.concurrency || 5,
      userAgentRotation: config.userAgentRotation || false,
      proxyRotation: config.proxyRotation || false,
      respectRobotsTxt: config.respectRobotsTxt || true,
      maxDepth: config.maxDepth || 5,
      followRedirects: config.followRedirects || true,
      parserId: config.parserId || 'html'
    };
  }

  private populationToConfigs(): Map<string, CrawlerConfig> {
    const configs = new Map<string, CrawlerConfig>();

    for (const [crawlerId, genes] of this.population) {
      configs.set(crawlerId, this.genesToConfig(genes));
    }

    return configs;
  }

  private genesToConfig(genes: CrawlerGenes): CrawlerConfig {
    return {
      requestDelay: genes.requestDelay,
      maxRetries: genes.maxRetries,
      timeout: genes.timeout,
      concurrency: genes.concurrency,
      userAgentRotation: genes.userAgentRotation,
      proxyRotation: genes.proxyRotation,
      respectRobotsTxt: genes.respectRobotsTxt,
      maxDepth: genes.maxDepth,
      followRedirects: genes.followRedirects,
      parserId: genes.parserId
    };
  }

  getGenerationInfo() {
    return {
      generation: this.generation,
      populationSize: this.population.size,
      config: this.config
    };
  }

  getPopulationStats() {
    const stats = {
      avgRequestDelay: 0,
      avgConcurrency: 0,
      avgMaxRetries: 0,
      avgTimeout: 0,
      userAgentRotationRatio: 0,
      proxyRotationRatio: 0
    };

    const genes = Array.from(this.population.values());
    
    if (genes.length === 0) return stats;

    stats.avgRequestDelay = genes.reduce((sum, g) => sum + g.requestDelay, 0) / genes.length;
    stats.avgConcurrency = genes.reduce((sum, g) => sum + g.concurrency, 0) / genes.length;
    stats.avgMaxRetries = genes.reduce((sum, g) => sum + g.maxRetries, 0) / genes.length;
    stats.avgTimeout = genes.reduce((sum, g) => sum + g.timeout, 0) / genes.length;
    stats.userAgentRotationRatio = genes.filter(g => g.userAgentRotation).length / genes.length;
    stats.proxyRotationRatio = genes.filter(g => g.proxyRotation).length / genes.length;

    return stats;
  }
}