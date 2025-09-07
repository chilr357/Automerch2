import React from 'react';

interface ActionButtonsProps {
    onDownload: () => void;
    onPublish: () => void;
    onCheckout: () => void;
}

export const ActionButtons: React.FC<ActionButtonsProps> = ({ onDownload, onPublish, onCheckout }) => {

  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 shadow-2xl flex flex-col sm:flex-row gap-4">
        <button
            onClick={onDownload}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 ease-in-out transform hover:scale-105"
        >
            📥 Download Design
        </button>
        <button
            onClick={onPublish}
            className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 ease-in-out transform hover:scale-105"
        >
            🏪 Publish to Etsy
        </button>
        <button
            onClick={onCheckout}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 ease-in-out transform hover:scale-105"
        >
            💳 Checkout
        </button>
    </div>
  );
};