import {
  Injectable,
  NestMiddleware,
  Logger,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ApiBudgetService } from '../services/api-budget.service';

@Injectable()
export class ApiBudgetMiddleware implements NestMiddleware {
  private readonly logger = new Logger(ApiBudgetMiddleware.name);

  constructor(private readonly apiBudgetService: ApiBudgetService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    // Skip budget check for non-AI endpoints
    if (!req.path.includes('/api/plan') && !req.path.includes('/api/ai')) {
      return next();
    }

    const userId = (req as any).user?.id || 'anonymous';
    const rawIp =
      req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const ipAddress = (Array.isArray(rawIp) ? rawIp[0] : rawIp) ?? 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    try {
      // Check if user has exceeded daily limit
      const dailyLimit = await this.apiBudgetService.checkDailyLimit(
        userId,
        ipAddress,
      );
      if (!dailyLimit.allowed) {
        this.logger.warn(
          `Daily limit exceeded for user ${userId} from IP ${ipAddress}`,
        );
        throw new HttpException(
          {
            message: 'Daily AI request limit reached',
            limit: dailyLimit.limit,
            used: dailyLimit.used,
            resetTime: dailyLimit.resetTime,
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      // Check monthly budget
      const monthlyBudget = await this.apiBudgetService.checkMonthlyBudget();
      if (!monthlyBudget.withinBudget) {
        this.logger.warn(
          `Monthly API budget exceeded: $${monthlyBudget.used}/${monthlyBudget.budget}`,
        );
        throw new HttpException(
          {
            message:
              'Monthly API budget exhausted. Service will resume next month.',
            budget: monthlyBudget.budget,
            used: monthlyBudget.used,
            remaining: monthlyBudget.remaining,
          },
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }

      // Estimate API cost for this request
      const estimatedCost = this.estimateRequestCost(req);

      // Track the request
      await this.apiBudgetService.trackRequest(
        userId,
        ipAddress,
        userAgent,
        estimatedCost,
      );

      // Add budget headers to response
      res.setHeader('X-API-Daily-Limit', dailyLimit.limit);
      res.setHeader('X-API-Daily-Used', dailyLimit.used);
      res.setHeader('X-API-Daily-Reset', dailyLimit.resetTime.toISOString());
      res.setHeader('X-API-Monthly-Budget', monthlyBudget.budget.toFixed(2));
      res.setHeader('X-API-Monthly-Used', monthlyBudget.used.toFixed(2));
      res.setHeader(
        'X-API-Monthly-Remaining',
        monthlyBudget.remaining.toFixed(2),
      );

      next();
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(`API budget middleware error: ${error.message}`);
      // Allow request to proceed if budget service fails (fail-open for availability)
      next();
    }
  }

  private estimateRequestCost(req: Request): number {
    // Estimate cost based on request characteristics
    // OpenRouter pricing: ~$0.0001 per 1K tokens for gemma-2b

    if (req.path.includes('/api/plan') && req.method === 'POST') {
      // Plan creation: more expensive
      return 0.01; // ~$0.01 per plan creation
    } else if (req.path.includes('/api/ai')) {
      // Direct AI calls: less expensive
      return 0.005; // ~$0.005 per AI call
    }

    return 0.001; // Default small cost
  }
}
