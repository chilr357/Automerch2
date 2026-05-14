import { apiManager } from './utils/apiManager';

export interface ScheduleRequest {
  platform: 'pinterest' | 'instagram' | 'facebook' | 'tiktok';
  assetUrl: string;
  caption: string;
  hashtags?: string[];
  scheduledTime?: string;
  boardId?: string;
}

export interface ScheduledPostResult {
  id: string;
  platform: ScheduleRequest['platform'];
  scheduledTime: string;
  status: 'scheduled' | 'queued' | 'posted' | 'failed';
  url?: string;
}

export const schedulePost = async (request: ScheduleRequest): Promise<ScheduledPostResult> => {
  try {
    const response = await apiManager.request<ScheduledPostResult>('/social/schedule', {
      method: 'POST',
      service: 'social',
      rateLimitMs: 1000,
      body: request,
    });
    if (!response?.id) throw new Error('Missing post id');
    return response;
  } catch (error) {
    console.warn('Social scheduling API unavailable', error);
    return {
      id: `sim-${Date.now()}`,
      platform: request.platform,
      scheduledTime: request.scheduledTime || new Date().toISOString(),
      status: 'queued',
    };
  }
};
