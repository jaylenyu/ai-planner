import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PostHog } from 'posthog-node';

@Injectable()
export class AnalyticsService {
  private readonly client: PostHog | null;

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.get<string>('POSTHOG_API_KEY');
    this.client = apiKey
      ? new PostHog(apiKey, { host: 'https://app.posthog.com' })
      : null;
  }

  capture(userId: string, event: string, properties?: Record<string, unknown>) {
    if (!this.client) return;
    this.client.capture({ distinctId: userId, event, properties });
  }
}
