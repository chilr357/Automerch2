import React, { useState, useCallback } from 'react';
import { INSPIRATION_PROMPTS } from '../constants';

interface PromptInputProps {
  prompt: string;
  setPrompt: (prompt: string) => void;
  onGenerate: () => void;
  isLoading: boolean;
  onImageUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  engine: 'Standard' | 'Anime';
}

export const PromptInput: React.FC<PromptInputProps> = ({ prompt, setPrompt, onGenerate, isLoading, onImageUpload, engine }) => {
  const [currentInspirations, setCurrentInspirations] = useState<string[]>([]);

  const getRandomInspirations = useCallback(() => {
    const shuffled = [...INSPIRATION_PROMPTS].sort(() => 0.5 - Math.random());
    setCurrentInspirations(shuffled.slice(0, 10));
  }, []);

  React.useEffect(() => {
    getRandomInspirations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 shadow-2xl">
      <label htmlFor="prompt" className="block text-lg font-semibold mb-2">
        1. Describe Your Design ✍️
      </label>
      <textarea
        id="prompt"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="e.g., A majestic lion wearing a crown, painted in watercolor style"
        className="w-full h-28 p-3 bg-white/10 rounded-lg focus:ring-2 focus:ring-pink-500 focus:outline-none transition resize-none"
        disabled={isLoading}
      />
      <div className="mt-2 text-right text-xs text-white/80">
        <p>
          <span className={`font-semibold transition-colors duration-300 ${engine === 'Anime' ? 'text-pink-400' : 'text-purple-400'}`}>
            {engine === 'Anime' ? '🌸 Anime Style Detected' : '🎨 Standard Engine'}
          </span>
        </p>
      </div>
      <div className="mt-4">
        <div className="flex items-center justify-between mb-2">
           <span className="text-sm font-medium text-white/80">Quick Inspiration:</span>
           <button onClick={getRandomInspirations} className="text-sm hover:text-pink-400 transition" disabled={isLoading}>
                🎲 Randomize
           </button>
        </div>
        <div className="flex flex-wrap gap-2">
            {currentInspirations.map((p, i) => (
                <button
                    key={i}
                    onClick={() => setPrompt(p)}
                    className="bg-white/10 hover:bg-white/20 text-xs px-3 py-1 rounded-full transition"
                    disabled={isLoading}
                >
                    {p}
                </button>
            ))}
        </div>
      </div>
      <div className="mt-6 flex flex-col gap-4">
        <button
            onClick={onGenerate}
            disabled={isLoading || !prompt}
            className="w-full bg-pink-600 hover:bg-pink-700 disabled:bg-pink-800 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 ease-in-out transform hover:scale-105 shadow-lg"
        >
            {isLoading ? 'Generating Magic...' : '✨ Generate Design'}
        </button>

        <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-white/20"></div>
            <span className="flex-shrink mx-4 text-white/60 text-sm">OR</span>
            <div className="flex-grow border-t border-white/20"></div>
        </div>

        <label htmlFor="imageUpload" className={`w-full text-center bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 ease-in-out transform hover:scale-105 shadow-lg ${isLoading ? 'cursor-not-allowed bg-gray-800 opacity-50' : 'cursor-pointer'}`}>
            📤 Upload Image
        </label>
        <input 
            type="file" 
            id="imageUpload" 
            accept="image/png, image/jpeg, image/webp" 
            className="hidden" 
            onChange={onImageUpload}
            disabled={isLoading}
        />
      </div>
    </div>
  );
};