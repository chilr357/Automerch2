import { apiManager, ApiError } from './utils/apiManager';
import { fetchKeywordSuggestions, type KeywordSuggestion } from './keywordResearchService';
import type { Product } from '../types';

export interface ListingContentContext {
  product: Product;
  prompt?: string;
  keywords?: KeywordSuggestion[];
  mockupUrl?: string | null;
}

export interface ListingContent {
  title: string;
  description: string;
  tags: string[];
  keywords: KeywordSuggestion[];
  source: 'ai' | 'fallback';
}

const listingCache = new Map<string, ListingContent>();

const sanitizeText = (value: string): string =>
  value
    .replace(/\s+/g, ' ')
    .replace(/\s+([.,!?;:])/g, '$1')
    .trim();

const fallbackContent = (context: ListingContentContext, keywords: KeywordSuggestion[]): ListingContent => {
  const prompt = context.prompt?.trim();
  const baseTitle = prompt ? `${context.product.name} – ${prompt}` : `${context.product.name} Custom ${context.product.type}`;
  const descriptionParts = [
    `Discover our ${context.product.type.toLowerCase()} featuring an AI-crafted design inspired by ${prompt || 'your creative vision'}.`,
    'Printed on demand using premium materials with vibrant, long-lasting color.',
    'Perfect for gifts, collectors, and everyday style.',
  ];
  const tags = keywords.map(k => k.keyword.toLowerCase().replace(/\s+/g, '-')).slice(0, 13);

  return {
    title: sanitizeText(baseTitle).slice(0, 140),
    description: descriptionParts.join(' '),
    tags,
    keywords,
    source: 'fallback',
  };
};

const enrichWithKeywords = (base: ListingContent, keywords: KeywordSuggestion[]): ListingContent => {
  const augmentedTags = Array.from(new Set([...base.tags, ...keywords.map(k => k.keyword.replace(/\s+/g, '-').toLowerCase())])).slice(0, 13);
  const keywordLine = `Top keywords: ${keywords.slice(0, 5).map(k => k.keyword).join(', ')}.`;
  const description = base.description.includes('Top keywords:')
    ? base.description
    : `${base.description}\n\n${keywordLine}`;
  return { ...base, tags: augmentedTags, description };
};

export const generateListingTitle = async (context: ListingContentContext, keywords: KeywordSuggestion[]): Promise<string> => {
  try {
    const response = await apiManager.request<{ title: string }>('/ai/content/title', {
      method: 'POST',
      service: 'openai',
      rateLimitMs: 1200,
      body: {
        productType: context.product.type,
        productName: context.product.name,
        prompt: context.prompt,
        keywords: keywords.map(k => k.keyword),
      },
    });
    if (response?.title) {
      return sanitizeText(response.title).slice(0, 140);
    }
    throw new Error('Missing title');
  } catch (error) {
    if (error instanceof ApiError) {
      console.warn('AI title generation failed', error.payload || error.message);
    } else {
      console.warn('AI title generation failed', error);
    }
    return fallbackContent(context, keywords).title;
  }
};

export const generateDescription = async (context: ListingContentContext, keywords: KeywordSuggestion[]): Promise<string> => {
  try {
    const response = await apiManager.request<{ description: string }>('/ai/content/description', {
      method: 'POST',
      service: 'openai',
      rateLimitMs: 1200,
      body: {
        productType: context.product.type,
        productName: context.product.name,
        prompt: context.prompt,
        keywords: keywords.map(k => ({ keyword: k.keyword, score: k.score })),
        mockupUrl: context.mockupUrl,
      },
    });
    if (response?.description) {
      return sanitizeText(response.description).slice(0, 2000);
    }
    throw new Error('Missing description');
  } catch (error) {
    if (error instanceof ApiError) {
      console.warn('AI description generation failed', error.payload || error.message);
    } else {
      console.warn('AI description generation failed', error);
    }
    return fallbackContent(context, keywords).description;
  }
};

export const generateTags = async (context: ListingContentContext, keywords: KeywordSuggestion[]): Promise<string[]> => {
  try {
    const response = await apiManager.request<{ tags: string[] }>('/ai/content/tags', {
      method: 'POST',
      service: 'openai',
      rateLimitMs: 1200,
      body: {
        productType: context.product.type,
        prompt: context.prompt,
        keywords: keywords.map(k => k.keyword),
      },
    });
    if (Array.isArray(response?.tags) && response.tags.length) {
      return response.tags
        .map(tag => tag.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim())
        .filter(Boolean)
        .slice(0, 13);
    }
    throw new Error('Missing tags');
  } catch (error) {
    if (error instanceof ApiError) {
      console.warn('AI tag generation failed', error.payload || error.message);
    } else {
      console.warn('AI tag generation failed', error);
    }
    return fallbackContent(context, keywords).tags;
  }
};

export const validateContent = (content: ListingContent): { valid: boolean; issues: string[] } => {
  const issues: string[] = [];
  if (!content.title || content.title.length < 5) issues.push('Title is too short.');
  if (!content.description || content.description.length < 40) issues.push('Description should describe materials, use cases, and fulfillment details.');
  if (!content.tags.length) issues.push('At least one tag is required.');
  return { valid: issues.length === 0, issues };
};

export const buildListingContent = async (context: ListingContentContext): Promise<ListingContent> => {
  const cacheKey = JSON.stringify({
    productId: context.product.id,
    prompt: context.prompt || '',
  });

  if (listingCache.has(cacheKey)) {
    return listingCache.get(cacheKey)!;
  }

  const keywords = context.keywords || await fetchKeywordSuggestions({
    product: context.product,
    prompt: context.prompt,
  });

  const fallback = fallbackContent(context, keywords);

  try {
    const [title, description, tags] = await Promise.all([
      generateListingTitle(context, keywords),
      generateDescription(context, keywords),
      generateTags(context, keywords),
    ]);

    const payload: ListingContent = enrichWithKeywords({
      title,
      description,
      tags,
      keywords,
      source: 'ai',
    }, keywords);

    const validation = validateContent(payload);
    const finalContent = validation.valid ? payload : fallback;
    listingCache.set(cacheKey, finalContent);
    return finalContent;
  } catch (error) {
    console.warn('Falling back to heuristic listing content', error);
    listingCache.set(cacheKey, fallback);
    return fallback;
  }
};

export const resetListingContentCache = () => listingCache.clear();
