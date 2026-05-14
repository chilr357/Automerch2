import { apiManager } from './utils/apiManager';

export interface MetricPoint {
  timestamp: string;
  value: number;
}

export interface ListingPerformance {
  listingId: string;
  views: number;
  favorites: number;
  conversions: number;
  revenue: number;
  trend: MetricPoint[];
}

export interface AnalyticsSnapshot {
  listings: ListingPerformance[];
  socialClicks: number;
  responseTimeMinutes: number;
  generatedAt: string;
}

export const fetchAnalyticsSnapshot = async (): Promise<AnalyticsSnapshot | null> => {
  try {
    const response = await apiManager.request<AnalyticsSnapshot>('/analytics/snapshot', {
      method: 'GET',
      service: 'analytics',
      rateLimitMs: 2000,
    });
    if (!response?.generatedAt) throw new Error('Invalid analytics payload');
    return response;
  } catch (error) {
    console.warn('Analytics API unavailable', error);
    return null;
  }
};
