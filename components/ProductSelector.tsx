import React from 'react';
import type { Product } from '../types';

interface ProductSelectorProps {
  products: Product[];
  selectedProduct: Product;
  onSelectProduct: (product: Product) => void;
  onApply: () => void;
  applyDisabled: boolean;
}

const productEmojis: Record<Product['type'], string> = {
    'T-Shirt': '👕',
    'Hoodie': '🧥',
    'Mug': '☕',
    'Phone Case': '📱',
    'Tote Bag': '👜',
}

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
            <span className="text-3xl">{productEmojis[product.type]}</span>
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