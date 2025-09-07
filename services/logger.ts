let isDebug = (() => {
  try {
    return Boolean(import.meta.env.VITE_DEBUG) || Boolean((window as any).DEBUG);
  } catch {
    return false;
  }
})();

type Level = 'debug' | 'info' | 'warn' | 'error';

const log = (level: Level, ...args: any[]) => {
  if (!isDebug && level === 'debug') return;
  const ts = new Date().toISOString();
  // eslint-disable-next-line no-console
  console[level](`[${ts}] [${level.toUpperCase()}]`, ...args);
};

export const logger = {
  debug: (...args: any[]) => log('debug', ...args),
  info: (...args: any[]) => log('info', ...args),
  warn: (...args: any[]) => log('warn', ...args),
  error: (...args: any[]) => log('error', ...args),
  isDebug,
  setDebug: (v: boolean) => { isDebug = v; },
};


