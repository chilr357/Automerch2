import React from 'react';
import type { AIGenerationResult } from '../services/aiService';

interface AIProviderInfoProps {
  result: AIGenerationResult | null;
  detectedEngine: 'Standard' | 'Anime';
}

export const AIProviderInfo: React.FC<AIProviderInfoProps> = ({ result, detectedEngine }) => {
  if (!result) return null;

  const getProviderInfo = (provider: string) => {
    switch (provider) {
      case 'openai':
        return {
          name: 'OpenAI DALL-E 3',
          icon: '🎨',
          description: 'High-quality general purpose generation',
          color: 'text-green-400',
        };
      case 'midjourney':
        return {
          name: 'Midjourney Niji',
          icon: '🎌',
          description: 'Specialized anime & manga style',
          color: 'text-pink-400',
        };
      case 'gemini':
        return {
          name: 'Google Gemini',
          icon: '🤖',
          description: 'Reliable fallback provider',
          color: 'text-blue-400',
        };
      default:
        return {
          name: 'Unknown',
          icon: '❓',
          description: 'Unknown provider',
          color: 'text-gray-400',
        };
    }
  };

  const providerInfo = getProviderInfo(result.provider);

  return (
    <div className="bg-white/5 backdrop-blur-sm rounded-lg p-3 border border-white/10">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{providerInfo.icon}</span>
        <span className={`font-semibold ${providerInfo.color}`}>
          {providerInfo.name}
        </span>
        <span className="text-xs bg-white/10 px-2 py-1 rounded-full">
          {detectedEngine}
        </span>
      </div>
      <p className="text-sm text-white/70 mb-1">{providerInfo.description}</p>
      {result.cost && (
        <p className="text-xs text-white/50">
          Estimated cost: ${result.cost.toFixed(2)}
        </p>
      )}
    </div>
  );
};
