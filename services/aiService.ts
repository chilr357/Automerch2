/**
 * AI Service - Main orchestrator for AI image generation
 * Handles auto-detection of anime content and routes to appropriate AI provider
 */

import { generateImageWithOpenAI } from './openaiService';
import { generateImageWithMidjourney } from './midjourneyService';
import { isGrokConfigured } from './grokService';
import { ANIME_KEYWORDS } from '../constants';

export type AIProvider = 'openai' | 'midjourney' | 'grok' | 'gemini' | 'perplexity';
export type EngineType = 'Standard' | 'Anime';

export interface AIGenerationOptions {
  prompt: string;
  provider?: AIProvider;
  size?: '1024x1024' | '1792x1024' | '1024x1792';
  quality?: 'standard' | 'hd' | 'high';
  style?: 'vivid' | 'natural';
}

export interface AIGenerationResult {
  imageUrl: string;
  provider: AIProvider;
  engine: EngineType;
  prompt: string;
  cost?: number;
  data?: string;
}

/**
 * Detects if a prompt contains anime-related keywords
 */
export const detectAnimeContent = (prompt: string): boolean => {
  const promptLower = prompt.toLowerCase();
  return ANIME_KEYWORDS.some(keyword => promptLower.includes(keyword));
};

/**
 * Determines the best AI provider based on prompt content
 */
export const selectAIProvider = (prompt: string, preferredProvider?: AIProvider): AIProvider => {
  // If user explicitly chooses a provider, use it
  if (preferredProvider) {
    return preferredProvider;
  }

  // Auto-detect anime content
  const isAnime = detectAnimeContent(prompt);
  
  if (isAnime) {
    return 'midjourney'; // Use Midjourney Niji for anime
  }

  // Respect default provider from env when present
  let envDefault: AIProvider | undefined;
  try {
    const v = (import.meta as any).env?.VITE_DEFAULT_AI_PROVIDER;
    if (v && typeof v === 'string') envDefault = v as AIProvider;
  } catch {}

  if (envDefault === 'grok' && isGrokConfigured()) return 'grok';
  if (envDefault && envDefault !== 'grok') return envDefault;

  // Otherwise, prefer Grok when configured, else OpenAI
  if (isGrokConfigured()) return 'grok';
  return 'openai';
};

/**
 * Generates an image using the most appropriate AI provider
 */
export const generateImage = async (options: AIGenerationOptions): Promise<AIGenerationResult> => {
  const { prompt, provider, size = '1024x1024', quality = 'standard', style = 'vivid' } = options;
  
  // Determine the best provider
  const selectedProvider = selectAIProvider(prompt, provider);
  const isAnime = detectAnimeContent(prompt);
  const engine: EngineType = isAnime ? 'Anime' : 'Standard';

  try {
    let imageUrl: string;
    let cost: number | undefined;

    switch (selectedProvider) {
      case 'openai':
        imageUrl = await generateImageWithOpenAI({
          prompt,
          size,
          quality: quality as 'standard' | 'hd',
          style: style as 'vivid' | 'natural',
        });
        cost = 0.04; // Approximate cost per image
        break;

      case 'midjourney':
        imageUrl = await generateImageWithMidjourney({
          prompt,
          model: isAnime ? 'niji' : 'midjourney',
          aspect_ratio: size === '1024x1024' ? '1:1' : size === '1792x1024' ? '16:9' : '9:16',
          quality: quality === 'hd' ? 'high' : 'standard',
        });
        cost = 0.05; // Approximate cost per image
        break;

      case 'grok':
        {
          const { generateImageWithGrok } = await import('./grokService');
          imageUrl = await generateImageWithGrok({ prompt, size, quality: quality as any, style: style as any });
          cost = 0.04; // Approximate cost per image
          break;
        }

      case 'gemini':
        // Fallback to Gemini if other providers fail
        const { generateImage: generateGeminiImage } = await import('./geminiService');
        imageUrl = await generateGeminiImage(prompt, engine);
        cost = 0.02; // Approximate cost per image
        break;

      case 'perplexity':
        {
          const { fetchAnimeSceneDataset } = await import('./perplexityService');
          const scenes = await fetchAnimeSceneDataset();
          return {
            imageUrl: '',
            provider: 'perplexity',
            engine,
            prompt,
            data: JSON.stringify(scenes, null, 2),
          };
        }

      default:
        throw new Error(`Unsupported AI provider: ${selectedProvider}`);
    }

    return {
      imageUrl,
      provider: selectedProvider,
      engine,
      prompt,
      cost,
    };
  } catch (error) {
    console.error(`Error generating image with ${selectedProvider}:`, error);

    // When Perplexity is requested we do not fallback to other providers.
    if (selectedProvider === 'perplexity') {
      throw error instanceof Error ? error : new Error('Perplexity generation failed');
    }

    // Optional fallback to Grok (if configured) then Gemini
    if (selectedProvider !== 'grok' && isGrokConfigured()) {
      console.log('Falling back to Grok...');
      try {
        const { generateImageWithGrok } = await import('./grokService');
        const imageUrl = await generateImageWithGrok({ prompt, size, quality: quality as any, style: style as any });
        return {
          imageUrl,
          provider: 'grok',
          engine,
          prompt,
          cost: 0.04,
        };
      } catch (grokErr) {
        console.error('Grok fallback also failed:', grokErr);
      }
    }

    if (selectedProvider !== 'gemini') {
      console.log('Falling back to Gemini...');
      try {
        const { generateImage: generateGeminiImage } = await import('./geminiService');
        const imageUrl = await generateGeminiImage(prompt, engine);
        
        return {
          imageUrl,
          provider: 'gemini',
          engine,
          prompt,
          cost: 0.02,
        };
      } catch (fallbackError) {
        console.error('Gemini fallback also failed:', fallbackError);
      }
    }
    
    throw new Error(`Failed to generate image: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Get available AI providers and their capabilities
 */
export const getAIProviders = () => {
  return [
    {
      id: 'openai',
      name: 'OpenAI DALL-E 3',
      description: 'High-quality general purpose image generation',
      bestFor: ['General designs', 'Realistic images', 'Abstract art'],
      cost: '$0.04 per image',
      maxSize: '1792x1024',
    },
    {
      id: 'grok',
      name: 'Grok',
      description: 'Alternative provider (configurable endpoint)',
      bestFor: ['General designs'],
      cost: '$0.04 per image (approx.)',
      maxSize: '1792x1024',
    },
    {
      id: 'midjourney',
      name: 'Midjourney Niji',
      description: 'Specialized anime and manga style generation',
      bestFor: ['Anime characters', 'Manga style', 'Japanese art'],
      cost: '$0.05 per image',
      maxSize: '1024x1024',
    },
    {
      id: 'perplexity',
      name: 'Perplexity Research',
      description: 'Fetches real anime scene references with timestamps and screenshots',
      bestFor: ['Reference gathering', 'Scene analysis'],
      cost: 'API usage (varies)',
      maxSize: 'N/A',
    },
    {
      id: 'gemini',
      name: 'Google Gemini',
      description: 'Reliable fallback with good quality',
      bestFor: ['Fallback option', 'General designs'],
      cost: '$0.02 per image',
      maxSize: '1024x1024',
    },
  ];
};

/**
 * Estimate cost for image generation
 */
export const estimateCost = (provider: AIProvider, count: number = 1): number => {
  const costs = {
    openai: 0.04,
    midjourney: 0.05,
    grok: 0.04,
    gemini: 0.02,
  };
  
  return costs[provider] * count;
};
