import React from 'react';
import { logger } from '../services/logger';

interface LoaderProps {
  message: string;
}

export const Loader: React.FC<LoaderProps> = ({ message }) => {
  return (
    <div className="text-center">
      <div className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-pink-500 mx-auto"></div>
      <h3 className="text-2xl font-semibold mt-4 tracking-wider">Please Wait...</h3>
      <p className="text-white/80 mt-1">{message}</p>
      {logger.isDebug && <p className="text-xs opacity-60 mt-1">Verbose logging enabled</p>}
    </div>
  );
};