import { Injectable } from '@nestjs/common';
import { BetaAnalyticsDataClient } from '@google-analytics/data';

type Ga4Summary = {
  todayActiveUsers: number;
  sevenDaySessions: number;
  thirtyDayBounceRate: number;
};

type Ga4TrendPoint = {
  date: string;
  activeUsers: number;
};

type Ga4TopPage = {
  path: string;
  views: number;
};

type Ga4Acquisition = {
  channel: string;
  sessions: number;
};

export type OpsGa4Response = {
  configured: boolean;
  available: boolean;
  error?: string;
  summary: Ga4Summary;
  trend: Ga4TrendPoint[];
  topPages: Ga4TopPage[];
  acquisition: Ga4Acquisition[];
};

type CachedGa4Entry<T> = {
  expiresAt: number;
  data: T;
};

const GA4_SUMMARY_CACHE_TTL_MS = 5 * 60 * 1000;
const GA4_DETAIL_CACHE_TTL_MS = 15 * 60 * 1000;

const emptySummary: Ga4Summary = {
  todayActiveUsers: 0,
  sevenDaySessions: 0,
  thirtyDayBounceRate: 0,
};

function readMetricValue(
  row:
    | { metricValues?: Array<{ value?: string | null }> | null }
    | null
    | undefined,
  index: number,
) {
  return Number(row?.metricValues?.[index]?.value ?? 0);
}

function readDimensionValue(
  row:
    | { dimensionValues?: Array<{ value?: string | null }> | null }
    | null
    | undefined,
  index: number,
) {
  return row?.dimensionValues?.[index]?.value ?? '';
}

function formatGa4Date(value: string) {
  if (value.length !== 8) return value;
  return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
}

@Injectable()
export class GA4Service {
  private summaryCache: CachedGa4Entry<Ga4Summary> | null = null;
  private trendCache: CachedGa4Entry<Ga4TrendPoint[]> | null = null;
  private topPagesCache: CachedGa4Entry<Ga4TopPage[]> | null = null;
  private acquisitionCache: CachedGa4Entry<Ga4Acquisition[]> | null = null;

  private get propertyId() {
    const id = process.env.GA4_PROPERTY_ID?.trim();
    if (!id) return undefined;
    return id.startsWith('properties/') ? id : `properties/${id}`;
  }

  private getCredentials() {
    const clientEmail = process.env.GA4_CLIENT_EMAIL?.trim();
    const privateKey = process.env.GA4_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (!clientEmail || !privateKey) return null;

    return {
      client_email: clientEmail,
      private_key: privateKey,
    };
  }

  private get configured() {
    return Boolean(this.propertyId && this.getCredentials());
  }

  private createClient() {
    const credentials = this.getCredentials();
    const property = this.propertyId;

    if (!credentials || !property) return null;

    return {
      property,
      client: new BetaAnalyticsDataClient({ credentials }),
    };
  }

  async getSummary(): Promise<Ga4Summary> {
    if (this.summaryCache && this.summaryCache.expiresAt > Date.now()) {
      return this.summaryCache.data;
    }

    const ga4 = this.createClient();
    if (!ga4) return emptySummary;

    const [todayResponse] = await ga4.client.runReport({
      property: ga4.property,
      dateRanges: [{ startDate: 'today', endDate: 'today' }],
      metrics: [{ name: 'activeUsers' }],
    });
    const [sevenDayResponse] = await ga4.client.runReport({
      property: ga4.property,
      dateRanges: [{ startDate: '6daysAgo', endDate: 'today' }],
      metrics: [{ name: 'sessions' }],
    });
    const [thirtyDayResponse] = await ga4.client.runReport({
      property: ga4.property,
      dateRanges: [{ startDate: '29daysAgo', endDate: 'today' }],
      metrics: [{ name: 'bounceRate' }],
    });

    const data = {
      todayActiveUsers: readMetricValue(todayResponse.rows?.[0], 0),
      sevenDaySessions: readMetricValue(sevenDayResponse.rows?.[0], 0),
      thirtyDayBounceRate: readMetricValue(thirtyDayResponse.rows?.[0], 0),
    };

    this.summaryCache = {
      expiresAt: Date.now() + GA4_SUMMARY_CACHE_TTL_MS,
      data,
    };

    return data;
  }

  async getTrend(): Promise<Ga4TrendPoint[]> {
    if (this.trendCache && this.trendCache.expiresAt > Date.now()) {
      return this.trendCache.data;
    }

    const ga4 = this.createClient();
    if (!ga4) return [];

    const [response] = await ga4.client.runReport({
      property: ga4.property,
      dateRanges: [{ startDate: '29daysAgo', endDate: 'today' }],
      dimensions: [{ name: 'date' }],
      metrics: [{ name: 'activeUsers' }],
      orderBys: [{ dimension: { dimensionName: 'date' } }],
    });

    const data =
      response.rows?.map((row) => ({
        date: formatGa4Date(readDimensionValue(row, 0)),
        activeUsers: readMetricValue(row, 0),
      })) ?? [];

    this.trendCache = {
      expiresAt: Date.now() + GA4_DETAIL_CACHE_TTL_MS,
      data,
    };

    return data;
  }

  async getTopPages(): Promise<Ga4TopPage[]> {
    if (this.topPagesCache && this.topPagesCache.expiresAt > Date.now()) {
      return this.topPagesCache.data;
    }

    const ga4 = this.createClient();
    if (!ga4) return [];

    const [response] = await ga4.client.runReport({
      property: ga4.property,
      dateRanges: [{ startDate: '29daysAgo', endDate: 'today' }],
      dimensions: [{ name: 'pagePath' }],
      metrics: [{ name: 'screenPageViews' }],
      limit: 10,
      orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
    });

    const data =
      response.rows?.map((row) => ({
        path: readDimensionValue(row, 0) || '/',
        views: readMetricValue(row, 0),
      })) ?? [];

    this.topPagesCache = {
      expiresAt: Date.now() + GA4_DETAIL_CACHE_TTL_MS,
      data,
    };

    return data;
  }

  async getAcquisition(): Promise<Ga4Acquisition[]> {
    if (this.acquisitionCache && this.acquisitionCache.expiresAt > Date.now()) {
      return this.acquisitionCache.data;
    }

    const ga4 = this.createClient();
    if (!ga4) return [];

    const [response] = await ga4.client.runReport({
      property: ga4.property,
      dateRanges: [{ startDate: '29daysAgo', endDate: 'today' }],
      dimensions: [{ name: 'sessionDefaultChannelGroup' }],
      metrics: [{ name: 'sessions' }],
      limit: 10,
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
    });

    const data =
      response.rows?.map((row) => ({
        channel: readDimensionValue(row, 0) || 'Unassigned',
        sessions: readMetricValue(row, 0),
      })) ?? [];

    this.acquisitionCache = {
      expiresAt: Date.now() + GA4_DETAIL_CACHE_TTL_MS,
      data,
    };

    return data;
  }

  async getOverview(): Promise<OpsGa4Response> {
    if (!this.configured) {
      return {
        configured: false,
        available: false,
        error: 'GA4가 설정되지 않았습니다.',
        summary: emptySummary,
        trend: [],
        topPages: [],
        acquisition: [],
      };
    }

    try {
      const [summary, trend, topPages, acquisition] = await Promise.all([
        this.getSummary(),
        this.getTrend(),
        this.getTopPages(),
        this.getAcquisition(),
      ]);

      return {
        configured: true,
        available: true,
        summary,
        trend,
        topPages,
        acquisition,
      };
    } catch (error) {
      return {
        configured: true,
        available: false,
        error:
          error instanceof Error
            ? error.message
            : 'GA4 Data API 요청에 실패했습니다.',
        summary: emptySummary,
        trend: [],
        topPages: [],
        acquisition: [],
      };
    }
  }
}
