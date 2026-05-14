import { apiManager, ApiError } from './utils/apiManager';
import type { Product } from '../types';

export interface KeywordSuggestion {
  keyword: string;
  searchVolume?: number;
  competition?: number;
  score?: number;
  trend?: 'rising' | 'stable' | 'falling';
}

export interface KeywordResearchContext {
  product: Product;
  prompt?: string;
  seedKeywords?: string[];
}

const suggestionCache = new Map<string, KeywordSuggestion[]>();

const fallbackKeywords = (context: KeywordResearchContext): KeywordSuggestion[] => {
  const base = context.product.type.toLowerCase();
  const promptKeywords = (context.prompt || '')
    .split(/[\s,\n]+/)
    .map(k => k.trim())
    .filter(Boolean)
    .slice(0, 4);

  const unique = new Map<string, KeywordSuggestion>();
  const add = (keyword: string, score = 0.45, trend: KeywordSuggestion['trend'] = 'stable') => {
    if (!keyword) return;
    const normalized = keyword.toLowerCase();
    if (unique.has(normalized)) return;
    unique.set(normalized, { keyword, score, trend });
  };

  add(`${base} gift idea`, 0.52);
  add(`${base} handmade`, 0.48);
  add(`${base} custom`, 0.5);
  add(`${context.product.name} accessory`, 0.44);

  for (const kw of promptKeywords) {
    add(`${kw} ${base}`, 0.6, 'rising');
  }

  (context.seedKeywords || []).forEach(kw => add(kw, 0.55));

  return Array.from(unique.values());
};

export const fetchKeywordSuggestions = async (context: KeywordResearchContext): Promise<KeywordSuggestion[]> => {
  const cacheKey = JSON.stringify({
    productId: context.product.id,
    prompt: context.prompt?.trim() || null,
    seeds: context.seedKeywords || [],
  });

  if (suggestionCache.has(cacheKey)) {
    return suggestionCache.get(cacheKey)!;
  }

  try {
    const response = await apiManager.request<KeywordSuggestion[]>('/keyword-research/suggest', {
      method: 'POST',
      service: 'keyword-research',
      rateLimitMs: 1000,
      body: {
        productType: context.product.type,
        productName: context.product.name,
        prompt: context.prompt,
        seeds: context.seedKeywords,
      },
    });

    if (!Array.isArray(response) || !response.length) {
      throw new Error('Empty keyword response');
    }

    suggestionCache.set(cacheKey, response);
    return response;
  } catch (error) {
    if (error instanceof ApiError && error.status === 429) {
      console.warn('Keyword API rate limit reached, falling back to heuristics');
    } else {
      console.warn('Keyword API unavailable, using fallback', error);
    }
    const fallback = fallbackKeywords(context);
    suggestionCache.set(cacheKey, fallback);
    return fallback;
  }
};
