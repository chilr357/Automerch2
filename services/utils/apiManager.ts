export interface ApiRequestOptions<TBody = unknown> {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  body?: TBody;
  service?: string;
  rateLimitMs?: number;
  timeoutMs?: number;
  parseJson?: boolean;
}

export interface ApiManagerConfig {
  baseUrl?: string;
  defaultHeaders?: Record<string, string>;
}

export class ApiError extends Error {
  public readonly status: number;
  public readonly payload: unknown;
  public readonly service?: string;

  constructor(message: string, status: number, payload: unknown, service?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
    this.service = service;
  }
}

class ApiManager {
  private readonly baseUrl: string;
  private readonly defaultHeaders: Record<string, string>;
  private readonly lastCallMap = new Map<string, number>();

  constructor(config?: ApiManagerConfig) {
    const envBase = (() => {
      try {
        const explicit = (import.meta as any).env?.VITE_API_BASE;
        if (explicit && String(explicit).trim()) return String(explicit).trim().replace(/\/$/, '');
      } catch {}
      return '';
    })();

    this.baseUrl = (config?.baseUrl || envBase || '') || '';
    this.defaultHeaders = config?.defaultHeaders || { 'Content-Type': 'application/json' };
  }

  private getEnv(key: string): string | undefined {
    try {
      const value = (import.meta as any).env?.[key];
      if (value && String(value).trim()) return String(value);
    } catch {}
    return undefined;
  }

  private getServiceHeaders(service?: string): Record<string, string> {
    if (!service) return {};

    const headers: Record<string, string> = {};
    const setIfValue = (key: string, value?: string) => {
      if (value) headers[key] = value;
    };

    switch (service) {
      case 'openai': {
        const key = this.getEnv('VITE_OPENAI_API_KEY');
        setIfValue('Authorization', key ? `Bearer ${key}` : undefined);
        break;
      }
      case 'keyword-research': {
        setIfValue('x-everbee-api-key', this.getEnv('VITE_EVERBEE_API_KEY'));
        setIfValue('x-erank-api-key', this.getEnv('VITE_ERANK_API_KEY'));
        break;
      }
      case 'etsy': {
        setIfValue('x-etsy-api-key', this.getEnv('VITE_ETSY_API_KEY'));
        setIfValue('x-etsy-api-secret', this.getEnv('VITE_ETSY_API_SECRET'));
        setIfValue('x-etsy-access-token', this.getEnv('VITE_ETSY_ACCESS_TOKEN'));
        setIfValue('x-etsy-refresh-token', this.getEnv('VITE_ETSY_REFRESH_TOKEN'));
        break;
      }
      case 'social': {
        setIfValue('x-pinterest-token', this.getEnv('VITE_PINTEREST_ACCESS_TOKEN'));
        setIfValue('x-outfy-key', this.getEnv('VITE_OUTFY_API_KEY'));
        setIfValue('x-nuelink-key', this.getEnv('VITE_NUELINK_API_KEY'));
        setIfValue('x-ayrshare-key', this.getEnv('VITE_AYRSHARE_API_KEY'));
        break;
      }
      case 'support': {
        setIfValue('x-support-bot-key', this.getEnv('VITE_SUPPORT_BOT_API_KEY'));
        setIfValue('x-openai-key', this.getEnv('VITE_OPENAI_API_KEY'));
        break;
      }
      case 'analytics': {
        setIfValue('x-analytics-api-key', this.getEnv('VITE_ANALYTICS_API_KEY'));
        setIfValue('x-ayrshare-key', this.getEnv('VITE_AYRSHARE_API_KEY'));
        break;
      }
      default: {
        break;
      }
    }

    return headers;
  }

  private buildUrl(path: string): string {
    if (/^https?:\/\//i.test(path)) return path;
    const normalized = path.startsWith('/') ? path : `/${path}`;
    if (!this.baseUrl) return normalized;
    return this.baseUrl.endsWith('/api') ? `${this.baseUrl}${normalized}` : `${this.baseUrl}/api${normalized}`;
  }

  private enforceRateLimit(service?: string, rateLimitMs?: number) {
    if (!service || !rateLimitMs || rateLimitMs <= 0) return;
    const now = Date.now();
    const lastCall = this.lastCallMap.get(service) || 0;
    const delta = now - lastCall;
    if (delta < rateLimitMs) {
      throw new ApiError(`Rate limit exceeded for ${service}. Try again in ${Math.ceil((rateLimitMs - delta) / 1000)}s`, 429, null, service);
    }
    this.lastCallMap.set(service, now);
  }

  async request<TResponse = any, TBody = unknown>(path: string, options: ApiRequestOptions<TBody> = {}): Promise<TResponse> {
    const { method = 'GET', headers, body, service, rateLimitMs, timeoutMs = 30000, parseJson = true } = options;

    this.enforceRateLimit(service, rateLimitMs);

    const controller = typeof AbortController !== 'undefined' ? new AbortController() : undefined;
    const timeoutId = timeoutMs && controller ? setTimeout(() => controller.abort(), timeoutMs) : undefined;

    try {
      const serviceHeaders = this.getServiceHeaders(service);
      const finalHeaders: Record<string, string> = { ...this.defaultHeaders, ...serviceHeaders, ...(headers || {}) };
      const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
      if (isFormData && finalHeaders['Content-Type']) delete finalHeaders['Content-Type'];
      const requestBody = body && !isFormData && finalHeaders['Content-Type'] === 'application/json' && typeof body !== 'string'
        ? JSON.stringify(body)
        : (body as any);

      const response = await fetch(this.buildUrl(path), {
        method,
        headers: finalHeaders,
        body: requestBody,
        signal: controller?.signal,
      });

      if (!response.ok) {
        let payload: any = null;
        try {
          payload = await response.clone().json();
        } catch {
          payload = await response.text().catch(() => null);
        }
        throw new ApiError(`API request failed with status ${response.status}`, response.status, payload, service);
      }

      if (!parseJson) {
        return await response.text() as any;
      }

      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        return await response.json() as TResponse;
      }
      return await response.text() as any;
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  }
}

export const apiManager = new ApiManager();
