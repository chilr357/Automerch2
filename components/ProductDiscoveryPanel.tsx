import React from 'react';
import type { DiscoveredProduct } from '../types';

interface ProductDiscoveryPanelProps {
  items: DiscoveredProduct[];
  generatedAt?: string;
  onGenerate?: () => void;
  onSelect?: (item: DiscoveredProduct) => void;
  isLoading?: boolean;
}

export const ProductDiscoveryPanel: React.FC<ProductDiscoveryPanelProps> = ({
  items,
  generatedAt,
  onGenerate,
  onSelect,
  isLoading,
}) => {
  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 shadow-2xl space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">1. Discover Winning Products</h2>
          {generatedAt && (
            <p className="text-xs text-white/70">Last updated {new Date(generatedAt).toLocaleString()}</p>
          )}
        </div>
        {onGenerate && (
          <button
            onClick={onGenerate}
            disabled={isLoading}
            className={`px-4 py-2 rounded-lg font-semibold text-white transition ${isLoading ? 'bg-white/20 cursor-not-allowed' : 'bg-indigo-500 hover:bg-indigo-600'}`}
          >
            {isLoading ? 'Analyzing…' : 'Discover Top Products'}
          </button>
        )}
      </div>
      {items.length === 0 ? (
        <div className="text-sm text-white/70">No discovery results yet. Run the discovery scan to fetch top opportunities.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {items.map((item) => (
            <button
              key={`${item.blueprint.id}-${item.variant?.id || 'base'}`}
              type="button"
              onClick={() => onSelect?.(item)}
              className="bg-white/10 hover:bg-white/20 border border-white/10 rounded-xl p-4 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400"
            >
              <div className="flex items-center gap-3">
                {item.blueprint.defaultImage && (
                  <img src={item.blueprint.defaultImage} alt={item.blueprint.title} className="w-14 h-14 rounded-lg object-cover" />
                )}
                <div>
                  <p className="text-sm font-semibold text-white truncate">{item.blueprint.title}</p>
                  {item.variant?.title && (
                    <p className="text-xs text-white/70 truncate">{item.variant.title}</p>
                  )}
                  <p className="text-xs text-white/60">Score {item.score.score.toFixed(2)} · Demand {(item.score.demandIndex * 100).toFixed(0)}%</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};


