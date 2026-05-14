import React from 'react';
import type { AIProvider, AIGenerationResult } from '../services/aiService';
import { AIProviderInfo } from './AIProviderInfo';

type EngineType = 'Standard' | 'Anime';

export type ProviderOption = {
  id: 'auto' | AIProvider;
  name: string;
  description: string;
  icon: string;
  badge?: string;
  disabled?: boolean;
  disabledReason?: string;
  helperText?: string;
};

interface AIProviderSelectorProps {
  options: ProviderOption[];
  selected: 'auto' | AIProvider;
  onSelect: (provider: 'auto' | AIProvider) => void;
  isLoading: boolean;
  lastResult: AIGenerationResult | null;
  detectedEngine: EngineType;
}

export const AIProviderSelector: React.FC<AIProviderSelectorProps> = ({
  options,
  selected,
  onSelect,
  isLoading,
  lastResult,
  detectedEngine,
}) => {
  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 shadow-2xl">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">2. Choose Your AI Provider 🤖</h2>
        <span className="text-xs text-white/60">Pick before generating</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {options.map((option) => {
          const isSelected = selected === option.id;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onSelect(option.id)}
              disabled={isLoading || option.disabled}
              className={`text-left p-3 rounded-xl transition-all duration-200 border border-white/10 bg-white/10 hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400
                ${isSelected ? 'ring-2 ring-pink-400 bg-pink-600/30 border-pink-300/40' : ''}
                ${(isLoading || option.disabled) ? 'opacity-70 cursor-not-allowed hover:bg-white/10' : ''}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg" aria-hidden>{option.icon}</span>
                  <span className="font-semibold text-sm sm:text-base">{option.name}</span>
                </div>
                {option.badge && (
                  <span className="text-[10px] uppercase tracking-wide bg-white/20 px-2 py-1 rounded-full text-white/90">
                    {option.badge}
                  </span>
                )}
              </div>
              <p className="text-xs text-white/70 mt-2 leading-snug">{option.description}</p>
              {option.helperText && (
                <p className="text-[11px] text-white/60 mt-2">{option.helperText}</p>
              )}
              {option.disabled && option.disabledReason && (
                <p className="text-[11px] text-red-300 mt-2">{option.disabledReason}</p>
              )}
            </button>
          );
        })}
      </div>
      <div className="mt-4">
        {lastResult ? (
          <AIProviderInfo result={lastResult} detectedEngine={detectedEngine} />
        ) : (
          <div className="bg-white/5 border border-white/10 rounded-lg p-3 text-xs text-white/70">
            {selected === 'auto'
              ? 'Auto will pick the best provider for your prompt (anime prompts lean to Midjourney, others to OpenAI/Grok).'
              : 'We\'ll use your chosen provider for the next generation.'}
          </div>
        )}
      </div>
    </div>
  );
};
