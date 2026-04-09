import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AnalyticsService {
  constructor(private readonly config: ConfigService) {}

  capture(_userId: string, _event: string, _properties?: Record<string, unknown>) {
    // PostHog analytics disabled (posthog-node not installed)
  }
}
