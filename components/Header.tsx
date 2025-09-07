import React from 'react';
import { logger } from '../services/logger';

export const Header: React.FC = () => {
  const [verbose, setVerbose] = React.useState<boolean>(logger.isDebug);
  const toggle = () => { logger.setDebug(!verbose); setVerbose(!verbose); };
  return (
    <header className="text-center">
      <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight">
        🎨 AutoMerch
      </h1>
      <p className="mt-2 text-lg sm:text-xl text-white/80">
        Create & Sell Your AI-Powered Designs Instantly
      </p>
      <div className="mt-2 text-xs opacity-80 flex items-center justify-center gap-2">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={verbose} onChange={toggle} /> Verbose logs
        </label>
      </div>
    </header>
  );
};