import React from 'react';
import type { Product } from '../types';
import {
  IconShirt,
  IconHoodie,
  IconMug,
  IconPhoneCase,
  IconTote,
  IconPoster,
  IconCanvas,
  IconBlanket,
  IconPillow,
  IconSticker,
  IconJournal,
} from './icons';

interface ProductSelectorProps {
  products: Product[];
  selectedProduct: Product;
  onSelectProduct: (product: Product) => void;
  onApply: () => void;
  applyDisabled: boolean;
}

const IconByType: Record<Product['type'], React.FC<{ className?: string }>> = {
  'T-Shirt': IconShirt,
  'Hoodie': IconHoodie,
  'Mug': IconMug,
  'Phone Case': IconPhoneCase,
  'Tote Bag': IconTote,
  'Poster': IconPoster,
  'Canvas': IconCanvas,
  'Blanket': IconBlanket,
  'Pillow': IconPillow,
  'Sticker': IconSticker,
  'Journal': IconJournal,
};

const ColorByType: Record<Product['type'], { bg: string; text: string }> = {
  'T-Shirt': { bg: 'bg-sky-500/15', text: 'text-sky-400' },
  'Hoodie': { bg: 'bg-violet-500/15', text: 'text-violet-400' },
  'Mug': { bg: 'bg-amber-500/15', text: 'text-amber-400' },
  'Phone Case': { bg: 'bg-emerald-500/15', text: 'text-emerald-400' },
  'Tote Bag': { bg: 'bg-rose-500/15', text: 'text-rose-400' },
  'Poster': { bg: 'bg-indigo-500/15', text: 'text-indigo-400' },
  'Canvas': { bg: 'bg-cyan-500/15', text: 'text-cyan-400' },
  'Blanket': { bg: 'bg-pink-500/15', text: 'text-pink-400' },
  'Pillow': { bg: 'bg-sky-500/15', text: 'text-sky-400' },
  'Sticker': { bg: 'bg-lime-500/15', text: 'text-lime-400' },
  'Journal': { bg: 'bg-teal-500/15', text: 'text-teal-400' },
};

export const ProductSelector: React.FC<ProductSelectorProps> = ({ products, selectedProduct, onSelectProduct, onApply, applyDisabled }) => {
  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 shadow-2xl">
      <h2 className="text-lg font-semibold mb-4">2. Choose Your Merch 🛍️</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
        {products.map((product) => (
          <button
            key={product.id}
            onClick={() => onSelectProduct(product)}
            className={`flex flex-col items-center justify-center p-3 rounded-lg transition-all duration-200 aspect-square
              ${selectedProduct.id === product.id ? 'bg-pink-600 ring-2 ring-white' : 'bg-white/10 hover:bg-white/20'}`}
          >
            {(() => { 
              const Icon = IconByType[product.type]; 
              const colors = ColorByType[product.type];
              return (
                <div className={`rounded-md p-2 ${colors.bg}`}>
                  <Icon className={`w-7 h-7 ${colors.text}`} />
                </div>
              );
            })()}
            <span className="text-xs mt-2 font-medium text-center">{product.name}</span>
            <span className="text-xs text-white/70">${product.price}</span>
          </button>
        ))}
      </div>
      <div className="mt-6">
        <button
          onClick={onApply}
          disabled={applyDisabled}
          className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 ease-in-out transform hover:scale-105 shadow-lg"
        >
          🎨 Apply to Product
        </button>
      </div>
    </div>
  );
};